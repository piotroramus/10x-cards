/**
 * Test script for OpenRouter Service
 *
 * Run with: npx tsx test-openrouter.ts
 * Or: node --loader ts-node/esm test-openrouter.ts
 *
 * Make sure OPENROUTER_API_KEY is set in your environment
 * Install tsx if needed: npm install -D tsx
 */

import { OpenRouterService } from "./src/lib/services/openrouter.service.ts";

async function testOpenRouter() {
  console.log("🧪 Testing OpenRouter Service...\n");

  // Check environment variable
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("❌ ERROR: OPENROUTER_API_KEY environment variable is not set");
    console.log("💡 Set it in your .env file or export it:");
    console.log("   export OPENROUTER_API_KEY=sk-or-v1-...");
    process.exit(1);
  }

  console.log("✅ API key found\n");

  try {
    // Create service instance directly (bypassing factory function that uses import.meta.env)
    const service = new OpenRouterService({
      apiKey,
      defaultModel: "openai/gpt-3.5-turbo",
      defaultTemperature: 0.7,
    });

    console.log("✅ Service created successfully");
    console.log(`   Model: ${service.config.defaultModel || "Not set"}\n`);

    // Test 1: Simple chat
    console.log("📝 Test 1: Simple chat completion...");
    const response = await service.chat({
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Respond concisely.",
        },
        {
          role: "user",
          content: "What is 2+2?",
        },
      ],
    });

    console.log("✅ Chat completion successful!");
    console.log(`   Model used: ${response.model}`);
    console.log(`   Content: ${response.content.substring(0, 100)}...`);
    console.log(`   Tokens used: ${response.usage.totalTokens}\n`);

    // Test 2: Structured output (flashcard generation)
    console.log("📝 Test 2: Structured output with JSON schema...");
    const flashcardResponse = await service.chat({
      messages: [
        {
          role: "system",
          content:
            "You are a flashcard generator. Generate flashcards in JSON format: { flashcards: [{ front: string, back: string }] }",
        },
        {
          role: "user",
          content:
            "Generate 2 flashcards about photosynthesis: the process by which plants convert light energy into chemical energy.",
        },
      ],
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "Flashcards",
          strict: true,
          schema: {
            type: "object",
            properties: {
              flashcards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    front: { type: "string" },
                    back: { type: "string" },
                  },
                  required: ["front", "back"],
                },
              },
            },
            required: ["flashcards"],
          },
        },
      },
    });

    console.log("✅ Structured output successful!");
    const parsed = JSON.parse(flashcardResponse.content);
    console.log(`   Generated ${parsed.flashcards?.length || 0} flashcards`);
    if (parsed.flashcards && parsed.flashcards.length > 0) {
      console.log(`   Example: ${parsed.flashcards[0].front} → ${parsed.flashcards[0].back.substring(0, 50)}...`);
    }
    console.log(`   Tokens used: ${flashcardResponse.usage.totalTokens}\n`);

    // Test 3: Error handling (invalid model)
    console.log("📝 Test 3: Error handling (invalid model)...");
    try {
      await service.chat({
        messages: [{ role: "user", content: "Test" }],
        model: "invalid-model-name-12345",
      });
      console.log("❌ Should have thrown an error");
    } catch (error) {
      console.log("✅ Error handled correctly");
      console.log(`   Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
      console.log(`   Message: ${error instanceof Error ? error.message : String(error)}\n`);
    }

    console.log("🎉 All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:");
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testOpenRouter().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
