#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:5002"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="SecureP@ss123"
COOKIES_FILE="test-cookies.txt"

# Counters
PASSED=0
FAILED=0

# Helper functions
print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED++))
}

print_section() {
    echo -e "\n${YELLOW}========================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}========================================${NC}\n"
}

cleanup() {
    rm -f "$COOKIES_FILE"
}

# Test functions
test_health_check() {
    print_test "Health check endpoint"
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -eq 200 ] && echo "$body" | grep -q "ok"; then
        print_pass "Health check returns 200 and status: ok"
    else
        print_fail "Health check failed (HTTP $http_code)"
    fi
}

test_jwks_endpoint() {
    print_test "JWKS endpoint"
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/.well-known/jwks.json")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -eq 200 ] && echo "$body" | grep -q "keys"; then
        print_pass "JWKS endpoint returns valid keys"
    else
        print_fail "JWKS endpoint failed"
    fi
}

test_signup_success() {
    print_test "User signup with valid data"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/signup" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"$TEST_PASSWORD\",
            \"firstName\": \"Test\",
            \"lastName\": \"User\",
            \"role\": \"therapist\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -eq 201 ] && echo "$body" | grep -q "accessToken"; then
        print_pass "Signup successful, returns access token"
        # Extract and save access token
        ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
        export ACCESS_TOKEN
    else
        print_fail "Signup failed (HTTP $http_code)"
        echo "$body"
    fi
}

test_signup_duplicate_email() {
    print_test "Signup with duplicate email"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/signup" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"$TEST_PASSWORD\",
            \"firstName\": \"Duplicate\",
            \"lastName\": \"User\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -eq 409 ]; then
        print_pass "Duplicate email rejected with 409"
    else
        print_fail "Should reject duplicate email (got HTTP $http_code)"
    fi
}

test_signup_weak_password() {
    print_test "Signup with weak password"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/signup" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"weak-$(date +%s)@example.com\",
            \"password\": \"weak\",
            \"firstName\": \"Test\",
            \"lastName\": \"User\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 400 ]; then
        print_pass "Weak password rejected with 400"
    else
        print_fail "Should reject weak password (got HTTP $http_code)"
    fi
}

test_signup_invalid_email() {
    print_test "Signup with invalid email"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/signup" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"not-an-email\",
            \"password\": \"$TEST_PASSWORD\",
            \"firstName\": \"Test\",
            \"lastName\": \"User\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 400 ]; then
        print_pass "Invalid email rejected with 400"
    else
        print_fail "Should reject invalid email (got HTTP $http_code)"
    fi
}

test_login_success() {
    print_test "Login with correct credentials"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -c "$COOKIES_FILE" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"$TEST_PASSWORD\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -eq 200 ] && echo "$body" | grep -q "accessToken"; then
        print_pass "Login successful with valid credentials"
        ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
        export ACCESS_TOKEN
    else
        print_fail "Login failed (HTTP $http_code)"
    fi
}

test_login_wrong_password() {
    print_test "Login with wrong password"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"WrongPassword123!\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 401 ]; then
        print_pass "Wrong password rejected with 401"
    else
        print_fail "Should reject wrong password (got HTTP $http_code)"
    fi
}

test_login_nonexistent_user() {
    print_test "Login with non-existent email"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"nonexistent@example.com\",
            \"password\": \"$TEST_PASSWORD\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 401 ]; then
        print_pass "Non-existent user rejected with 401"
    else
        print_fail "Should reject non-existent user (got HTTP $http_code)"
    fi
}

test_me_endpoint() {
    print_test "GET /api/v1/auth/me with valid token"
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/auth/me" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -eq 200 ] && echo "$body" | grep -q "$TEST_EMAIL"; then
        print_pass "Me endpoint returns user data"
    else
        print_fail "Me endpoint failed (HTTP $http_code)"
    fi
}

test_me_endpoint_no_token() {
    print_test "GET /api/v1/auth/me without token"
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/auth/me")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 401 ]; then
        print_pass "Me endpoint rejects request without token"
    else
        print_fail "Should reject request without token (got HTTP $http_code)"
    fi
}

test_me_endpoint_invalid_token() {
    print_test "GET /api/v1/auth/me with invalid token"
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/auth/me" \
        -H "Authorization: Bearer invalid.token.here")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 401 ]; then
        print_pass "Me endpoint rejects invalid token"
    else
        print_fail "Should reject invalid token (got HTTP $http_code)"
    fi
}

test_refresh_token() {
    print_test "Refresh access token"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/refresh" \
        -b "$COOKIES_FILE" \
        -c "$COOKIES_FILE")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -eq 200 ] && echo "$body" | grep -q "accessToken"; then
        print_pass "Token refresh successful"
        ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
        export ACCESS_TOKEN
    else
        print_fail "Token refresh failed (HTTP $http_code)"
    fi
}

test_refresh_no_cookie() {
    print_test "Refresh without refresh token cookie"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/refresh")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 401 ]; then
        print_pass "Refresh rejected without cookie"
    else
        print_fail "Should reject refresh without cookie (got HTTP $http_code)"
    fi
}

