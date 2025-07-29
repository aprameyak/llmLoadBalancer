import { createLLMBalancer, LLMLoadBalancer, ProviderConfig, LLMError } from '../src';

// Mock axios to avoid making real API calls in tests
const mockPost = jest.fn();
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: mockPost,
  })),
}));

describe('LLMLoadBalancer', () => {
  const mockProviders: ProviderConfig[] = [
    { name: 'openai', apiKey: 'test-key-1', model: 'gpt-3.5-turbo' },
    { name: 'claude', apiKey: 'test-key-2', model: 'claude-3-haiku' },
    { name: 'gemini', apiKey: 'test-key-3', model: 'gemini-pro' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockClear();
  });

  describe('createLLMBalancer', () => {
    it('should create a load balancer instance', () => {
      const balancer = createLLMBalancer({
        strategy: 'round-robin',
        providers: mockProviders,
      });
      
      expect(balancer).toBeInstanceOf(LLMLoadBalancer);
    });
  });

  describe('Round Robin Strategy', () => {
    it('should rotate between providers', async () => {
      const balancer = createLLMBalancer({
        strategy: 'round-robin',
        providers: mockProviders,
      });

      // Mock successful responses
      const axios = require('axios');
      const mockPost = axios.create().post;
      
      mockPost
        .mockResolvedValueOnce({
          data: {
            choices: [{ message: { content: 'Response 1' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          },
        })
        .mockResolvedValueOnce({
          data: {
            content: [{ text: 'Response 2' }],
            usage: { input_tokens: 10, output_tokens: 5 },
            stop_reason: 'end_turn',
          },
        })
        .mockResolvedValueOnce({
          data: {
            candidates: [{
              content: { parts: [{ text: 'Response 3' }] },
              finishReason: 'STOP',
            }],
            usageMetadata: {
              promptTokenCount: 10,
              candidatesTokenCount: 5,
              totalTokenCount: 15,
            },
          },
        });

      const request = { prompt: 'Test prompt' };
      
      const response1 = await balancer.request(request);
      const response2 = await balancer.request(request);
      const response3 = await balancer.request(request);

      expect(response1.provider).toBe('openai');
      expect(response2.provider).toBe('claude');
      expect(response3.provider).toBe('gemini');
    });
  });

  describe('Failover Strategy', () => {
    it('should use first healthy provider', async () => {
      const balancer = createLLMBalancer({
        strategy: 'failover',
        providers: mockProviders,
      });

      const axios = require('axios');
      const mockPost = axios.create().post;
      
      mockPost.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        },
      });

      const response = await balancer.request({ prompt: 'Test prompt' });
      expect(response.provider).toBe('openai');
    });
  });



  describe('Custom Strategy', () => {
    it('should use custom strategy function', async () => {
      const customStrategy = (providers: ProviderConfig[]) => providers[1]; // Always select second provider
      
      const balancer = createLLMBalancer({
        strategy: 'custom',
        providers: mockProviders,
        customStrategy,
      });

      const axios = require('axios');
      const mockPost = axios.create().post;
      
      mockPost.mockResolvedValue({
        data: {
          content: [{ text: 'Response' }],
          usage: { input_tokens: 10, output_tokens: 5 },
          stop_reason: 'end_turn',
        },
      });

      const response = await balancer.request({ prompt: 'Test prompt' });
      expect(response.provider).toBe('claude');
    });
  });

  describe('Error Handling', () => {
    it('should retry on failure', async () => {
      const balancer = createLLMBalancer({
        strategy: 'round-robin',
        providers: [mockProviders[0]],
        maxRetries: 2,
        retryDelay: 10,
      });

      const axios = require('axios');
      const mockPost = axios.create().post;
      
      mockPost
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          data: {
            choices: [{ message: { content: 'Success' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          },
        });

      const response = await balancer.request({ prompt: 'Test prompt' });
      expect(response.content).toBe('Success');
      expect(mockPost).toHaveBeenCalledTimes(2);
    });

    it('should throw LoadBalancerError when all providers fail', async () => {
      const balancer = createLLMBalancer({
        strategy: 'round-robin',
        providers: [mockProviders[0]],
        maxRetries: 2,
        retryDelay: 10,
      });

      const axios = require('axios');
      const mockPost = axios.create().post;
      
      mockPost.mockRejectedValue(new Error('API Error'));

      await expect(balancer.request({ prompt: 'Test prompt' })).rejects.toThrow('All providers failed');
    });
  });

  describe('Stats and Health', () => {
    it('should track provider statistics', async () => {
      const balancer = createLLMBalancer({
        strategy: 'round-robin',
        providers: [mockProviders[0]],
      });

      const axios = require('axios');
      const mockPost = axios.create().post;
      
      mockPost.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        },
      });

      await balancer.request({ prompt: 'Test prompt' });
      
      const stats = balancer.getStats();
      expect(stats.openai.totalRequests).toBe(1);
      expect(stats.openai.successfulRequests).toBe(1);
      expect(stats.openai.isHealthy).toBe(true);
    });

    it('should identify healthy providers', () => {
      const balancer = createLLMBalancer({
        strategy: 'failover',
        providers: mockProviders,
      });

      const healthyProviders = balancer.getHealthyProviders();
      expect(healthyProviders).toHaveLength(3);
    });
  });

  describe('Provider Management', () => {
    it('should add new providers', () => {
      const balancer = createLLMBalancer({
        strategy: 'round-robin',
        providers: [mockProviders[0]],
      });

      balancer.addProvider({ name: 'cohere', apiKey: 'test-key', model: 'command' });
      
      const stats = balancer.getStats();
      expect(stats.cohere).toBeDefined();
    });

    it('should remove providers', () => {
      const balancer = createLLMBalancer({
        strategy: 'round-robin',
        providers: mockProviders,
      });

      balancer.removeProvider('claude');
      
      const stats = balancer.getStats();
      expect(stats.claude).toBeUndefined();
    });
  });
});
