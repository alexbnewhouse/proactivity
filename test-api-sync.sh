#!/bin/bash

# Test API-based sync approach
echo "🔗 Testing API-Based Sync"
echo "=========================="

# Check if backend is running
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ Backend server not running on port 3001"
    echo "Starting backend server..."
    cd src/backend && npm start &
    BACKEND_PID=$!
    echo "Backend started with PID: $BACKEND_PID"
    sleep 3
else
    echo "✅ Backend server is running"
fi

# Test 1: POST a task from Obsidian
echo ""
echo "📝 Test 1: Creating task via API (simulating Obsidian)"
OBSIDIAN_TASK=$(cat << EOF
{
  "id": "obsidian_$(date +%s)",
  "title": "Complete literature review",
  "description": "Focus on ADHD research papers",
  "estimatedMinutes": 60,
  "completed": false,
  "priority": "high",
  "source": "obsidian",
  "createdAt": "$(date -Iseconds)"
}
EOF
)

TASK_RESPONSE=$(curl -s -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d "$OBSIDIAN_TASK")

if echo "$TASK_RESPONSE" | jq . > /dev/null 2>&1; then
    echo "✅ Task created via API"
    TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '.data.id // .id // "unknown"')
    echo "Task ID: $TASK_ID"
else
    echo "❌ Failed to create task via API"
    echo "Response: $TASK_RESPONSE"
fi

# Test 2: GET all tasks (simulating browser extension)
echo ""
echo "🌐 Test 2: Fetching all tasks via API (simulating browser extension)"
ALL_TASKS=$(curl -s http://localhost:3001/api/tasks)

if echo "$ALL_TASKS" | jq . > /dev/null 2>&1; then
    TASK_COUNT=$(echo "$ALL_TASKS" | jq '.data | length // length // 0')
    echo "✅ Retrieved tasks via API"
    echo "Total tasks: $TASK_COUNT"
    
    if [ "$TASK_COUNT" -gt 0 ]; then
        echo ""
        echo "📋 Recent tasks:"
        echo "$ALL_TASKS" | jq -r '.data[]? // .[]? | select(.title) | "- " + .title + " (" + .source + ")"' | head -3
    fi
else
    echo "❌ Failed to retrieve tasks"
    echo "Response: $ALL_TASKS"
fi

# Test 3: Test sync endpoint
echo ""
echo "🔄 Test 3: Testing sync endpoint"
SYNC_DATA=$(cat << EOF
{
  "source": "obsidian",
  "tasks": [$OBSIDIAN_TASK],
  "timestamp": "$(date -Iseconds)"
}
EOF
)

SYNC_RESPONSE=$(curl -s -X POST http://localhost:3001/api/sync/push \
  -H "Content-Type: application/json" \
  -d "$SYNC_DATA")

if echo "$SYNC_RESPONSE" | jq . > /dev/null 2>&1; then
    echo "✅ Sync endpoint working"
    echo "Response: $(echo "$SYNC_RESPONSE" | jq -c .)"
else
    echo "❓ Sync endpoint response: $SYNC_RESPONSE"
fi

# Cleanup
if [ -n "$BACKEND_PID" ]; then
    echo ""
    echo "🧹 Stopping backend server..."
    kill $BACKEND_PID 2>/dev/null
fi

echo ""
echo "✨ API sync test complete!"
echo ""
echo "If all tests passed, the sync can work via API:"
echo "1. Obsidian plugin POSTs tasks to /api/tasks"
echo "2. Browser extension GETs tasks from /api/tasks"
echo "3. Both use /api/sync/push and /api/sync/pull for coordination"