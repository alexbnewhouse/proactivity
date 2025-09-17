# Installation Guide

## Option 1: Manual Installation (Recommended)

1. **Download the plugin**
   - Clone or download this repository
   - Navigate to the `dissertation-support/` folder

2. **Copy to your vault**
   ```bash
   # Navigate to your Obsidian vault
   cd /path/to/your/vault
   
   # Create plugins directory if it doesn't exist
   mkdir -p .obsidian/plugins
   
   # Copy the dissertation-support folder
   cp -r /path/to/proactivity/dissertation-support .obsidian/plugins/
   ```

3. **Enable the plugin**
   - Open Obsidian
   - Go to Settings → Community Plugins
   - Find "Dissertation Support" and enable it

## Option 2: BRAT Installation

1. **Install BRAT plugin** (if you don't have it)
   - Go to Settings → Community Plugins → Browse
   - Search for "BRAT" and install it

2. **Add this plugin via BRAT**
   - Open BRAT settings
   - Click "Add Beta Plugin"
   - Enter: `alexbnewhouse/proactivity`
   - Click "Add Plugin"

3. **Enable the plugin**
   - Go to Settings → Community Plugins
   - Find "Dissertation Support" and enable it

## Configuration

After installation, configure the plugin:

1. **Go to Settings → Dissertation Support**

2. **Essential settings:**
   - **OpenAI API Key**: Required for AI features - get from [OpenAI](https://platform.openai.com/api-keys)
   - **Dissertation Topic**: Brief description of your research project

3. **Optional settings:**
   - **Deadline**: Your submission deadline (enables timeline features)
   - **Target Word Count**: For pacing calculations
   - **Reminder Interval**: How often to show gentle nudges (default: 60 minutes)
   - **Plan Output Folder**: Where AI generates plans (default: vault root)

## First Use

1. **Start your first project**
   - Click the 🧠 brain icon in the ribbon
   - Select "Start New Project"
   - Answer 5-7 conversational questions
   - Choose an academic template (optional)

2. **Explore the features**
   - **Project Kanban Board**: Visual project management
   - **Welcome Guide**: Comprehensive feature documentation
   - **Daily Notes**: Check for automatic Resume Cards and Task Boards

3. **Let reminders guide you**
   - Gentle notifications will appear based on your interval
   - Examples: "Ready for 15 minutes of work?" or "Check your progress?"
## Troubleshooting

### Plugin won't load
- Check that all files are in `.obsidian/plugins/dissertation-support/`
- Restart Obsidian completely
- Check the console (Ctrl/Cmd+Shift+I) for error messages

### AI features not working
- Verify your OpenAI API key is correct and active
- Check that you have credits in your OpenAI account
- Ensure your dissertation topic is filled in the settings

### No reminders appearing
- Check that "Proactive Reminders" is enabled in plugin settings
- Verify reminder interval is reasonable (5-120 minutes)
- Restart the plugin: disable and re-enable it

### Kanban Board not loading
- Try clicking "Start Your First Board" to create a demo board
- Check the console for JavaScript errors
- Ensure the plugin is fully enabled and loaded

### Task Board not showing in daily notes
- Make sure you have a daily note for today
- The task board appears automatically - look for the HTML block
- Try running "Add Micro Task" command to initialize it

### Need help?
- Open an issue on [GitHub](https://github.com/alexbnewhouse/proactivity/issues)
- Include your Obsidian version, plugin version, and error messages
- Check existing issues for similar problems

## Features Overview

Once installed, you'll have access to:

- **🤖 AI Project Dialogue**: Conversational project planning
- **📋 Academic Templates**: 6 pre-built project types
- **📊 Kanban Boards**: Visual project management
- **✅ Micro-Task Boards**: Daily focus with 5-25 minute tasks
- **⏰ Proactive Reminders**: Gentle momentum-building nudges
- **📖 Welcome Guide**: Complete feature documentation

## Uninstalling

To remove the plugin:
1. Disable it in Settings → Community Plugins
2. Delete the folder: `.obsidian/plugins/dissertation-support/`
3. Your generated plans and notes will remain in your vault