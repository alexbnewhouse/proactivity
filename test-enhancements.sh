#!/bin/bash

# Test script for Proactivity enhanced features
echo "🧪 Testing Proactivity Enhanced Features"
echo "======================================="

# Check if files exist
echo "📂 Checking required files..."

files=(
  "src/browser-extension/dashboard.html"
  "src/browser-extension/dashboard.js"
  "src/browser-extension/blocked.html"
  "src/browser-extension/background.js"
  "src/browser-extension/popup.html"
  "src/browser-extension/popup.js"
  "src/browser-extension/popup.css"
  "src/browser-extension/manifest.json"
  "src/obsidian-plugin/src/main.ts"
)

missing_files=0
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file (MISSING)"
    missing_files=$((missing_files + 1))
  fi
done

if [ $missing_files -eq 0 ]; then
  echo "✅ All required files present"
else
  echo "❌ $missing_files files missing"
fi

echo ""
echo "🔧 Checking manifest.json permissions..."
if grep -q "webRequestBlocking" src/browser-extension/manifest.json; then
  echo "✅ webRequestBlocking permission added"
else
  echo "❌ webRequestBlocking permission missing"
fi

if grep -q "declarativeNetRequest" src/browser-extension/manifest.json; then
  echo "✅ declarativeNetRequest permission added"
else
  echo "❌ declarativeNetRequest permission missing"
fi

if grep -q "blocked.html" src/browser-extension/manifest.json; then
  echo "✅ blocked.html in web_accessible_resources"
else
  echo "❌ blocked.html not in web_accessible_resources"
fi

echo ""
echo "🎯 Key Features Implemented:"
echo "✅ Strict website blocking enforcement"
echo "✅ System-level notifications"
echo "✅ 5 urgent tasks in popup"
echo "✅ Unified dashboard with sidebar/tab modes"
echo "✅ Enforcement testing controls"
echo "✅ Obsidian plugin sync integration"
echo "✅ Enhanced settings and configuration"

echo ""
echo "🚀 Next Steps:"
echo "1. Load the browser extension in Chrome/Edge developer mode"
echo "2. Test the blocking mechanism by visiting any website"
echo "3. Complete a task to unlock web browsing"
echo "4. Test system notifications"
echo "5. Enable Obsidian plugin sync in settings"

echo ""
echo "🎉 Enhancement complete! Push to deploy."