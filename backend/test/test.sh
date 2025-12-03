#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URLs
GATEWAY_URL="http://localhost:4000"
AUTH_URL="http://localhost:5002"
BACKEND_URL="http://localhost:4001"

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print test results
print_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ PASS${NC}: $2"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}✗ FAIL${NC}: $2"
        if [ ! -z "$3" ]; then
            echo -e "${RED}  Error: $3${NC}"
        fi
    fi
}

# Function to extract value from JSON
extract_json() {
    echo "$1" | grep -o "\"$2\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | cut -d'"' -f4
}

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Studio S Manager - API Test Suite${NC}"
echo -e "${BLUE}======================================${NC}\n"

# Variables to store tokens and IDs
ACCESS_TOKEN=""
USER_ID=""
PRODUCT_ID=""
TREATMENT_ID=""
CLIENT_ID=""
CATEGORY_ID=""
SUPPLIER_ID=""
LOCATION_ID=""

# ==========================================
# 1. HEALTH CHECKS
# ==========================================
echo -e "\n${YELLOW}[1] Health Checks${NC}"

# Test Gateway Health
RESPONSE=$(curl -s -w "%{http_code}" "${GATEWAY_URL}/health")
HTTP_CODE="${RESPONSE: -3}"
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "503" ]; then
    print_test 0 "Gateway health endpoint accessible"
else
    print_test 1 "Gateway health endpoint" "HTTP $HTTP_CODE"
fi

# Test Auth Service Health (direct)
RESPONSE=$(curl -s -w "%{http_code}" "${AUTH_URL}/health")
HTTP_CODE="${RESPONSE: -3}"
if [ "$HTTP_CODE" = "200" ]; then
    print_test 0 "Auth service health check"
else
    print_test 1 "Auth service health check" "HTTP $HTTP_CODE"
fi

# Test Backend Service Health (direct)
RESPONSE=$(curl -s -w "%{http_code}" "${BACKEND_URL}/health")
HTTP_CODE="${RESPONSE: -3}"
if [ "$HTTP_CODE" = "200" ]; then
    print_test 0 "Backend service health check"
else
    print_test 1 "Backend service health check" "HTTP $HTTP_CODE"
fi

# ==========================================
# 2. AUTHENTICATION TESTS
# ==========================================
echo -e "\n${YELLOW}[2] Authentication Tests${NC}"

# Test Signup
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${GATEWAY_URL}/auth/signup" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "testowner@studios.com",
        "password": "Test123!@#",
        "firstName": "Test",
        "lastName": "Owner",
        "role": "owner"
    }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "409" ]; then
    print_test 0 "Signup (owner account)"
    USER_ID=$(extract_json "$BODY" "id")
else
    print_test 1 "Signup" "HTTP $HTTP_CODE - $BODY"
fi

# Test Login
RESPONSE=$(curl -s -w "\n%{http_code}" -c cookies.txt -X POST "${GATEWAY_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "testowner@studios.com",
        "password": "Test123!@#"
    }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_test 0 "Login with credentials"
    # Extract JWT from cookie file
    ACCESS_TOKEN=$(grep -oP 'jwt\s+\K[^\s]+' cookies.txt | head -n1)
    if [ -z "$ACCESS_TOKEN" ]; then
        echo -e "${YELLOW}  Warning: Could not extract JWT from cookies${NC}"
    else
        echo -e "  ${GREEN}Token extracted successfully${NC}"
    fi
else
    print_test 1 "Login" "HTTP $HTTP_CODE - $BODY"
fi

# Test Get Current User
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt "${GATEWAY_URL}/auth/me")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    print_test 0 "Get current user (/auth/me)"
else
    print_test 1 "Get current user" "HTTP $HTTP_CODE"
fi

# Test Unauthorized Access
RESPONSE=$(curl -s -w "\n%{http_code}" "${GATEWAY_URL}/products")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
    print_test 0 "Unauthorized access rejected (401)"
else
    print_test 1 "Unauthorized access should return 401" "Got HTTP $HTTP_CODE"
fi

# ==========================================
# 3. CATEGORY, SUPPLIER, LOCATION SETUP
# ==========================================
echo -e "\n${YELLOW}[3] Setup: Categories, Suppliers, Locations${NC}"

# Create Category
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt -X POST "${GATEWAY_URL}/categories" \
    -H "Content-Type: application/json" \
    -d '{"name": "Test Category"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
if [ "$HTTP_CODE" = "201" ]; then
    print_test 0 "Create category"
    CATEGORY_ID=$(extract_json "$BODY" "id")
else
    print_test 1 "Create category" "HTTP $HTTP_CODE"
fi

# Create Supplier
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt -X POST "${GATEWAY_URL}/suppliers" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Test Supplier",
        "email": "supplier@test.com",
        "phone": "+1234567890"
    }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
if [ "$HTTP_CODE" = "201" ]; then
    print_test 0 "Create supplier"
    SUPPLIER_ID=$(extract_json "$BODY" "id")
else
    print_test 1 "Create supplier" "HTTP $HTTP_CODE"
fi

