#!/bin/bash

# Test Obsidian to Extension Sync
echo "🧪 Testing Obsidian → Browser Extension Sync"
echo "============================================="

# Create a test task in shared storage (simulating Obsidian)
cat > /tmp/test_obsidian_task.js << 'EOF'
// Simulate Obsidian creating a task
const task = {
  id: `obsidian_${Date.now()}`,
  title: "Review dissertation methodology section",
  description: "Created from Obsidian AI breakdown",
  estimatedMinutes: 35,
  completed: false,
  priority: "high",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  source: "obsidian",
  syncStatus: "synced",
  adhdOptimized: true,
  motivationBooster: "Breaking this into smaller steps makes it manageable!",
  energyRequired: "moderate",
  complexity: "moderate"
};

// Write to localStorage (simulating cross-platform storage)
if (typeof localStorage !== 'undefined') {
  const existing = localStorage.getItem('proactivity_shared_tasks');
  const tasks = existing ? JSON.parse(existing) : [];
  tasks.unshift(task);
  localStorage.setItem('proactivity_shared_tasks', JSON.stringify(tasks));
  console.log('Task added to shared storage:', task.title);
} else {
  // Node.js environment - write to file
  const fs = require('fs');
  const path = '/tmp/proactivity_shared_tasks.json';
  
  let tasks = [];
  if (fs.existsSync(path)) {
    try {
      tasks = JSON.parse(fs.readFileSync(path, 'utf8'));
    } catch (e) {
      console.warn('Could not read existing tasks');
    }
  }
  
  tasks.unshift(task);
  fs.writeFileSync(path, JSON.stringify(tasks, null, 2));
  console.log('Task written to file:', task.title);
  console.log('Task ID:', task.id);
  console.log('Total tasks:', tasks.length);
}
EOF

# Run the task creation
echo "📝 Creating task from Obsidian..."
node /tmp/test_obsidian_task.js

# Check if file was created
if [ -f "/tmp/proactivity_shared_tasks.json" ]; then
    echo "✅ Shared storage file created"
    TASK_COUNT=$(cat /tmp/proactivity_shared_tasks.json | jq length)
    echo "📊 Tasks in shared storage: $TASK_COUNT"
    
    echo ""
    echo "📋 Task details:"
    cat /tmp/proactivity_shared_tasks.json | jq -r '.[0] | "Title: " + .title + "\nSource: " + .source + "\nPriority: " + .priority'
else
    echo "❌ Shared storage file not created"
fi

echo ""
echo "🔍 Next Steps:"
echo "1. Open browser extension dashboard"
echo "2. Click sync button"
echo "3. Check if Obsidian task appears in task list"
echo "4. Look for task: 'Review dissertation methodology section'"

echo ""
echo "📄 To test manually:"
echo "1. Copy this to browser console in dashboard:"
echo "crossPlatformSync.getAllTasks().then(tasks => console.log('All tasks:', tasks))"
echo ""
echo "2. Or use this test in dashboard:"
echo "crossPlatformSync.getSyncStatus().then(status => console.log('Sync status:', status))"

# Cleanup
rm -f /tmp/test_obsidian_task.js

echo ""
echo "✨ Test setup complete!"
echo "Shared storage is at: /tmp/proactivity_shared_tasks.json"
echo "Open browser extension and click sync to see if it works."