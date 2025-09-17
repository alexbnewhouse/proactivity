#!/bin/bash

# Development Auto-Reload Script for Obsidian Plugin
# This script rebuilds the plugin and can trigger Obsidian to reload it

echo "🔨 Building Dissertation Support plugin..."

# Build the plugin
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📁 Plugin files updated at: $(pwd)"
    echo "🔗 Symlinked to: /Users/alexnewhouse/dissertation/.obsidian/plugins/dissertation-support"
    echo ""
    echo "💡 To see changes in Obsidian:"
    echo "   1. Open Command Palette (Cmd+P)"
    echo "   2. Run 'Reload app without saving' or restart Obsidian"
    echo "   3. Or disable/enable the plugin in Settings"
    echo ""
    echo "🚀 Your AI Project Initiation Dialogue is ready!"
    echo "   Command: 'Start New Project (AI Dialogue)'"
else
    echo "❌ Build failed! Check the errors above."
    exit 1
fi