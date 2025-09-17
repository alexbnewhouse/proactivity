#!/bin/bash

# Integration Test: Extension → Backend → Pull Verification
# Tests the complete flow of adding a task via extension and verifying it appears via API

echo "🧪 Proactivity Integration Test Suite Starting..."
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=6

# Helper functions
pass_test() {
    echo -e "✅ ${GREEN}PASS${NC}: $1"
    ((TESTS_PASSED++))
}

fail_test() {
    echo -e "❌ ${RED}FAIL${NC}: $1"
    echo -e "   ${YELLOW}Details${NC}: $2"
    ((TESTS_FAILED++))
}

info() {
    echo -e "ℹ️  ${YELLOW}INFO${NC}: $1"
}

# Test setup
TEST_TASK_TITLE="Integration Test Task $(date +%s)"
TEST_TASK_ID=$(date +%s)
BACKEND_URL="http://localhost:3001"
TEST_SOURCE="integration_test"

echo "TEST 1: Backend server accessibility"
if curl -s "${BACKEND_URL}/health" > /dev/null 2>&1; then
    pass_test "Backend server is running"
else
    fail_test "Backend server not accessible" "Make sure 'node server.js' is running"
fi

echo "TEST 2: Backend sync endpoints availability"
status_code=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/sync/status")
if [ "$status_code" = "200" ]; then
    pass_test "Sync status endpoint accessible"
else
    fail_test "Sync status endpoint returned $status_code" "Expected 200"
fi

echo "TEST 3: Push a test task to backend"
push_response=$(curl -s -X POST "${BACKEND_URL}/api/sync/push" \
    -H "Content-Type: application/json" \
    -d "{
        \"source\": \"${TEST_SOURCE}\",
        \"tasks\": [{
            \"id\": ${TEST_TASK_ID},
            \"title\": \"${TEST_TASK_TITLE}\",
            \"description\": \"Test task created by integration test\",
            \"priority\": \"high\",
            \"completed\": false,
            \"estimatedMinutes\": 15,
            \"actualMinutes\": 0,
            \"createdAt\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",
            \"updatedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"
        }],
        \"timestamp\": $(date +%s000)
    }")

if echo "$push_response" | grep -q '"success":true'; then
    pass_test "Successfully pushed test task to backend"
    info "Push response: $(echo "$push_response" | jq -c '.')"
else
    fail_test "Failed to push test task" "Response: $push_response"
fi

echo "TEST 4: Verify task appears in pull endpoint (from different source)"
sleep 1 # Give DB a moment to process
# Pull from a different source to see our pushed task
pull_response=$(curl -s "${BACKEND_URL}/api/sync/pull?source=different_source")

if echo "$pull_response" | grep -q "\"${TEST_TASK_TITLE}\""; then
    pass_test "Test task found in pull response"
    info "Task successfully synced and retrievable from different source"
else
    fail_test "Test task not found in pull response" "Response: $(echo "$pull_response" | jq -c '.data | length') tasks returned"
fi

echo "TEST 5: Verify task data integrity"
task_data=$(echo "$pull_response" | jq -r ".data[] | select(.title==\"${TEST_TASK_TITLE}\")")
if [ -n "$task_data" ]; then
    task_priority=$(echo "$task_data" | jq -r '.priority')
    task_completed=$(echo "$task_data" | jq -r '.completed')
    task_minutes=$(echo "$task_data" | jq -r '.estimatedMinutes')
    
    if [ "$task_priority" = "high" ] && [ "$task_completed" = "false" ] && [ "$task_minutes" = "15" ]; then
        pass_test "Task data integrity verified"
        info "Priority: $task_priority, Completed: $task_completed, Minutes: $task_minutes"
    else
        fail_test "Task data integrity failed" "Expected: priority=high, completed=false, minutes=15. Got: priority=$task_priority, completed=$task_completed, minutes=$task_minutes"
    fi
else
    fail_test "Could not extract task data for integrity check" "No matching task found in response"
fi

echo "TEST 6: Clean up test data"
cleanup_response=$(curl -s -X DELETE "${BACKEND_URL}/api/sync/clear" \
    -H "Content-Type: application/json" \
    -d "{
        \"source\": \"${TEST_SOURCE}\",
        \"confirm\": \"CLEAR_SYNC_DATA\"
    }")

if echo "$cleanup_response" | grep -q '"success":true'; then
    pass_test "Successfully cleaned up test data"
else
    fail_test "Failed to clean up test data" "Response: $cleanup_response"
fi

# Summary
echo ""
echo "========================================="
echo "INTEGRATION TEST RESULTS SUMMARY"
echo "========================================="
echo "Tests Run: $TOTAL_TESTS"
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "🎉 ${GREEN}ALL INTEGRATION TESTS PASSED!${NC}"
    echo "Extension → Backend → Pull sync flow is working correctly."
else
    echo -e "💥 ${RED}$TESTS_FAILED TESTS FAILED${NC}"
    echo "Check the failure details above and fix issues before proceeding."
fi

echo ""
echo "========================================="
echo "INTEGRATION TEST SCENARIOS VERIFIED"
echo "========================================="
echo "✓ Backend service availability"
echo "✓ Sync API endpoint accessibility"
echo "✓ Task push to backend (/api/sync/push)"
echo "✓ Task retrieval from backend (/api/sync/pull)"
echo "✓ Task data field mapping and integrity"
echo "✓ Test data cleanup"

echo ""
echo "Next steps for production:"
echo "1. Run this test periodically in CI/CD"
echo "2. Extend test to include conflict resolution"
echo "3. Add tests for Obsidian plugin integration"
echo "4. Monitor sync performance under load"
echo ""

# Exit with appropriate code
if [ $TESTS_FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi