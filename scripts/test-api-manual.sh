#!/bin/bash

# Manual API Testing Script for Transcript Analysis System
# This script validates all API endpoints are working correctly

set -e  # Exit on any error

# Configuration
BASE_URL="${API_BASE_URL:-http://localhost:3000}"
TIMEOUT=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_test() {
    echo -e "${BLUE}🧪 Testing: $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if server is running
check_server() {
    log_test "Server availability"
    if curl -s --connect-timeout $TIMEOUT "$BASE_URL/api/transcripts" > /dev/null; then
        log_success "Server is running at $BASE_URL"
    else
        log_error "Server is not running at $BASE_URL"
        log_info "Make sure to run: npm run dev"
        exit 1
    fi
}

# Test GET /api/transcripts (list all)
test_list_transcripts() {
    log_test "GET /api/transcripts - List all transcripts"
    
    response=$(curl -s --connect-timeout $TIMEOUT "$BASE_URL/api/transcripts")
    
    # Check if response contains required fields
    if echo "$response" | jq -e '.items' > /dev/null && echo "$response" | jq -e '.total' > /dev/null; then
        total=$(echo "$response" | jq '.total')
        items_count=$(echo "$response" | jq '.items | length')
        log_success "List endpoint working - Total: $total, Items returned: $items_count"
        
        # Validate items have required structure
        if [ "$items_count" -gt 0 ]; then
            first_item=$(echo "$response" | jq '.items[0]')
            if echo "$first_item" | jq -e '.metadata.sourceId' > /dev/null; then
                log_success "Items have correct metadata structure"
            else
                log_error "Items missing required metadata fields"
                return 1
            fi
        else
            log_info "No transcripts found in database"
        fi
    else
        log_error "List endpoint returned invalid response structure"
        echo "Response: $response"
        return 1
    fi
}

# Test POST /api/transcripts (upload new)
test_upload_transcript() {
    log_test "POST /api/transcripts - Upload new transcript"
    
    # Create test payload
    timestamp=$(date +%s)
    test_payload=$(cat <<EOF
{
    "content": "This is a test transcript uploaded at $timestamp for API validation.",
    "metadata": {
        "title": "API Test Transcript - $timestamp",
        "date": "$(date +%Y-%m-%d)",
        "speakers": ["Test User", "API Validator"],
        "format": "text",
        "tags": ["api-test", "automated"]
    }
}
EOF
)
    
    response=$(curl -s --connect-timeout $TIMEOUT \
        -X POST "$BASE_URL/api/transcripts" \
        -H "Content-Type: application/json" \
        -d "$test_payload")
    
    # Check if upload successful
    if echo "$response" | jq -e '.metadata.sourceId' > /dev/null; then
        source_id=$(echo "$response" | jq -r '.metadata.sourceId')
        log_success "Upload successful - sourceId: $source_id"
        echo "$source_id" > /tmp/test_source_id  # Save for later tests
    else
        log_error "Upload failed"
        echo "Response: $response"
        return 1
    fi
}

# Test GET /api/transcripts/[sourceId] (get specific)
test_get_specific_transcript() {
    log_test "GET /api/transcripts/[sourceId] - Get specific transcript"
    
    if [ ! -f /tmp/test_source_id ]; then
        log_error "No test sourceId available (upload test may have failed)"
        return 1
    fi
    
    source_id=$(cat /tmp/test_source_id)
    
    response=$(curl -s --connect-timeout $TIMEOUT "$BASE_URL/api/transcripts/$source_id")
    
    # Check if response has correct structure
    if echo "$response" | jq -e '.content' > /dev/null && echo "$response" | jq -e '.metadata' > /dev/null; then
        title=$(echo "$response" | jq -r '.metadata.title')
        log_success "Retrieved transcript successfully - Title: $title"
    else
        log_error "Failed to retrieve specific transcript"
        echo "Response: $response"
        return 1
    fi
}

# Test pagination
test_pagination() {
    log_test "GET /api/transcripts with pagination parameters"
    
    response=$(curl -s --connect-timeout $TIMEOUT "$BASE_URL/api/transcripts?limit=2&cursor=0")
    
    if echo "$response" | jq -e '.items' > /dev/null; then
        items_count=$(echo "$response" | jq '.items | length')
        if [ "$items_count" -le 2 ]; then
            log_success "Pagination working - Returned $items_count items (≤2 as requested)"
        else
            log_error "Pagination failed - Returned $items_count items (>2)"
            return 1
        fi
    else
        log_error "Pagination test failed"
        echo "Response: $response"
        return 1
    fi
}

# Test error handling
test_error_handling() {
    log_test "Error handling for non-existent transcript"
    
    response=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT "$BASE_URL/api/transcripts/nonexistent-test-id")
    
    # Extract HTTP status code (last 3 characters)
    http_code="${response: -3}"
    response_body="${response%???}"  # Remove last 3 characters
    
    if [ "$http_code" = "404" ]; then
        if echo "$response_body" | jq -e '.error' > /dev/null; then
            log_success "Error handling working - Returns 404 with error message"
        else
            log_error "Error response missing error field"
            return 1
        fi
    else
        log_error "Expected 404 status, got $http_code"
        echo "Response: $response_body"
        return 1
    fi
}

