#!/bin/bash
# Helper script to run tests with correct Node version

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Output file
OUTPUT_FILE="test-output.log"

echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║     10x-cards Unit Test Runner        ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
echo

# Clear previous output file
> "$OUTPUT_FILE"

# Log to both console and file
log() {
  echo -e "$1" | tee -a "$OUTPUT_FILE"
}

log "Test run started at: $(date)"
log ""

# Check if nvm is installed
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  log "${GREEN}✓${NC} Loading nvm..."
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
else
  log "${RED}✗${NC} nvm not found. Please install nvm or use Node v22 manually."
  exit 1
fi

# Check if .nvmrc exists
if [ -f .nvmrc ]; then
  REQUIRED_VERSION=$(cat .nvmrc)
  log "${GREEN}✓${NC} Required Node version: ${REQUIRED_VERSION}"
  
  # Switch to required version
  log "${YELLOW}→${NC} Switching to Node ${REQUIRED_VERSION}..."
  nvm use >> "$OUTPUT_FILE" 2>&1
  
  if [ $? -ne 0 ]; then
    log "${RED}✗${NC} Failed to switch to Node ${REQUIRED_VERSION}"
    log "${YELLOW}→${NC} Installing Node ${REQUIRED_VERSION}..."
    nvm install >> "$OUTPUT_FILE" 2>&1
  fi
else
  log "${YELLOW}⚠${NC}  No .nvmrc found. Using current Node version."
fi

# Verify Node version
CURRENT_VERSION=$(node --version)
log "${GREEN}✓${NC} Current Node version: ${CURRENT_VERSION}"
log ""

# Run tests based on argument and capture output
log "${YELLOW}→${NC} Running tests... (output saved to ${OUTPUT_FILE})"
log "================================================================"
log ""

case "${1:-all}" in
  all)
    npm test -- --run >> "$OUTPUT_FILE" 2>&1
    EXIT_CODE=$?
    ;;
  watch)
    npm run test:watch >> "$OUTPUT_FILE" 2>&1
    EXIT_CODE=$?
    ;;
  ui)
    npm run test:ui >> "$OUTPUT_FILE" 2>&1
    EXIT_CODE=$?
    ;;
  coverage)
    npm run test:coverage >> "$OUTPUT_FILE" 2>&1
    EXIT_CODE=$?
    ;;
  *)
    npm test "$1" -- --run >> "$OUTPUT_FILE" 2>&1
    EXIT_CODE=$?
    ;;
esac

log ""
log "================================================================"
log "Test run completed at: $(date)"
log ""

if [ $EXIT_CODE -eq 0 ]; then
  log "${GREEN}╔════════════════════════════════════════╗${NC}"
  log "${GREEN}║      ✓ All Tests Passed!              ║${NC}"
  log "${GREEN}╚════════════════════════════════════════╝${NC}"
else
  log "${RED}╔════════════════════════════════════════╗${NC}"
  log "${RED}║      ✗ Some Tests Failed (code: $EXIT_CODE)${NC}"
  log "${RED}╚════════════════════════════════════════╝${NC}"
fi

log ""
log "Full output saved to: ${OUTPUT_FILE}"

exit $EXIT_CODE
