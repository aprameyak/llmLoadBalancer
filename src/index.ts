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

// Single model API - direct provider call
export async function singleModelRequest(
  provider: 'openai' | 'claude' | 'gemini' | 'cohere' | 'mistral' | 'perplexity' | 'ollama' | 'together' | 'groq',
  request: LLMRequest,
  model?: string
): Promise<LLMResponse> {
  const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];
  if (!apiKey) {
    throw new Error(`Missing ${provider.toUpperCase()}_API_KEY environment variable`);
  }

  const config: ProviderConfig = {
    name: provider,
    apiKey,
    model: model || getDefaultModel(provider),
  };

  const llm = createLLMBalancer({
    strategy: 'failover', // Single provider, so failover doesn't matter
    providers: [config],
  });

  return await llm.request(request);
}

// Load balancing API with strategy
export function createLLMBalancer(config: LoadBalancerConfig): LLMLoadBalancer {
  return new LLMLoadBalancer(config);
}

// Auto-configure from environment variables
export function createAutoBalancer(
  strategy: 'round-robin' | 'failover' | 'weighted' | 'custom' = 'round-robin',
  customStrategy?: (providers: ProviderConfig[]) => ProviderConfig
): LLMLoadBalancer {
  const providers: ProviderConfig[] = [];
  
  const providerConfigs = [
    { name: 'openai', envKey: 'OPENAI_API_KEY', defaultModel: 'gpt-3.5-turbo' },
    { name: 'claude', envKey: 'CLAUDE_API_KEY', defaultModel: 'claude-3-haiku' },
    { name: 'gemini', envKey: 'GEMINI_API_KEY', defaultModel: 'gemini-pro' },
    { name: 'cohere', envKey: 'COHERE_API_KEY', defaultModel: 'command' },
    { name: 'mistral', envKey: 'MISTRAL_API_KEY', defaultModel: 'mistral-small' },
    { name: 'perplexity', envKey: 'PERPLEXITY_API_KEY', defaultModel: 'pplx-7b-online' },
    { name: 'groq', envKey: 'GROQ_API_KEY', defaultModel: 'llama2-70b-4096' },
    { name: 'together', envKey: 'TOGETHER_API_KEY', defaultModel: 'llama-2-70b' },
  ];

  // Add providers with API keys
  for (const config of providerConfigs) {
    const apiKey = process.env[config.envKey];
    if (apiKey) {
      providers.push({ name: config.name as keyof typeof defaultModels, apiKey, model: config.defaultModel });
    }
  }

  // Add Ollama if configured
  if (process.env.OLLAMA_MODEL) {
    providers.push({
      name: 'ollama',
      apiKey: '',
      model: process.env.OLLAMA_MODEL,
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    });
  }

  if (providers.length === 0) {
    throw new Error('No provider API keys found in environment variables');
  }

  return createLLMBalancer({ strategy, providers, customStrategy });
}

const defaultModels: Record<string, string> = {
  openai: 'gpt-3.5-turbo',
  claude: 'claude-3-haiku',
  gemini: 'gemini-pro',
  cohere: 'command',
  mistral: 'mistral-small',
  perplexity: 'pplx-7b-online',
  groq: 'llama2-70b-4096',
  together: 'llama-2-70b',
  ollama: 'llama2',
};

function getDefaultModel(provider: string): string {
  return defaultModels[provider] || 'gpt-3.5-turbo';
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
  PerplexityProvider,
  OllamaProvider,
  TogetherProvider,
  GroqProvider,
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
