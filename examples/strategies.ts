import { createLLMBalancer, ProviderConfig } from '../src';

const providers: ProviderConfig[] = [
  { name: 'openai', apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-3.5-turbo', weight: 3 },
  { name: 'claude', apiKey: process.env.CLAUDE_API_KEY!, model: 'claude-3-haiku', weight: 2 },
  { name: 'gemini', apiKey: process.env.GEMINI_API_KEY!, model: 'gemini-pro', weight: 1 },
  { name: 'perplexity', apiKey: process.env.PERPLEXITY_API_KEY!, model: 'pplx-7b-online', weight: 2 },
  { name: 'groq', apiKey: process.env.GROQ_API_KEY!, model: 'llama2-70b-4096', weight: 1 },
];

async function demonstrateStrategies() {
  console.log('🔄 Demonstrating Load Balancing Strategies\n');

  // 1. Round Robin Strategy
  console.log('1. Round Robin Strategy:');
  const roundRobinBalancer = createLLMBalancer({
    strategy: 'round-robin',
    providers,
  });

  for (let i = 0; i < 3; i++) {
    try {
      const response = await roundRobinBalancer.request({
        prompt: `Request ${i + 1}: What is AI?`,
        maxTokens: 50,
      });
      console.log(`   Request ${i + 1} -> ${response.provider}`);
    } catch (error) {
      console.log(`   Request ${i + 1} -> Error`);
    }
  }

  // 2. Failover Strategy
  console.log('\n2. Failover Strategy:');
  const failoverBalancer = createLLMBalancer({
    strategy: 'failover',
    providers,
  });

  for (let i = 0; i < 3; i++) {
    try {
      const response = await failoverBalancer.request({
        prompt: `Request ${i + 1}: What is machine learning?`,
        maxTokens: 50,
      });
      console.log(`   Request ${i + 1} -> ${response.provider} (first healthy)`);
    } catch (error) {
      console.log(`   Request ${i + 1} -> Error`);
    }
  }

  // 3. Weighted Strategy
  console.log('\n3. Weighted Strategy:');
  console.log('   Weights: OpenAI=3, Claude=2, Gemini=1');
  const weightedBalancer = createLLMBalancer({
    strategy: 'weighted',
    providers,
  });

  const weightedResults: { [key: string]: number } = {};
  for (let i = 0; i < 12; i++) {
    try {
      const response = await weightedBalancer.request({
        prompt: `Request ${i + 1}: Explain neural networks`,
        maxTokens: 30,
      });
      weightedResults[response.provider] = (weightedResults[response.provider] || 0) + 1;
    } catch (error) {
      // Skip errors for demo
    }
  }
  
  console.log('   Distribution after 12 requests:');
  Object.entries(weightedResults).forEach(([provider, count]) => {
    console.log(`     ${provider}: ${count} requests`);
  });

  // 4. Custom Strategy
  console.log('\n4. Custom Strategy:');
  const customStrategy = (providers: ProviderConfig[]) => {
    // Prefer Claude, fallback to others
    return providers.find(p => p.name === 'claude') || providers[0];
  };

  const customBalancer = createLLMBalancer({
    strategy: 'custom',
    providers,
    customStrategy,
  });

  for (let i = 0; i < 3; i++) {
    try {
      const response = await customBalancer.request({
        prompt: `Request ${i + 1}: What is deep learning?`,
        maxTokens: 50,
      });
      console.log(`   Request ${i + 1} -> ${response.provider} (custom: prefer Claude)`);
    } catch (error) {
      console.log(`   Request ${i + 1} -> Error`);
    }
  }

  console.log('\n✅ Strategy demonstration complete!');
}

async function demonstrateHealthChecks() {
  console.log('\n🏥 Health Check Demonstration\n');

  const balancer = createLLMBalancer({
    strategy: 'failover',
    providers,
  });

  console.log('Performing health checks...');
  const healthStatus = await balancer.healthCheck();
  
  console.log('Health status:');
  Object.entries(healthStatus).forEach(([provider, isHealthy]) => {
    console.log(`   ${provider}: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
  });

  const healthyProviders = balancer.getHealthyProviders();
  console.log(`\nHealthy providers: ${healthyProviders.map(p => p.name).join(', ')}`);
}

if (require.main === module) {
  demonstrateStrategies()
    .then(() => demonstrateHealthChecks())
    .catch(console.error);
}
