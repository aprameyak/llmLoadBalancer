# LLM Load Balancer

A TypeScript library for load balancing calls across multiple LLM APIs with support for various routing strategies.

## Features

- **Multiple Load Balancing Strategies**: Round-robin, failover, weighted, and custom strategies
- **Multi-Provider Support**: OpenAI, Claude, Gemini, Cohere, Mistral, Perplexity, Ollama, Together, Groq, and extensible for custom providers
- **Built-in Statistics**: Track performance, success rates, and health metrics
- **Error Handling & Retries**: Automatic retries with exponential backoff
- **Health Checks**: Monitor provider health and automatic failover
- **Dynamic Provider Management**: Add/remove providers at runtime
- **TypeScript Support**: Full type safety and IntelliSense support

## Installation

```bash
npm install @aprameyakannan/llm-load-balancer
```

## Quick Start

### API 1: Single Model Request

```typescript
import { singleModelRequest } from '@aprameyak/llm-load-balancer';

// Simple single provider call
const response = await singleModelRequest('openai', {
  prompt: 'Write a funny dad joke.',
  maxTokens: 100,
});

console.log(response.content);
```

### API 2: Load Balancing with Auto-Configuration

```typescript
import { createAutoBalancer } from '@aprameyak/llm-load-balancer';

// Auto-configure from environment variables
const llm = createAutoBalancer('round-robin');

const response = await llm.request({
  prompt: 'Write a funny dad joke.',
});

console.log(response.content);
```

### API 3: Manual Configuration

```typescript
import { createLLMBalancer } from '@aprameyak/llm-load-balancer';

const llm = createLLMBalancer({
  strategy: 'round-robin',
  providers: [
    { name: 'openai', apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-3.5-turbo' },
    { name: 'claude', apiKey: process.env.CLAUDE_API_KEY!, model: 'claude-3-haiku' },
    { name: 'gemini', apiKey: process.env.GEMINI_API_KEY!, model: 'gemini-pro' },
  ],
});

const response = await llm.request({
  prompt: 'Write a funny dad joke.',
});

console.log(response.content);
```

## Load Balancing Strategies

### Round Robin

Distributes requests evenly across all providers in sequence.

```typescript
const llm = createLLMBalancer({
  strategy: 'round-robin',
  providers: [/* ... */],
});
```

### Failover

Uses the first healthy provider, falling back to others if needed.

```typescript
const llm = createLLMBalancer({
  strategy: 'failover',
  providers: [/* ... */],
});
```

### Weighted

Distributes requests based on provider weights.

```typescript
const llm = createLLMBalancer({
  strategy: 'weighted',
  providers: [
    { name: 'openai', apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4', weight: 3 },
    { name: 'claude', apiKey: process.env.CLAUDE_API_KEY!, model: 'claude-3-haiku', weight: 2 },
    { name: 'gemini', apiKey: process.env.GEMINI_API_KEY!, model: 'gemini-pro', weight: 1 },
  ],
});
```

### Custom Strategy

Use your own load balancing logic.

```typescript
const customStrategy = (providers) => {
  // Your custom logic here
  return providers.find(p => p.name === 'preferred') || providers[0];
};

const llm = createLLMBalancer({
  strategy: 'custom',
  providers: [/* ... */],
  customStrategy,
});
```

## Configuration Options

```typescript
interface LoadBalancerConfig {
  strategy: 'round-robin' | 'failover' | 'weighted' | 'custom';
  providers: ProviderConfig[];
  customStrategy?: (providers: ProviderConfig[]) => ProviderConfig;
  globalTimeout?: number;        // Global timeout in ms (default: 30000)
  maxRetries?: number;          // Max retry attempts (default: 3)
  retryDelay?: number;          // Base retry delay in ms (default: 1000)
}

interface ProviderConfig {
  name: string;                 // Provider identifier
  apiKey: string;              // API key
  model: string;               // Model name
  baseUrl?: string;            // Custom API base URL
  weight?: number;             // Weight for weighted strategy (default: 1)
  timeout?: number;            // Provider-specific timeout
  maxRetries?: number;         // Provider-specific max retries
}
```

## Request Options

```typescript
interface LLMRequest {
  prompt: string;              // The text prompt
  maxTokens?: number;          // Maximum tokens to generate
  temperature?: number;        // Creativity/randomness (0-1)
  topP?: number;              // Nucleus sampling parameter
  stream?: boolean;           // Whether to stream the response
}
```

## Monitoring and Statistics

### Get Statistics
```typescript
const stats = llm.getStats();
console.log(stats);
// {
//   openai: {
//     totalRequests: 10,
//     successfulRequests: 8,
//     failedRequests: 2,
//     averageResponseTime: 1500,
//     isHealthy: true,
//     lastRequestTime: Date
//   }
// }
```

### Health Checks
```typescript
const healthStatus = await llm.healthCheck();
console.log(healthStatus);
// { openai: true, claude: false, gemini: true }
```

### Get Healthy Providers
```typescript
const healthyProviders = llm.getHealthyProviders();
```

## Dynamic Provider Management

### Add Provider
```typescript
llm.addProvider({
  name: 'cohere',
  apiKey: process.env.COHERE_API_KEY!,
  model: 'command',
  weight: 2
});
```

### Remove Provider
```typescript
llm.removeProvider('claude');
```

## Supported Providers

| Provider | Models | Notes |
|----------|--------|-------|
| OpenAI | gpt-3.5-turbo, gpt-4, etc. | Chat completions API |
| Claude | claude-3-haiku, claude-3-sonnet, etc. | Anthropic API |
| Gemini | gemini-pro, gemini-pro-vision | Google AI API |
| Cohere | command, command-light | Generate API |
| Mistral | mistral-tiny, mistral-small, etc. | Chat completions API |
| Perplexity | pplx-7b-online, pplx-70b-online, etc. | Real-time search API |
| Ollama | llama2, codellama, mistral, etc. | Local/self-hosted models |
| Together | llama-2-70b, codellama-34b, etc. | Open source model hosting |
| Groq | llama2-70b-4096, mixtral-8x7b-32768, etc. | Ultra-fast inference |

## Error Handling

The library provides comprehensive error handling with custom error types:

```typescript
import { LLMError, LoadBalancerError } from '@aprameyak/llm-load-balancer';

try {
  const response = await llm.request({ prompt: 'Hello' });
} catch (error) {
  if (error instanceof LoadBalancerError) {
    console.log('All providers failed:', error.errors);
  } else if (error instanceof LLMError) {
    console.log(`Provider ${error.provider} failed:`, error.message);
  }
}
```

## Advanced Usage

### Custom Provider Implementation
```typescript
import { BaseProvider, LLMRequest, LLMResponse } from '@aprameyak/llm-load-balancer';

class CustomProvider extends BaseProvider {
  async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    // Your custom implementation
    return {
      content: 'Custom response',
      model: this.config.model,
      provider: this.config.name,
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
    };
  }
}
```

## Environment Variables

The package automatically reads from environment variables. Set up your API keys:

```bash
# Required for single model requests
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
PERPLEXITY_API_KEY=pplx-...
GROQ_API_KEY=gsk_...
COHERE_API_KEY=...
MISTRAL_API_KEY=...
TOGETHER_API_KEY=...

# Optional for local Ollama
OLLAMA_MODEL=llama2
OLLAMA_BASE_URL=http://localhost:11434
```

### Auto-Configuration
The `createAutoBalancer()` function automatically detects available API keys and creates providers:

```typescript
// Will use all available API keys from environment
const llm = createAutoBalancer('round-robin');

// Custom strategy with auto-configuration
const llm = createAutoBalancer('custom', (providers) => {
  // Prefer faster providers
  return providers.find(p => p.name === 'groq') || providers[0];
});
```

## Examples

See the `examples/` directory for complete working examples:
- Basic usage
- All strategies demonstration
- Error handling
- Health monitoring
- Custom providers
