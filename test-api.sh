#!/bin/bash

# Test script for /api/cards/generate endpoint
# Usage: ./test-api.sh [your-supabase-token]
# Or set DISABLE_AUTH=true in .env for easier testing

BASE_URL="http://localhost:3000"
ENDPOINT="/api/cards/generate"

# Sample text for testing
SAMPLE_TEXT="Photosynthesis is the process by which plants convert light energy into chemical energy. During photosynthesis, plants use sunlight, water, and carbon dioxide to produce glucose and oxygen. This process occurs in the chloroplasts of plant cells."

echo "🧪 Testing POST $BASE_URL$ENDPOINT"
echo ""

# Check if token provided
if [ -z "$1" ]; then
  echo "ℹ️  No token provided. Using DISABLE_AUTH mode (set DISABLE_AUTH=true in .env)"
  echo ""
  curl -X POST "$BASE_URL$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"$SAMPLE_TEXT\"}" \
    -w "\n\nHTTP Status: %{http_code}\n" \
    -s | jq '.' 2>/dev/null || cat
else
  echo "ℹ️  Using provided token"
  echo ""
  curl -X POST "$BASE_URL$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $1" \
    -d "{\"text\": \"$SAMPLE_TEXT\"}" \
    -w "\n\nHTTP Status: %{http_code}\n" \
    -s | jq '.' 2>/dev/null || cat
fi

echo ""
echo "✅ Test complete!"
