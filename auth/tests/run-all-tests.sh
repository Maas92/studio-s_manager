#!/bin/bash

set -e

echo "🧪 Running Complete Test Suite"
echo "==============================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if server is running
if ! curl -s http://localhost:5002/health > /dev/null; then
    echo -e "${RED}❌ Server is not running. Start it first with: npm run dev${NC}"
    exit 1
fi

# Run unit tests (if you have them)
if [ -d "tests/unit" ]; then
    echo -e "\n${YELLOW}📝 Running Unit Tests...${NC}"
    npm test
fi

# Run integration tests
echo -e "\n${YELLOW}🔗 Running Integration Tests...${NC}"
npm run test:integration

# Run auth tests
echo -e "\n${YELLOW}🔐 Running Authentication Tests...${NC}"
./auth-tests.sh

# Run security tests
echo -e "\n${YELLOW}🛡️  Running Security Tests...${NC}"
./security-tests.sh

# Run performance tests
echo -e "\n${YELLOW}⚡ Running Performance Tests...${NC}"
node ./performance/benchmark.js

# Generate coverage report
echo -e "\n${YELLOW}📊 Generating Coverage Report...${NC}"
npm run test:coverage

echo -e "\n${GREEN}✅ All tests completed!${NC}"
echo -e "\nView coverage report: ${YELLOW}open coverage/index.html${NC}"