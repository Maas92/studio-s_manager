#!/bin/bash

# Complete Gateway Test Suite
# Usage: ./test-gateway.sh

echo "🧪 Starting API Gateway Test Suite"
echo "=================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Helper function
test_endpoint() {
  local name="$1"
  local expected_code="$2"
  shift 2
  local response=$(curl -s -w "%{http_code}" "$@")
  local body="${response%???}"
  local code="${response: -3}"
  
  if [ "$code" = "$expected_code" ]; then
    echo -e "${GREEN}✓${NC} $name"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} $name (Expected: $expected_code, Got: $code)"
    ((FAILED++))
  fi
}

# 1. Health Checks
echo -e "\n📊 Health Checks"
test_endpoint "Gateway health" 200 http://localhost:4000/health
test_endpoint "Liveness probe" 200 http://localhost:4000/health/live
test_endpoint "Readiness probe" 200 http://localhost:4000/health/ready

# 2. Authentication
echo -e "\n🔐 Authentication Tests"
test_endpoint "Unauthenticated access fails" 401 http://localhost:4000/api/v1/products
test_endpoint "Invalid token fails" 401 -H "Authorization: Bearer invalid" http://localhost:4000/api/v1/products

# Get valid token
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password"}' \
  | jq -r '.token')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  test_endpoint "Valid token works" 200 -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/v1/products
else
  echo -e "${RED}✗${NC} Could not obtain valid token"
  ((FAILED++))
fi

# 3. Routing
echo -e "\n🛣️  Routing Tests"
test_endpoint "404 for invalid route" 404 http://localhost:4000/invalid
test_endpoint "Auth routes accessible" 200 -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}' http://localhost:4000/auth/login

# 4. Security Headers
echo -e "\n🛡️  Security Headers"
HEADERS=$(curl -sI http://localhost:4000/health)

if echo "$HEADERS" | grep -q "X-Content-Type-Options"; then
  echo -e "${GREEN}✓${NC} X-Content-Type-Options present"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} X-Content-Type-Options missing"
  ((FAILED++))
fi

if echo "$HEADERS" | grep -q "X-Request-ID"; then
  echo -e "${GREEN}✓${NC} X-Request-ID present"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} X-Request-ID missing"
  ((FAILED++))
fi

# 5. Rate Limiting
echo -e "\n⏱️  Rate Limiting"
echo "Making 6 rapid auth requests..."
RATE_LIMIT_HIT=false
for i in {1..6}; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:4000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}')
  if [ "$CODE" = "429" ]; then
    RATE_LIMIT_HIT=true
    break
  fi
done

if [ "$RATE_LIMIT_HIT" = true ]; then
  echo -e "${GREEN}✓${NC} Rate limiting working"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Rate limiting not triggered"
  ((FAILED++))
fi

# Summary
echo -e "\n=================================="
echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo "=================================="

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC} ✨"
  exit 0
else
  echo -e "${RED}Some tests failed${NC} ❌"
  exit 1
fi