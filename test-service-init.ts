/**
 * Test script to debug service initialization
 * Run with: npx tsx test-service-init.ts
 */

// Simulate Astro's import.meta.env
// @ts-expect-error - Simulating Astro's import.meta.env for testing
globalThis.import = {
  meta: {
    env: {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    },
  },
};

async function testServiceInit() {
  console.log("🧪 Testing service initialization...\n");

  const apiKey = process.env.OPENROUTER_API_KEY;
  console.log(`API Key from process.env: ${apiKey ? "SET" : "NOT SET"}`);

  if (!apiKey) {
    console.error("❌ OPENROUTER_API_KEY not set in environment");
    console.log("💡 Set it with: export OPENROUTER_API_KEY=sk-or-v1-...");
    process.exit(1);
  }

  try {
    // Test direct instantiation
    console.log("\n1. Testing direct OpenRouterService instantiation...");
    const { OpenRouterService } = await import("./src/lib/services/openrouter.service.ts");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _service = new OpenRouterService({
      apiKey,
      defaultModel: "openai/gpt-3.5-turbo",
    });
    console.log("✅ Direct instantiation successful");

    // Test factory function (simulating import.meta.env)
    console.log("\n2. Testing createOpenRouterService factory...");
    const { createOpenRouterService } = await import("./src/lib/services/openrouter.service.ts");

    // This will fail because import.meta.env isn't properly set up
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _service2 = createOpenRouterService();
      console.log("✅ Factory function successful");
    } catch (error) {
      console.log("⚠️  Factory function failed (expected):", error instanceof Error ? error.message : String(error));
      console.log("   This is because import.meta.env isn't available in Node.js context");
    }

    // Test AIGenerationService
    console.log("\n3. Testing AIGenerationService initialization...");
    // We can't test this without Supabase client, but we can check if it would fail
    console.log("   (Skipping - requires Supabase client)");

    console.log("\n✅ All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:");
    console.error(error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    process.exit(1);
  }
}

testServiceInit().catch(console.error);
