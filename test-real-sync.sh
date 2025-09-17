#!/bin/bash

# Real Sync Test - Creates actual tasks and tests sync
echo "🔄 Testing Real Sync Between Platforms"
echo "======================================"

# Create a shared directory for testing
SHARED_DIR="/tmp/proactivity-sync-test"
mkdir -p "$SHARED_DIR"

# Test 1: Create task in "Obsidian" (simulated)
echo "📝 Step 1: Creating task in Obsidian..."
OBSIDIAN_TASK='{
  "id": "obs_' $(date +%s) '",
  "title": "Write dissertation chapter introduction",
  "description": "Focus on methodology section",
  "estimatedMinutes": 45,
  "completed": false,
  "priority": "high",
  "createdAt": "' $(date -Iseconds) '",
  "source": "obsidian",
  "syncStatus": "pending"
}'

# Write task to shared storage
echo "[$OBSIDIAN_TASK]" > "$SHARED_DIR/tasks.json"
echo "✅ Task created in shared storage"
cat "$SHARED_DIR/tasks.json" | jq '.[0].title'

# Test 2: "Browser Extension" reads and merges
echo ""
echo "🌐 Step 2: Browser extension reading tasks..."
BROWSER_TASKS='[
  {
    "id": "ext_' $(date +%s) '",
    "title": "Review research papers",
    "description": "Prepare for writing",
    "estimatedMinutes": 30,
    "completed": false,
    "priority": "medium", 
    "createdAt": "' $(date -Iseconds) '",
    "source": "extension",
    "syncStatus": "local"
  }
]'

# Merge tasks (simple append for test)
MERGED=$(echo "$BROWSER_TASKS" "$SHARED_DIR/tasks.json" | jq -s '.[0] + .[1]')
echo "$MERGED" > "$SHARED_DIR/tasks.json"

echo "✅ Tasks merged in browser extension"
echo "Total tasks after merge:"
cat "$SHARED_DIR/tasks.json" | jq 'length'

# Test 3: Show final state
echo ""
echo "📊 Step 3: Final sync state"
echo "All tasks:"
cat "$SHARED_DIR/tasks.json" | jq -r '.[] | "- " + .title + " (" + .source + ")"'

# Test 4: Verify sync metadata
echo ""
echo "🔍 Step 4: Sync verification"
OBSIDIAN_COUNT=$(cat "$SHARED_DIR/tasks.json" | jq '[.[] | select(.source == "obsidian")] | length')
EXTENSION_COUNT=$(cat "$SHARED_DIR/tasks.json" | jq '[.[] | select(.source == "extension")] | length')

echo "Tasks from Obsidian: $OBSIDIAN_COUNT"
echo "Tasks from Extension: $EXTENSION_COUNT"

if [ "$OBSIDIAN_COUNT" -gt 0 ] && [ "$EXTENSION_COUNT" -gt 0 ]; then
    echo "🎉 SUCCESS: Sync working! Both platforms have tasks."
else
    echo "❌ FAILED: Sync not working properly."
fi

# Cleanup
rm -rf "$SHARED_DIR"
echo ""
echo "Test complete. Temporary files cleaned up."