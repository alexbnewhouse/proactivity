# Installing the Proactivity Obsidian Plugin

## Prerequisites

- Obsidian v0.15.0 or higher
- Proactivity backend server running (optional, for full features)

## Installation

### Method 1: Manual Installation

1. Copy the `src/obsidian-plugin` folder to your vault's `.obsidian/plugins/` directory
2. Rename the folder to `proactivity`
3. Enable "Community plugins" in Obsidian Settings
4. Find "Proactivity" in your plugins list and enable it

### Method 2: Development Installation

1. Navigate to your vault's `.obsidian/plugins/` directory
2. Create a symbolic link to the plugin:
   ```bash
   ln -s /path/to/proactivity/src/obsidian-plugin proactivity
   ```
3. Enable the plugin in Obsidian

## Configuration

1. Open Obsidian Settings
2. Navigate to "Community plugins" → "Proactivity"
3. Configure:
   - OpenAI API key (for task breakdown)
   - Backend server URL (if running full Proactivity)
   - ADHD support preferences
   - Notification settings

## Usage

- Click the brain icon in the left ribbon to open the Proactivity panel
- Use Ctrl/Cmd+P to access Proactivity commands
- Let the plugin learn your patterns and provide gentle guidance

The plugin is designed specifically for ADHD brains - it will be gentle, supportive, and respect your focus states! 🧠💚