# Test schema validation
test_schema_validation() {
    log_test "POST schema validation with invalid data"
    
    invalid_payload='{"content": "", "metadata": {"title": ""}}'
    
    response=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT \
        -X POST "$BASE_URL/api/transcripts" \
        -H "Content-Type: application/json" \
        -d "$invalid_payload")
    
    # Extract HTTP status code (last 3 characters)
    http_code="${response: -3}"
    
    if [ "$http_code" = "400" ]; then
        log_success "Schema validation working - Rejects invalid data with 400"
    else
        log_error "Schema validation failed - Expected 400, got $http_code"
        return 1
    fi
}

# Cleanup function
cleanup() {
    log_test "Cleaning up test data"
    
    if [ -f /tmp/test_source_id ]; then
        source_id=$(cat /tmp/test_source_id)
        
        # Attempt to delete test transcript (DELETE endpoint may not be implemented yet)
        delete_response=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT \
            -X DELETE "$BASE_URL/api/transcripts/$source_id" 2>/dev/null || echo "")
        
        if [[ "$delete_response" == *"200"* ]]; then
            log_success "Test transcript deleted successfully"
        else
            log_info "Could not delete test transcript $source_id (DELETE endpoint may not be implemented)"
        fi
        
        rm -f /tmp/test_source_id
    fi
}

# Main execution
main() {
    echo -e "${BLUE}🚀 Starting API Manual Testing Suite${NC}"
    echo "Testing against: $BASE_URL"
    echo "Time: $(date)"
    echo "----------------------------------------"
    
    # Track test results
    passed=0
    failed=0
    
    # Run tests
    tests=(
        "check_server"
        "test_list_transcripts"
        "test_upload_transcript"
        "test_get_specific_transcript"
        "test_pagination"
        "test_error_handling"
        "test_schema_validation"
    )
    
    for test in "${tests[@]}"; do
        if $test; then
            ((passed++))
        else
            ((failed++))
        fi
        echo ""
    done
    
    # Cleanup
    cleanup
    
    # Summary
    echo "----------------------------------------"
    echo -e "${BLUE}📊 Test Results Summary${NC}"
    echo -e "Passed: ${GREEN}$passed${NC}"
    echo -e "Failed: ${RED}$failed${NC}"
    echo -e "Total:  $((passed + failed))"
    
    if [ $failed -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All tests passed! API is working correctly.${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some tests failed. Please check the API implementation.${NC}"
        exit 1
    fi
}

# Help function
show_help() {
    echo "API Manual Testing Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -u, --url URL  Set base URL (default: http://localhost:3000)"
    echo ""
    echo "Environment Variables:"
    echo "  API_BASE_URL   Base URL for API testing (default: http://localhost:3000)"
    echo ""
    echo "Examples:"
    echo "  $0                           # Test against localhost:3000"
    echo "  $0 -u http://localhost:8080  # Test against localhost:8080"
    echo "  API_BASE_URL=https://api.example.com $0  # Test against production"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check dependencies
if ! command -v curl &> /dev/null; then
    log_error "curl is required but not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed"
    log_info "Install with: apt-get install jq (Ubuntu) or brew install jq (macOS)"
    exit 1
fi

# Run the tests
main