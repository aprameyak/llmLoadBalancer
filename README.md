# LLM Load Balancer

A TypeScript library for load balancing calls across multiple LLM APIs with support for various routing strategies.

## Features

- 🔄 **Multiple Load Balancing Strategies**: Round-robin, failover, weighted, and custom strategies
- 🚀 **Multi-Provider Support**: OpenAI, Claude, Gemini, Cohere, Mistral, and extensible for custom providers
- 📊 **Built-in Statistics**: Track performance, success rates, and health metrics
- 🛡️ **Error Handling & Retries**: Automatic retries with exponential backoff
- ⚡ **Health Checks**: Monitor provider health and automatic failover
- 🔧 **Dynamic Provider Management**: Add/remove providers at runtime
- 💪 **TypeScript Support**: Full type safety and IntelliSense support

## Installation

```bash
npm install @aprameyakannan/llm-load-balancer
```

## Quick Start

```typescript
import { createLLMBalancer } from '@aprameyakannan/llm-load-balancer';

const llm = createLLMBalancer({
  strategy: 'round-robin',
  providers: [
    { name: 'openai', apiKey: 'your-openai-key', model: 'gpt-3.5-turbo' },
    { name: 'claude', apiKey: 'your-claude-key', model: 'claude-3-haiku' },
    { name: 'gemini', apiKey: 'your-gemini-key', model: 'gemini-pro' },
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
    { name: 'openai', apiKey: '...', model: 'gpt-4', weight: 3 },
    { name: 'claude', apiKey: '...', model: 'claude-3-haiku', weight: 2 },
    { name: 'gemini', apiKey: '...', model: 'gemini-pro', weight: 1 },
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
  apiKey: 'your-cohere-key',
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

## Error Handling

The library provides comprehensive error handling with custom error types:

```typescript
import { LLMError, LoadBalancerError } from 'llm-load-balancer';

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
import { BaseProvider, LLMRequest, LLMResponse } from 'llm-load-balancer';

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

### Environment Variables
For production use, store API keys in environment variables:

```typescript
const llm = createLLMBalancer({
  strategy: 'round-robin',
  providers: [
    { name: 'openai', apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-3.5-turbo' },
    { name: 'claude', apiKey: process.env.CLAUDE_API_KEY!, model: 'claude-3-haiku' },
  ],
});
```

## Examples

See the `examples/` directory for complete working examples:
- Basic usage
- All strategies demonstration
- Error handling
- Health monitoring
- Custom providers

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📝 [Documentation](https://github.com/aprameyakannan/llmLoadBalancer#readme)
- 🐛 [Issue Tracker](https://github.com/aprameyakannan/llmLoadBalancer/issues)
- 💬 [Discussions](https://github.com/aprameyakannan/llmLoadBalancer/discussions)
