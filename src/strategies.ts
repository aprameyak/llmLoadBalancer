import { ProviderConfig, ProviderStats } from './types';

export interface LoadBalancingStrategy {
  selectProvider(providers: ProviderConfig[], stats: { [key: string]: ProviderStats }): ProviderConfig;
}

export class RoundRobinStrategy implements LoadBalancingStrategy {
  private currentIndex = 0;

  selectProvider(providers: ProviderConfig[], stats: { [key: string]: ProviderStats }): ProviderConfig {
    if (providers.length === 0) {
      throw new Error('No providers available');
    }

    const provider = providers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % providers.length;
    return provider;
  }
}

export class FailoverStrategy implements LoadBalancingStrategy {
  selectProvider(providers: ProviderConfig[], stats: { [key: string]: ProviderStats }): ProviderConfig {
    if (providers.length === 0) {
      throw new Error('No providers available');
    }

    // Find the first healthy provider
    for (const provider of providers) {
      const providerStats = stats[provider.name];
      if (!providerStats || providerStats.isHealthy) {
        return provider;
      }
    }

    // If no healthy providers, use the first one
    return providers[0];
  }
}

export class WeightedStrategy implements LoadBalancingStrategy {
  private cumulativeWeights: number[] = [];
  private totalWeight = 0;

  constructor(providers: ProviderConfig[]) {
    this.calculateWeights(providers);
  }

  private calculateWeights(providers: ProviderConfig[]) {
    this.cumulativeWeights = [];
    this.totalWeight = 0;

    for (const provider of providers) {
      const weight = provider.weight || 1;
      this.totalWeight += weight;
      this.cumulativeWeights.push(this.totalWeight);
    }
  }

  selectProvider(providers: ProviderConfig[], stats: { [key: string]: ProviderStats }): ProviderConfig {
    if (providers.length === 0) {
      throw new Error('No providers available');
    }

    // Recalculate weights if provider list changed
    if (this.cumulativeWeights.length !== providers.length) {
      this.calculateWeights(providers);
    }

    const random = Math.random() * this.totalWeight;
    
    for (let i = 0; i < this.cumulativeWeights.length; i++) {
      if (random <= this.cumulativeWeights[i]) {
        return providers[i];
      }
    }

    // Fallback to last provider
    return providers[providers.length - 1];
  }
}

export class CustomStrategy implements LoadBalancingStrategy {
  constructor(private strategyFunction: (providers: ProviderConfig[]) => ProviderConfig) {}

  selectProvider(providers: ProviderConfig[], stats: { [key: string]: ProviderStats }): ProviderConfig {
    return this.strategyFunction(providers);
  }
}

const strategyMap: Record<string, (providers: ProviderConfig[], customStrategy?: (providers: ProviderConfig[]) => ProviderConfig) => LoadBalancingStrategy> = {
  'round-robin': () => new RoundRobinStrategy(),
  'failover': () => new FailoverStrategy(),
  'weighted': (providers) => new WeightedStrategy(providers),
  'custom': (providers, customStrategy) => {
    if (!customStrategy) {
      throw new Error('Custom strategy function is required for custom strategy type');
    }
    return new CustomStrategy(customStrategy);
  },
};

export function createStrategy(
  strategyType: string,
  providers: ProviderConfig[],
  customStrategy?: (providers: ProviderConfig[]) => ProviderConfig
): LoadBalancingStrategy {
  const strategyFactory = strategyMap[strategyType];
  if (!strategyFactory) {
    throw new Error(`Unsupported strategy: ${strategyType}`);
  }
  return strategyFactory(providers, customStrategy);
}
