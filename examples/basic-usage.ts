import { createLLMBalancer } from '../src';

async function basicExample() {
  const llm = createLLMBalancer({
    strategy: 'round-robin',
    providers: [
      { name: 'openai', apiKey: process.env.OPENAI_API_KEY || 'your-key-here', model: 'gpt-3.5-turbo' },
      { name: 'claude', apiKey: process.env.CLAUDE_API_KEY || 'your-key-here', model: 'claude-3-haiku' },
      { name: 'gemini', apiKey: process.env.GEMINI_API_KEY || 'your-key-here', model: 'gemini-pro' },
    ],
  });

  try {
    console.log('Making first request...');
    const response1 = await llm.request({
      prompt: 'Write a short poem about TypeScript.',
      maxTokens: 100,
      temperature: 0.7,
    });
    console.log(`Response from ${response1.provider}:`, response1.content);
    console.log('Usage:', response1.usage);

    console.log('\nMaking second request...');
    const response2 = await llm.request({
      prompt: 'Explain what a load balancer does in simple terms.',
      maxTokens: 150,
    });
    console.log(`Response from ${response2.provider}:`, response2.content);

    console.log('\nLoad balancer statistics:');
    const stats = llm.getStats();
    Object.entries(stats).forEach(([provider, stat]) => {
      console.log(`${provider}:`, {
        totalRequests: stat.totalRequests,
        successRate: `${Math.round((stat.successfulRequests / stat.totalRequests) * 100)}%`,
        avgResponseTime: `${Math.round(stat.averageResponseTime)}ms`,
        isHealthy: stat.isHealthy,
      });
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  basicExample();
}
