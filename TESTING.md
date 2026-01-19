# Testing Guide for OpenRouter Integration

This guide covers how to test the OpenRouter service and AI generation endpoint.

## Prerequisites

1. **Set up environment variables** - Create a `.env` file in the root directory:

```bash
# Required for OpenRouter
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here

# Required for Supabase (if testing with auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here

# Optional: Disable auth for easier testing
DISABLE_AUTH=true
MOCK_USER_ID=test-user-123
```

2. **Get your OpenRouter API key**:
   - Sign up at https://openrouter.ai/
   - Go to your API keys page
   - Create a new key
   - Copy it to your `.env` file

## Testing Methods

### Method 1: Test via Frontend (Recommended)

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open the app** in your browser (usually `http://localhost:4321`)

3. **Test the generate flow**:
   - Paste some text in the textarea (e.g., a paragraph about a topic you want to learn)
   - Click "Generate" button
   - Verify proposals appear
   - Check browser console for any errors

### Method 2: Test API Endpoint Directly (curl)

#### With Authentication Disabled (Easier)

```bash
# Set DISABLE_AUTH=true in .env first, then:

curl -X POST http://localhost:4321/api/cards/generate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Photosynthesis is the process by which plants convert light energy into chemical energy. During photosynthesis, plants use sunlight, water, and carbon dioxide to produce glucose and oxygen. This process occurs in the chloroplasts of plant cells."
  }'
```

#### With Real Authentication

1. **Get a Supabase JWT token** (from browser dev tools after logging in, or use Supabase client)

2. **Make request with token**:
```bash
curl -X POST http://localhost:4321/api/cards/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
  -d '{
    "text": "Photosynthesis is the process by which plants convert light energy into chemical energy."
  }'
```

### Method 3: Test OpenRouter Service Directly

Test the service in isolation using the provided test script:

```bash
# Install tsx if you don't have it (one-time)
npm install -D tsx

# Set your API key
export OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Run the test script
npx tsx test-openrouter.ts
```

Or if you prefer, set the key in your `.env` file and the script will read it (if you have dotenv installed).

## Expected Responses

### Success Response (200 OK)

```json
{
  "proposals": [
    {
      "front": "What is photosynthesis?",
      "back": "The process by which plants convert light energy into chemical energy using sunlight, water, and carbon dioxide."
    },
    {
      "front": "Where does photosynthesis occur?",
      "back": "In the chloroplasts of plant cells."
    }
  ],
  "count": 2
}
```

### Error Responses

#### 400 Bad Request (Validation Error)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Text must be 10,000 characters or less",
    "details": {
      "text": "Text must be 10,000 characters or less"
    }
  }
}
```

#### 402 Payment Required (Quota Exceeded)
```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "OpenRouter quota or rate limit exceeded"
  }
}
```

#### 422 Unprocessable Entity (Invalid JSON)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "AI model returned invalid proposals. Please try again."
  }
}
```

## Test Cases

### Test Case 1: Basic Generation
- **Input**: Short paragraph (100-500 characters)
- **Expected**: 1-5 valid proposals returned
- **Validation**: Check that front ≤ 200 chars, back ≤ 500 chars

### Test Case 2: Long Input
- **Input**: Text near 10,000 character limit
- **Expected**: Proposals generated successfully
- **Validation**: Should not exceed limits

### Test Case 3: Empty Input
- **Input**: Empty string
- **Expected**: 400 Bad Request with validation error

### Test Case 4: Invalid JSON Handling
- **Scenario**: If AI returns invalid JSON (rare, but test retry logic)
- **Expected**: Retry up to 2 times, then return 422 error

### Test Case 5: Quota Exceeded
- **Scenario**: OpenRouter returns 402 or 429
- **Expected**: Appropriate error code and message

### Test Case 6: Network Error
- **Scenario**: OpenRouter API is unreachable
- **Expected**: 500 or 503 error with retry logic

## Debugging Tips

1. **Check environment variables**:
   ```bash
   # In Node.js/TypeScript
   console.log(import.meta.env.OPENROUTER_API_KEY ? "Set" : "Missing");
   ```

2. **Check browser console** for client-side errors

3. **Check server logs** in terminal where `npm run dev` is running

4. **Verify API key** is valid by testing directly with OpenRouter:
   ```bash
   curl https://openrouter.ai/api/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

5. **Check Supabase connection** if authentication is enabled

## Common Issues

### Issue: "OPENROUTER_API_KEY environment variable is required"
- **Solution**: Make sure `.env` file exists and contains `OPENROUTER_API_KEY=...`
- **Note**: Restart dev server after adding env variables

### Issue: "Invalid or missing OpenRouter API key"
- **Solution**: Verify your API key is correct and has credits/quota available

### Issue: "Rate limit exceeded"
- **Solution**: Wait a few seconds and try again, or check your OpenRouter quota

### Issue: "AI model returned invalid proposals"
- **Solution**: This is rare but can happen. The service will retry automatically. If it persists, check OpenRouter status.

## Performance Testing

- **Typical response time**: 3-10 seconds for average inputs
- **Timeout**: 30 seconds (configurable in service)
- **Retry logic**: Up to 2 retries for invalid JSON responses

## Next Steps

After testing:
1. Verify proposals are valid and useful
2. Test the accept/reject flow
3. Check analytics events are being created
4. Monitor OpenRouter usage and costs
