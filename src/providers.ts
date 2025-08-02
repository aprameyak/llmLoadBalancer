import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { LLMRequest, LLMResponse, ProviderConfig, LLMError } from './types';

export abstract class BaseProvider {
  protected client: AxiosInstance;
  
  constructor(protected config: ProviderConfig) {
    this.client = axios.create({
      timeout: config.timeout || 30000,
      baseURL: config.baseUrl,
    });
  }

  abstract makeRequest(request: LLMRequest): Promise<LLMResponse>;
  
  protected handleError(error: unknown): never {
    const errorObj = error as { response?: { status?: number; data?: { error?: { message?: string }; message?: string } }; message?: string };
    const statusCode = errorObj.response?.status;
    const message = errorObj.response?.data?.error?.message 
      || errorObj.response?.data?.message 
      || errorObj.message 
      || 'Unknown error';
    
    throw new LLMError(message, this.config.name, statusCode, error instanceof Error ? error : undefined);
  }
}

export class OpenAIProvider extends BaseProvider {
  async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response: AxiosResponse = await this.client.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.config.model,
          messages: [{ role: 'user', content: request.prompt }],
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          top_p: request.topP,
          stream: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const choice = response.data.choices[0];
      return {
        content: choice.message.content,
        usage: {
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        },
        model: this.config.model,
        provider: this.config.name,
        finishReason: choice.finish_reason,
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}

export class ClaudeProvider extends BaseProvider {
  async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response: AxiosResponse = await this.client.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: this.config.model,
          max_tokens: request.maxTokens || 1000,
          messages: [{ role: 'user', content: request.prompt }],
          temperature: request.temperature,
          top_p: request.topP,
        },
        {
          headers: {
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        content: response.data.content[0].text,
        usage: {
          promptTokens: response.data.usage.input_tokens,
          completionTokens: response.data.usage.output_tokens,
          totalTokens: response.data.usage.input_tokens + response.data.usage.output_tokens,
        },
        model: this.config.model,
        provider: this.config.name,
        finishReason: response.data.stop_reason,
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}

export class GeminiProvider extends BaseProvider {
  async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response: AxiosResponse = await this.client.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
        {
          contents: [{
            parts: [{ text: request.prompt }]
          }],
          generationConfig: {
            temperature: request.temperature,
            topP: request.topP,
            maxOutputTokens: request.maxTokens,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const candidate = response.data.candidates[0];
      return {
        content: candidate.content.parts[0].text,
        usage: {
          promptTokens: response.data.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.data.usageMetadata?.totalTokenCount || 0,
        },
        model: this.config.model,
        provider: this.config.name,
        finishReason: candidate.finishReason,
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}

export class CohereProvider extends BaseProvider {
  async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response: AxiosResponse = await this.client.post(
        'https://api.cohere.ai/v1/generate',
        {
          model: this.config.model,
          prompt: request.prompt,
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          p: request.topP,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const generation = response.data.generations[0];
      return {
        content: generation.text,
        usage: {
          promptTokens: response.data.meta?.billed_units?.input_tokens || 0,
          completionTokens: response.data.meta?.billed_units?.output_tokens || 0,
          totalTokens: (response.data.meta?.billed_units?.input_tokens || 0) + 
                      (response.data.meta?.billed_units?.output_tokens || 0),
        },
        model: this.config.model,
        provider: this.config.name,
        finishReason: generation.finish_reason,
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}

export class MistralProvider extends BaseProvider {
  async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response: AxiosResponse = await this.client.post(
        'https://api.mistral.ai/v1/chat/completions',
        {
          model: this.config.model,
          messages: [{ role: 'user', content: request.prompt }],
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          top_p: request.topP,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const choice = response.data.choices[0];
      return {
        content: choice.message.content,
        usage: {
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        },
        model: this.config.model,
        provider: this.config.name,
        finishReason: choice.finish_reason,
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}

export class PerplexityProvider extends BaseProvider {
  async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response: AxiosResponse = await this.client.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: this.config.model,
          messages: [{ role: 'user', content: request.prompt }],
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          top_p: request.topP,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const choice = response.data.choices[0];
      return {
        content: choice.message.content,
        usage: {
          promptTokens: response.data.usage?.prompt_tokens || 0,
          completionTokens: response.data.usage?.completion_tokens || 0,
          totalTokens: response.data.usage?.total_tokens || 0,
        },
        model: this.config.model,
        provider: this.config.name,
        finishReason: choice.finish_reason,
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}

export class OllamaProvider extends BaseProvider {
  async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response: AxiosResponse = await this.client.post(
        `${this.config.baseUrl || 'http://localhost:11434'}/api/generate`,
        {
          model: this.config.model,
          prompt: request.prompt,
          options: {
            num_predict: request.maxTokens,
            temperature: request.temperature,
            top_p: request.topP,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        content: response.data.response,
        usage: {
          promptTokens: response.data.prompt_eval_count || 0,
          completionTokens: response.data.eval_count || 0,
          totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0),
        },
        model: this.config.model,
        provider: this.config.name,
        finishReason: response.data.done ? 'stop' : 'length',
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}

export class TogetherProvider extends BaseProvider {
  async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response: AxiosResponse = await this.client.post(
        'https://api.together.xyz/v1/chat/completions',
        {
          model: this.config.model,
          messages: [{ role: 'user', content: request.prompt }],
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          top_p: request.topP,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const choice = response.data.choices[0];
      return {
        content: choice.message.content,
        usage: {
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        },
        model: this.config.model,
        provider: this.config.name,
        finishReason: choice.finish_reason,
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}

export class GroqProvider extends BaseProvider {
  async makeRequest(request: LLMRequest): Promise<LLMResponse> {
    try {
      const response: AxiosResponse = await this.client.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: this.config.model,
          messages: [{ role: 'user', content: request.prompt }],
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          top_p: request.topP,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const choice = response.data.choices[0];
      return {
        content: choice.message.content,
        usage: {
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        },
        model: this.config.model,
        provider: this.config.name,
        finishReason: choice.finish_reason,
      };
    } catch (error) {
      this.handleError(error);
    }
  }
}

export function createProvider(config: ProviderConfig): BaseProvider {
  switch (config.name.toLowerCase()) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'claude':
      return new ClaudeProvider(config);
    case 'gemini':
      return new GeminiProvider(config);
    case 'cohere':
      return new CohereProvider(config);
    case 'mistral':
      return new MistralProvider(config);
    case 'perplexity':
      return new PerplexityProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    case 'together':
      return new TogetherProvider(config);
    case 'groq':
      return new GroqProvider(config);
    default:
      throw new Error(`Unsupported provider: ${config.name}`);
  }
}
