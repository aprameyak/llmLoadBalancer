import { singleModelRequest, createAutoBalancer } from '../src';

async function demonstrateDualAPI() {
  console.log('🚀 Demonstrating Dual API Usage\n');

  // API 1: Single Model Request
  console.log('1. Single Model Request:');
  try {
    const response = await singleModelRequest('openai', {
      prompt: 'Write a short poem about TypeScript.',
      maxTokens: 100,
      temperature: 0.7,
    });
    console.log(`✅ Response from ${response.provider}:`, response.content);
    console.log(`📊 Usage:`, response.usage);
  } catch (error) {
    console.log(`❌ Error:`, error.message);
  }

  // API 2: Load Balancing with Auto-Configuration
  console.log('\n2. Load Balancing with Auto-Configuration:');
  try {
    const llm = createAutoBalancer('round-robin');
    
    console.log('Making multiple requests...');
    for (let i = 0; i < 3; i++) {
      const response = await llm.request({
        prompt: `Request ${i + 1}: Explain what a load balancer does.`,
        maxTokens: 50,
      });
      console.log(`   Request ${i + 1} -> ${response.provider}: ${response.content.substring(0, 50)}...`);
    }

    console.log('\n📈 Load Balancer Statistics:');
    const stats = llm.getStats();
    Object.entries(stats).forEach(([provider, stat]) => {
      console.log(`   ${provider}: ${stat.totalRequests} requests, ${stat.successfulRequests} successful`);
    });
  } catch (error) {
    console.log(`❌ Error:`, error.message);
  }

  // API 2: Load Balancing with Custom Strategy
  console.log('\n3. Load Balancing with Custom Strategy:');
  try {
    const customStrategy = (providers: any[]) => {
      // Prefer faster providers (Groq, Perplexity) over others
      const fastProviders = providers.filter(p => ['groq', 'perplexity'].includes(p.name));
      return fastProviders.length > 0 ? fastProviders[0] : providers[0];
    };

    const llm = createAutoBalancer('custom', customStrategy);
    
    const response = await llm.request({
      prompt: 'What is the fastest way to learn programming?',
      maxTokens: 100,
    });
    console.log(`✅ Response from ${response.provider}:`, response.content.substring(0, 100));
  } catch (error) {
    console.log(`❌ Error:`, error.message);
  }
}

// Environment variables needed for this example:
// OPENAI_API_KEY=sk-...
// CLAUDE_API_KEY=sk-ant-...
// GEMINI_API_KEY=AIza...
// PERPLEXITY_API_KEY=pplx-...
// GROQ_API_KEY=gsk_...
// OLLAMA_MODEL=llama2 (optional, for local Ollama)

if (require.main === module) {
  demonstrateDualAPI().catch(console.error);
} 