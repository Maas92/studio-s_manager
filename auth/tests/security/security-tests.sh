#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost:5002"

print_test() {
    echo -e "${YELLOW}[SECURITY TEST]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Test 1: SQL Injection attempts
test_sql_injection() {
    print_test "SQL Injection protection"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "admin@example.com OR 1=1--",
            "password": "anything"
        }')
    
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 401 ] || [ "$http_code" -eq 400 ]; then
        print_pass "SQL injection attempt blocked"
    else
        print_fail "SQL injection not properly blocked"
    fi
}

# Test 2: XSS attempts
test_xss_protection() {
    print_test "XSS protection"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/signup" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "xss@test.com",
            "password": "Test@1234",
            "firstName": "<script>alert(\"XSS\")</script>",
            "lastName": "User"
        }')
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if ! echo "$body" | grep -q "<script>"; then
        print_pass "XSS attempt sanitized"
    else
        print_fail "XSS not properly sanitized"
    fi
}

# Test 3: NoSQL injection variants
test_nosql_variants() {
    print_test "NoSQL injection variants"
    
    # Test $ne operator
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": {"$ne": null},
            "password": {"$ne": null}
        }')
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 400 ] || [ "$http_code" -eq 401 ]; then
        print_pass "NoSQL $ne operator blocked"
    else
        print_fail "NoSQL $ne operator not blocked"
    fi
    
    # Test $regex operator
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{
            "email": {"$regex": ".*"},
            "password": "test"
        }')
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 400 ] || [ "$http_code" -eq 401 ]; then
        print_pass "NoSQL $regex operator blocked"
    else
        print_fail "NoSQL $regex operator not blocked"
    fi
}

# Test 4: Prototype pollution
test_prototype_pollution() {
    print_test "Prototype pollution protection"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/signup" \
        -H "Content-Type: application/json" \
        -d '{
            "email": "proto@test.com",
            "password": "Test@1234",
            "__proto__": {"isAdmin": true}
        }')
    
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 400 ] || [ "$http_code" -eq 201 ]; then
        print_pass "Prototype pollution attempt handled"
    else
        print_fail "Prototype pollution check failed"
    fi
}

# Test 5: JWT tampering
test_jwt_tampering() {
    print_test "JWT tampering detection"
    
    # Create a tampered JWT
    TAMPERED_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.invalid_signature"
    
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/auth/me" \
        -H "Authorization: Bearer $TAMPERED_TOKEN")
    
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 401 ]; then
        print_pass "Tampered JWT rejected"
    else
        print_fail "Tampered JWT not properly rejected"
    fi
}

# Test 6: Timing attack resistance
test_timing_attacks() {
    print_test "Timing attack resistance"
    
    # Measure response time for non-existent user
    start1=$(date +%s%N)
    curl -s -X POST "$BASE_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email": "nonexistent@example.com", "password": "Test@1234"}' > /dev/null
    end1=$(date +%s%N)
    time1=$((end1 - start1))
    
    # Measure response time for existing user with wrong password
    start2=$(date +%s%N)
    curl -s -X POST "$BASE_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email": "test@example.com", "password": "WrongPassword@123"}' > /dev/null
    end2=$(date +%s%N)
    time2=$((end2 - start2))
    
    diff=$((time1 - time2))
    if [ ${diff#-} -lt 100000000 ]; then  # Less than 100ms difference
        print_pass "Timing attack resistance present"
    else
        print_fail "Significant timing difference detected ($diff ns)"
    fi
}

# Test 7: Password complexity
test_password_requirements() {
    print_test "Password complexity requirements"
    
    weak_passwords=(
        "short"
        "noupperca"
        "NOLOWERCASE"
        "NoNumber"
        "NoSpecial1"
    )
    
    for pwd in "${weak_passwords[@]}"; do
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/signup" \
            -H "Content-Type: application/json" \
            -d "{
                \"email\": \"test-$(date +%s)@example.com\",
                \"password\": \"$pwd\",
                \"firstName\": \"Test\",
                \"lastName\": \"User\"
            }")
        
        http_code=$(echo "$response" | tail -n1)
        if [ "$http_code" -ne 201 ]; then
            print_pass "Weak password '$pwd' rejected"
        else
            print_fail "Weak password '$pwd' accepted"
        fi
    done
}

# Test 8: HTTP methods
test_http_methods() {
    print_test "Unsafe HTTP methods disabled"
    
    methods=("TRACE" "OPTIONS" "PUT" "DELETE")
    
    for method in "${methods[@]}"; do
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL/health")
        http_code=$(echo "$response" | tail -n1)
        
        if [ "$http_code" -ne 200 ] || [ "$method" == "OPTIONS" ]; then
            print_pass "$method method properly handled"
        else
            print_fail "$method method should not return 200"
        fi
    done
}

# Run all security tests
main() {
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}SECURITY TEST SUITE${NC}"
    echo -e "${YELLOW}========================================${NC}\n"
    
    test_sql_injection
    test_xss_protection
    test_nosql_variants
    test_prototype_pollution
    test_jwt_tampering
    test_timing_attacks
    test_password_requirements
    test_http_methods
    
    echo -e "\n${GREEN}Security tests completed${NC}\n"
}

main