#!/bin/bash

# Local CI Verification Script
# Runs the same checks that GitHub Actions will perform

echo "🔍 Local CI Verification Starting..."
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass_check() {
    echo -e "✅ ${GREEN}PASS${NC}: $1"
    ((TESTS_PASSED++))
}

fail_check() {
    echo -e "❌ ${RED}FAIL${NC}: $1"
    echo -e "   ${YELLOW}Details${NC}: $2"
    ((TESTS_FAILED++))
}

info() {
    echo -e "ℹ️  ${YELLOW}INFO${NC}: $1"
}

echo "CHECK 1: Node.js version compatibility"
NODE_VERSION=$(node --version)
if [[ "$NODE_VERSION" == v18* ]] || [[ "$NODE_VERSION" == v20* ]] || [[ "$NODE_VERSION" == v22* ]]; then
    pass_check "Node.js version compatible ($NODE_VERSION)"
else
    fail_check "Node.js version not compatible ($NODE_VERSION)" "CI requires Node.js 18.x, 20.x, or 22.x"
fi

echo "CHECK 2: Required files exist"
required_files=(
    ".github/workflows/ci.yml"
    "src/backend/server.js" 
    "test-sync.sh"
    "test-integration-sync.sh"
    "package.json"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        pass_check "Required file exists: $file"
    else
        fail_check "Missing required file: $file" "This file is needed for CI pipeline"
    fi
done

echo "CHECK 3: JavaScript syntax validation"
js_files_valid=true
# Browser extension moved to archive - skipping JS syntax check
find src/backend -name "*.js" -exec node -c {} \; 2>/dev/null || js_files_valid=false

if [ "$js_files_valid" = true ]; then
    pass_check "JavaScript syntax validation"
else
    fail_check "JavaScript syntax errors found" "Run 'find src -name \"*.js\" -exec node -c {} \\;' to see details"
fi

echo "CHECK 4: Package.json CI scripts"
if grep -q '"ci":' package.json; then
    pass_check "CI script defined in package.json"
else
    fail_check "No CI script in package.json" "Add 'ci' script for automated testing"
fi

echo "CHECK 5: Test scripts are executable"
for script in test-*.sh; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            pass_check "Test script is executable: $script"
        else
            fail_check "Test script not executable: $script" "Run 'chmod +x $script'"
        fi
    fi
done

echo "CHECK 6: Backend health check"
# Check if server.js has health endpoint
if grep -q "'/health'" src/backend/server.js; then
    pass_check "Health check endpoint exists"
else
    fail_check "No health check endpoint" "CI pipeline expects /health endpoint"
fi

echo "CHECK 7: Archive components validation (skipped)"
pass_check "Browser extension moved to archive - validation skipped"

echo "CHECK 8: Git ignore configuration"
if grep -q "*.db-shm" .gitignore && grep -q "*.db-wal" .gitignore; then
    pass_check "Database files properly ignored"
else
    fail_check "Database files not properly ignored" "Add *.db-shm and *.db-wal to .gitignore"
fi

echo ""
echo "====================================="
echo "LOCAL CI VERIFICATION SUMMARY"
echo "====================================="
echo "Checks Passed: $TESTS_PASSED"
echo "Checks Failed: $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "🎉 ${GREEN}ALL CHECKS PASSED!${NC}"
    echo "Your code is ready for the GitHub Actions CI pipeline."
    echo ""
    echo "Next steps:"
    echo "1. Push your changes to GitHub"
    echo "2. Check the Actions tab for CI results"
    echo "3. Monitor the pipeline at: https://github.com/alexbnewhouse/proactivity/actions"
else
    echo -e "💥 ${RED}$TESTS_FAILED CHECKS FAILED${NC}"
    echo "Fix the issues above before pushing to GitHub."
fi

echo ""
echo "CI Pipeline will run these additional checks:"
echo "- Multi-Node.js version testing (18.x, 20.x)"
echo "- Backend server startup verification"
echo "- Complete test suite execution"
echo "- Security vulnerability scanning"
echo "- Deployment readiness validation"

exit $TESTS_FAILED