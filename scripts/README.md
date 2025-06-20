# Manual API Testing Scripts

This directory contains scripts and tools for manually testing the Transcript Analysis System API endpoints.

## Files

- `test-api-manual.sh` - Comprehensive API testing script
- `test-data.json` - Sample test data for manual uploads
- `README.md` - This documentation

## Prerequisites

Before running the tests, ensure you have:

1. **Development server running**: `npm run dev`
2. **Required tools installed**:
   - `curl` - For HTTP requests
   - `jq` - For JSON parsing (install with `apt-get install jq` or `brew install jq`)

## Usage

### Basic Testing

Run all API tests against localhost:3000:

```bash
./scripts/test-api-manual.sh
```

### Custom URL Testing

Test against a different URL:

```bash
./scripts/test-api-manual.sh -u http://localhost:8080
```

### Environment Variable

Set base URL via environment variable:

```bash
API_BASE_URL=https://your-api.com ./scripts/test-api-manual.sh
```

### Individual Manual Tests

You can also run individual curl commands for quick testing:

```bash
# List all transcripts
curl -X GET http://localhost:3000/api/transcripts | jq '.'

# Upload a test transcript
curl -X POST http://localhost:3000/api/transcripts \
  -H "Content-Type: application/json" \
  -d @scripts/test-data.json

# Get a specific transcript (replace SOURCE_ID)
curl -X GET http://localhost:3000/api/transcripts/SOURCE_ID | jq '.'

# Test pagination
curl -X GET "http://localhost:3000/api/transcripts?limit=2&cursor=0" | jq '.'
```

## Test Coverage

The automated script tests:

✅ **Server Availability** - Confirms API server is running  
✅ **GET /api/transcripts** - List all transcripts with pagination  
✅ **POST /api/transcripts** - Upload new transcript  
✅ **GET /api/transcripts/[sourceId]** - Retrieve specific transcript  
✅ **Pagination** - Query parameters (limit, cursor)  
✅ **Error Handling** - 404 responses for non-existent resources  
✅ **Schema Validation** - 400 responses for invalid data  
✅ **Response Structure** - Validates JSON structure and required fields  

## Expected Results

When all tests pass, you should see:

```
🎉 All tests passed! API is working correctly.
```

If tests fail, the script will show specific error details to help debug issues.

## Integration with Development Workflow

### When to Run Tests

- After making changes to API endpoints
- Before committing API-related code
- After deploying to new environments
- When debugging frontend-backend integration issues

### Continuous Integration

These scripts can be integrated into CI/CD pipelines:

```bash
# In CI script
npm run dev &
sleep 5  # Wait for server to start
./scripts/test-api-manual.sh
kill %1  # Stop dev server
```

## Troubleshooting

### Common Issues

1. **Server not running**:
   ```
   ❌ Server is not running at http://localhost:3000
   ```
   Solution: Run `npm run dev` first

2. **Missing jq**:
   ```
   ❌ jq is required but not installed
   ```
   Solution: Install with `apt-get install jq` or `brew install jq`

3. **Connection timeout**:
   - Check if server is running on correct port
   - Verify firewall settings
   - Increase timeout in script if needed

### Debug Mode

For verbose output, modify the script to add `-v` flag to curl commands:

```bash
# In test-api-manual.sh, change:
curl -s "$BASE_URL/api/transcripts"
# To:
curl -sv "$BASE_URL/api/transcripts"
```

## Contributing

When adding new API endpoints:

1. Add test functions to `test-api-manual.sh`
2. Update test coverage list in this README
3. Add sample data to `test-data.json` if needed
4. Test the new functionality manually

## Sample Output

```
🚀 Starting API Manual Testing Suite
Testing against: http://localhost:3000
Time: Thu Jun 20 17:15:00 UTC 2025
----------------------------------------

🧪 Testing: Server availability
✅ Server is running at http://localhost:3000

🧪 Testing: GET /api/transcripts - List all transcripts
✅ List endpoint working - Total: 5, Items returned: 5
✅ Items have correct metadata structure

🧪 Testing: POST /api/transcripts - Upload new transcript
✅ Upload successful - sourceId: transcript_1750439342100

🧪 Testing: GET /api/transcripts/[sourceId] - Get specific transcript
✅ Retrieved transcript successfully - Title: API Test Transcript - 1750439342100

🧪 Testing: GET /api/transcripts with pagination parameters
✅ Pagination working - Returned 2 items (≤2 as requested)

🧪 Testing: Error handling for non-existent transcript
✅ Error handling working - Returns 404 with error message

🧪 Testing: POST schema validation with invalid data
✅ Schema validation working - Rejects invalid data with 400

🧪 Testing: Cleaning up test data
ℹ️  Could not delete test transcript transcript_1750439342100 (DELETE endpoint may not be implemented)

----------------------------------------
📊 Test Results Summary
Passed: 7
Failed: 0
Total:  7

🎉 All tests passed! API is working correctly.
```