test_update_password() {
    print_test "Update password"
    NEW_PASSWORD="NewSecureP@ss456"
    response=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/v1/auth/update-password" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -b "$COOKIES_FILE" \
        -c "$COOKIES_FILE" \
        -d "{
            \"currentPassword\": \"$TEST_PASSWORD\",
            \"newPassword\": \"$NEW_PASSWORD\",
            \"newPasswordConfirm\": \"$NEW_PASSWORD\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -eq 200 ] && echo "$body" | grep -q "accessToken"; then
        print_pass "Password update successful"
        ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
        export ACCESS_TOKEN
        TEST_PASSWORD="$NEW_PASSWORD"
    else
        print_fail "Password update failed (HTTP $http_code)"
    fi
}

test_login_old_password() {
    print_test "Login with old password after update"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"SecureP@ss123\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 401 ]; then
        print_pass "Old password rejected after update"
    else
        print_fail "Should reject old password (got HTTP $http_code)"
    fi
}

test_logout() {
    print_test "Logout"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/logout" \
        -b "$COOKIES_FILE")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 200 ]; then
        print_pass "Logout successful"
    else
        print_fail "Logout failed (HTTP $http_code)"
    fi
}

test_refresh_after_logout() {
    print_test "Refresh token after logout"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/refresh" \
        -b "$COOKIES_FILE")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 401 ]; then
        print_pass "Refresh rejected after logout"
    else
        print_fail "Should reject refresh after logout (got HTTP $http_code)"
    fi
}

test_nosql_injection() {
    print_test "NoSQL injection protection"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": {"$gt": ""},
            "password": {"$gt": ""}
        }')
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 400 ] || [ "$http_code" -eq 401 ]; then
        print_pass "NoSQL injection attempt blocked"
    else
        print_fail "NoSQL injection should be blocked (got HTTP $http_code)"
    fi
}

test_rate_limiting() {
    print_test "Rate limiting on login endpoint"
    local success_count=0
    
    for i in {1..10}; do
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" \
            -H "Content-Type: application/json" \
            -d "{
                \"email\": \"ratelimit@test.com\",
                \"password\": \"Test@1234\"
            }")
        http_code=$(echo "$response" | tail -n1)
        
        if [ "$http_code" -eq 429 ]; then
            print_pass "Rate limit enforced after $i requests"
            success_count=$((success_count + 1))
            break
        fi
    done
    
    if [ "$success_count" -eq 0 ]; then
        print_fail "Rate limiting not working properly"
    fi
}

test_cors_headers() {
    print_test "CORS headers"
    response=$(curl -s -I -H "Origin: http://localhost:5173" "$BASE_URL/health")
    
    if echo "$response" | grep -q "Access-Control-Allow-Origin"; then
        print_pass "CORS headers present"
    else
        print_fail "CORS headers missing"
    fi
}

test_security_headers() {
    print_test "Security headers (Helmet)"
    response=$(curl -s -I "$BASE_URL/health")
    
    if echo "$response" | grep -q "X-Content-Type-Options"; then
        print_pass "Security headers present"
    else
        print_fail "Security headers missing"
    fi
}

test_404_handling() {
    print_test "404 for non-existent routes"
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/nonexistent")
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 404 ]; then
        print_pass "404 returned for non-existent route"
    else
        print_fail "Should return 404 (got HTTP $http_code)"
    fi
}

# Run all tests
main() {
    print_section "AUTHENTICATION SERVICE TEST SUITE"
    
    print_section "1. HEALTH & INFRASTRUCTURE"
    test_health_check
    test_jwks_endpoint
    test_cors_headers
    test_security_headers
    test_404_handling
    
    print_section "2. SIGNUP TESTS"
    test_signup_success
    test_signup_duplicate_email
    test_signup_weak_password
    test_signup_invalid_email
    
    print_section "3. LOGIN TESTS"
    test_login_success
    test_login_wrong_password
    test_login_nonexistent_user
    
    print_section "4. PROTECTED ENDPOINTS"
    test_me_endpoint
    test_me_endpoint_no_token
    test_me_endpoint_invalid_token
    
    print_section "5. TOKEN MANAGEMENT"
    test_refresh_token
    test_refresh_no_cookie
    test_update_password
    test_login_old_password
    test_logout
    test_refresh_after_logout
    
    print_section "6. SECURITY TESTS"
    test_nosql_injection
    test_rate_limiting
    
    print_section "TEST RESULTS"
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"
    echo -e "Total: $((PASSED + FAILED))"
    
    if [ $FAILED -eq 0 ]; then
        echo -e "\n${GREEN}✓ All tests passed!${NC}\n"
        cleanup
        exit 0
    else
        echo -e "\n${RED}✗ Some tests failed${NC}\n"
        cleanup
        exit 1
    fi
}

# Trap cleanup on exit
trap cleanup EXIT

# Run tests
main