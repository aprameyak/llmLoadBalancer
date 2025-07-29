export interface LLMRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
  finishReason?: string;
}

export interface ProviderConfig {
  name: 'openai' | 'claude' | 'gemini' | 'cohere' | 'mistral' | string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  weight?: number;
  timeout?: number;
  maxRetries?: number;
}

export interface LoadBalancerConfig {
  strategy: 'round-robin' | 'failover' | 'weighted' | 'custom';
  providers: ProviderConfig[];
  customStrategy?: (providers: ProviderConfig[]) => ProviderConfig;
  globalTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface ProviderStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime?: Date;
  isHealthy: boolean;
}

export interface LoadBalancerStats {
  [providerName: string]: ProviderStats;
}

export class LLMError extends Error {
  constructor(
    message: string,
    public provider: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export class LoadBalancerError extends Error {
  constructor(message: string, public errors: LLMError[] = []) {
    super(message);
    this.name = 'LoadBalancerError';
  }
}
