#!/bin/bash

# Proactivity Obsidian Plugin Installation Script
# This script helps you install the plugin with proper symlinks

set -e  # Exit on any error

echo "🧠 Proactivity Obsidian Plugin Installation"
echo "=========================================="

# Check if we're in the right directory
if [[ ! -f "src/obsidian-plugin/manifest.json" ]]; then
    echo "❌ Error: Please run this script from the proactivity project root directory"
    echo "Expected to find: src/obsidian-plugin/manifest.json"
    exit 1
fi

# Build the plugin first
echo "🔨 Building plugin..."
cd src/obsidian-plugin
npm install
npm run build
cd ../..

echo "✅ Plugin built successfully"

# Get user's vault path
echo ""
echo "📁 Please enter the path to your Obsidian vault:"
echo "   Example: /Users/username/Documents/MyVault"
echo "   Example: ~/Documents/ObsidianVault"
read -p "Vault path: " VAULT_PATH

# Expand tilde if present
VAULT_PATH="${VAULT_PATH/#\~/$HOME}"

# Validate vault path
if [[ ! -d "$VAULT_PATH" ]]; then
    echo "❌ Error: Vault directory does not exist: $VAULT_PATH"
    exit 1
fi

# Check if it's actually an Obsidian vault
if [[ ! -d "$VAULT_PATH/.obsidian" ]]; then
    echo "❌ Error: This doesn't appear to be an Obsidian vault (no .obsidian folder found)"
    echo "Make sure you opened this folder in Obsidian at least once."
    exit 1
fi

# Create plugins directory if it doesn't exist
PLUGINS_DIR="$VAULT_PATH/.obsidian/plugins"
mkdir -p "$PLUGINS_DIR"

# Plugin directory
PLUGIN_DIR="$PLUGINS_DIR/proactivity"

# Check if plugin directory already exists
if [[ -d "$PLUGIN_DIR" ]] || [[ -L "$PLUGIN_DIR" ]]; then
    echo ""
    echo "⚠️  Plugin directory already exists: $PLUGIN_DIR"
    read -p "Remove existing installation and reinstall? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$PLUGIN_DIR"
        echo "🗑️  Removed existing plugin directory"
    else
        echo "❌ Installation cancelled"
        exit 1
    fi
fi

# Create absolute path to plugin source
PLUGIN_SOURCE="$(pwd)/src/obsidian-plugin"

# Choose installation method
echo ""
echo "📝 Choose installation method:"
echo "1. Symlink (recommended for development) - changes sync automatically"
echo "2. Copy files (stable) - manual updates needed"
read -p "Enter choice (1 or 2): " -n 1 -r
echo

case $REPLY in
    1)
        echo "🔗 Creating symlink..."
        ln -s "$PLUGIN_SOURCE" "$PLUGIN_DIR"
        echo "✅ Symlink created: $PLUGIN_DIR -> $PLUGIN_SOURCE"
        ;;
    2)
        echo "📋 Copying files..."
        mkdir -p "$PLUGIN_DIR"
        cp "$PLUGIN_SOURCE/main.js" "$PLUGIN_DIR/"
        cp "$PLUGIN_SOURCE/manifest.json" "$PLUGIN_DIR/"
        cp "$PLUGIN_SOURCE/styles.css" "$PLUGIN_DIR/"
        echo "✅ Files copied to: $PLUGIN_DIR"
        ;;
    *)
        echo "❌ Invalid choice. Installation cancelled."
        exit 1
        ;;
esac

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Next steps:"
echo "1. Open Obsidian"
echo "2. Go to Settings (⚙️) → Community plugins"
echo "3. Turn off 'Safe mode' if enabled"
echo "4. Find 'Proactivity' in the list and enable it"
echo "5. Configure your settings in 'Plugin Options' → 'Proactivity'"
echo ""
echo "💡 Tips:"
echo "• Add your OpenAI API key for AI task breakdown"
echo "• Set your current energy level after enabling"
echo "• Use the brain icon (🧠) in the ribbon to access the plugin"
echo ""
echo "🚨 Troubleshooting:"
echo "• If plugin doesn't appear, restart Obsidian"
echo "• Check that Safe mode is disabled"
echo "• Make sure all three files exist in the plugin folder:"
echo "  - main.js"
echo "  - manifest.json"
echo "  - styles.css"
echo ""
echo "Happy productivity! 🧠💪"