#!/bin/bash

BASE_URL="http://localhost:5002"
CONCURRENT_USERS=50
REQUESTS_PER_USER=10

echo "Load Testing Auth Service"
echo "========================="
echo "Concurrent Users: $CONCURRENT_USERS"
echo "Requests per User: $REQUESTS_PER_USER"
echo ""

# Install hey if not present
if ! command -v hey &> /dev/null; then
    echo "Installing 'hey' load testing tool..."
    go install github.com/rakyll/hey@latest
fi

# Test 1: Health endpoint
echo "1. Testing /health endpoint..."
hey -n 1000 -c 50 "$BASE_URL/health"

# Test 2: JWKS endpoint
echo "2. Testing /jwks endpoint..."
hey -n 500 -c 25 "$BASE_URL/.well-known/jwks.json"

# Test 3: Login endpoint
echo "3. Testing /login endpoint..."
hey -n 100 -c 10 -m POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"Test@1234"}' \
    "$BASE_URL/api/v1/auth/login"

echo ""
echo "Load testing completed"