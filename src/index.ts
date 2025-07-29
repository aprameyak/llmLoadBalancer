import { LLMLoadBalancer } from './load-balancer';
import {
  LoadBalancerConfig,
  LLMRequest,
  LLMResponse,
  ProviderConfig,
  ProviderStats,
  LoadBalancerStats,
  LLMError,
  LoadBalancerError,
} from './types';

export function createLLMBalancer(config: LoadBalancerConfig): LLMLoadBalancer {
  return new LLMLoadBalancer(config);
}

// Export all types and classes for advanced usage
export {
  LLMLoadBalancer,
  LoadBalancerConfig,
  LLMRequest,
  LLMResponse,
  ProviderConfig,
  ProviderStats,
  LoadBalancerStats,
  LLMError,
  LoadBalancerError,
};

// Export provider classes for custom implementations
export {
  BaseProvider,
  OpenAIProvider,
  ClaudeProvider,
  GeminiProvider,
  CohereProvider,
  MistralProvider,
  createProvider,
} from './providers';

// Export strategy classes for custom implementations
export {
  LoadBalancingStrategy,
  RoundRobinStrategy,
  FailoverStrategy,
  WeightedStrategy,
  CustomStrategy,
  createStrategy,
} from './strategies';
