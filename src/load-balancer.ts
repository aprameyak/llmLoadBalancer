import {
  LoadBalancerConfig,
  LLMRequest,
  LLMResponse,
  ProviderConfig,
  LoadBalancerStats,
  LLMError,
  LoadBalancerError,
} from './types';
import { BaseProvider, createProvider } from './providers';
import { LoadBalancingStrategy, createStrategy } from './strategies';

export class LLMLoadBalancer {
  private providers: Map<string, BaseProvider> = new Map();
  private strategy: LoadBalancingStrategy;
  private stats: LoadBalancerStats = {};
  private config: LoadBalancerConfig;

  constructor(config: LoadBalancerConfig) {
    this.config = config;
    this.initializeProviders();
    this.strategy = createStrategy(
      config.strategy,
      config.providers,
      config.customStrategy
    );
  }

  private initializeProviders() {
    for (const providerConfig of this.config.providers) {
      const provider = createProvider(providerConfig);
      this.providers.set(providerConfig.name, provider);
      
      // Initialize stats
      this.stats[providerConfig.name] = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        isHealthy: true,
      };
    }
  }

  async request(request: LLMRequest): Promise<LLMResponse> {
    const errors: LLMError[] = [];
    const maxRetries = this.config.maxRetries || 3;
    const retryDelay = this.config.retryDelay || 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const selectedProvider = this.strategy.selectProvider(
          this.config.providers,
          this.stats
        );
        
        const provider = this.providers.get(selectedProvider.name);
        if (!provider) {
          throw new Error(`Provider ${selectedProvider.name} not found`);
        }

        const startTime = Date.now();
        const response = await this.makeRequestWithTimeout(provider, request, selectedProvider);
        const endTime = Date.now();

        // Update stats on success
        this.updateStats(selectedProvider.name, true, endTime - startTime);
        
        return response;
      } catch (error) {
        const llmError = error instanceof LLMError ? error : new LLMError(
          error instanceof Error ? error.message : 'Unknown error',
          'unknown'
        );
        
        errors.push(llmError);
        
        // Update stats on failure
        if (llmError.provider !== 'unknown') {
          this.updateStats(llmError.provider, false, 0);
        }

        // If this is the last attempt, don't wait
        if (attempt < maxRetries - 1) {
          await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    throw new LoadBalancerError(
      `All providers failed after ${maxRetries} attempts`,
      errors
    );
  }

  private async makeRequestWithTimeout(
    provider: BaseProvider,
    request: LLMRequest,
    config: ProviderConfig
  ): Promise<LLMResponse> {
    const timeout = config.timeout || this.config.globalTimeout || 30000;
    
    return Promise.race([
      provider.makeRequest(request),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new LLMError(`Request timeout after ${timeout}ms`, config.name));
        }, timeout);
      }),
    ]);
  }

  private updateStats(providerName: string, success: boolean, responseTime: number) {
    const stats = this.stats[providerName];
    if (!stats) return;

    stats.totalRequests++;
    stats.lastRequestTime = new Date();

    if (success) {
      stats.successfulRequests++;
      // Update average response time using incremental mean
      const totalSuccessful = stats.successfulRequests;
      stats.averageResponseTime = 
        (stats.averageResponseTime * (totalSuccessful - 1) + responseTime) / totalSuccessful;
    } else {
      stats.failedRequests++;
    }

    // Update health status based on recent performance
    const recentSuccessRate = stats.successfulRequests / stats.totalRequests;
    stats.isHealthy = recentSuccessRate > 0.5; // Consider healthy if >50% success rate
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public getStats(): LoadBalancerStats {
    return { ...this.stats };
  }

  public getHealthyProviders(): ProviderConfig[] {
    return this.config.providers.filter(
      (provider) => this.stats[provider.name]?.isHealthy !== false
    );
  }

  public async healthCheck(): Promise<{ [providerName: string]: boolean }> {
    const healthStatus: { [providerName: string]: boolean } = {};
    
    const healthCheckPromises = this.config.providers.map(async (providerConfig) => {
      try {
        const provider = this.providers.get(providerConfig.name);
        if (!provider) {
          healthStatus[providerConfig.name] = false;
          return;
        }

        // Simple health check with a basic request
        await this.makeRequestWithTimeout(
          provider,
          { prompt: 'Health check', maxTokens: 1 },
          { ...providerConfig, timeout: 5000 }
        );
        
        healthStatus[providerConfig.name] = true;
        this.stats[providerConfig.name].isHealthy = true;
      } catch (error) {
        healthStatus[providerConfig.name] = false;
        this.stats[providerConfig.name].isHealthy = false;
      }
    });

    await Promise.allSettled(healthCheckPromises);
    return healthStatus;
  }

  public addProvider(config: ProviderConfig): void {
    const provider = createProvider(config);
    this.providers.set(config.name, provider);
    this.config.providers.push(config);
    
    this.stats[config.name] = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      isHealthy: true,
    };

    // Recreate strategy if needed
    this.strategy = createStrategy(
      this.config.strategy,
      this.config.providers,
      this.config.customStrategy
    );
  }

  public removeProvider(providerName: string): void {
    this.providers.delete(providerName);
    this.config.providers = this.config.providers.filter(
      (p) => p.name !== providerName
    );
    delete this.stats[providerName];

    // Recreate strategy
    this.strategy = createStrategy(
      this.config.strategy,
      this.config.providers,
      this.config.customStrategy
    );
  }
}