# Create Location
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt -X POST "${GATEWAY_URL}/locations" \
    -H "Content-Type: application/json" \
    -d '{"code": "MAIN", "name": "Main Storage"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
if [ "$HTTP_CODE" = "201" ]; then
    print_test 0 "Create location"
    LOCATION_ID=$(extract_json "$BODY" "id")
else
    print_test 1 "Create location" "HTTP $HTTP_CODE"
fi

# ==========================================
# 4. PRODUCT TESTS
# ==========================================
echo -e "\n${YELLOW}[4] Product Management${NC}"

# Create Product
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt -X POST "${GATEWAY_URL}/products" \
    -H "Content-Type: application/json" \
    -d '{
        "sku": "TEST-PROD-001",
        "name": "Test Moisturizing Cream",
        "cost_cents": 1500,
        "price_cents": 3500,
        "retail": true,
        "active": true
    }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
if [ "$HTTP_CODE" = "201" ]; then
    print_test 0 "Create product"
    PRODUCT_ID=$(extract_json "$BODY" "id")
else
    print_test 1 "Create product" "HTTP $HTTP_CODE - $BODY"
fi

# Get All Products
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt "${GATEWAY_URL}/products")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    print_test 0 "Get all products"
else
    print_test 1 "Get all products" "HTTP $HTTP_CODE"
fi

# Get Product by ID
if [ ! -z "$PRODUCT_ID" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt "${GATEWAY_URL}/products/${PRODUCT_ID}")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" = "200" ]; then
        print_test 0 "Get product by ID"
    else
        print_test 1 "Get product by ID" "HTTP $HTTP_CODE"
    fi
else
    print_test 1 "Get product by ID" "No product ID available"
fi

# Update Product
if [ ! -z "$PRODUCT_ID" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt -X PATCH "${GATEWAY_URL}/products/${PRODUCT_ID}" \
        -H "Content-Type: application/json" \
        -d '{"price_cents": 4000}')
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" = "200" ]; then
        print_test 0 "Update product"
    else
        print_test 1 "Update product" "HTTP $HTTP_CODE"
    fi
else
    print_test 1 "Update product" "No product ID available"
fi

# ==========================================
# 5. TREATMENT TESTS
# ==========================================
echo -e "\n${YELLOW}[5] Treatment Management${NC}"

# Create Treatment
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt -X POST "${GATEWAY_URL}/treatments" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Test Deep Tissue Massage",
        "description": "Therapeutic massage",
        "durationMinutes": 60,
        "price": 85.00,
        "category": "Massage",
        "isActive": true
    }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
if [ "$HTTP_CODE" = "201" ]; then
    print_test 0 "Create treatment"
    TREATMENT_ID=$(extract_json "$BODY" "id")
else
    print_test 1 "Create treatment" "HTTP $HTTP_CODE - $BODY"
fi

# Get All Treatments
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt "${GATEWAY_URL}/treatments")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    print_test 0 "Get all treatments"
else
    print_test 1 "Get all treatments" "HTTP $HTTP_CODE"
fi

# ==========================================
# 6. CLIENT TESTS
# ==========================================
echo -e "\n${YELLOW}[6] Client Management${NC}"

# Create Client
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt -X POST "${GATEWAY_URL}/api/v1/clients" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Test Client",
        "email": "testclient@example.com",
        "phone": "+1234567890"
    }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
if [ "$HTTP_CODE" = "201" ]; then
    print_test 0 "Create client"
    CLIENT_ID=$(extract_json "$BODY" "id")
else
    print_test 1 "Create client" "HTTP $HTTP_CODE - $BODY"
fi

# Search Clients
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt "${GATEWAY_URL}/api/v1/clients?q=Test")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    print_test 0 "Search clients"
else
    print_test 1 "Search clients" "HTTP $HTTP_CODE"
fi

# ==========================================
# 7. INVENTORY TESTS
# ==========================================
echo -e "\n${YELLOW}[7] Inventory Management${NC}"

# Get Inventory Levels
RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt "${GATEWAY_URL}/inventory/levels")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    print_test 0 "Get inventory levels"
else
    print_test 1 "Get inventory levels" "HTTP $HTTP_CODE"
fi

# Adjust Inventory (requires PRODUCT_ID and LOCATION_ID)
if [ ! -z "$PRODUCT_ID" ] && [ ! -z "$LOCATION_ID" ]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" -b cookies.txt -X POST "${GATEWAY_URL}/inventory/adjust" \
        -H "Content-Type: application/json" \
        -d "{
            \"product_id\": \"${PRODUCT_ID}\",
            \"location_id\": \"${LOCATION_ID}\",
            \"quantity_change\": 50,
            \"reason\": \"Test stock adjustment\"
        }")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" = "200" ]; then
        print_test 0 "Adjust inventory (add stock)"
    else
        print_test 1 "Adjust inventory" "HTTP $HTTP_CODE"
    fi
else
    print_test 1 "Adjust inventory" "Missing product ID or location ID"
fi

# ==========================================
# SUMMARY
# ==========================================
echo -e "\n${BLUE}======================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}\n"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}\n"
    exit 1
fi

# Cleanup
rm -f cookies.txt