# Installation Guide

## Option 1: Manual Installation (Recommended)

1. **Download the latest release**
   - Go to the [Releases page](https://github.com/alexbnewhouse/proactivity/releases)
   - Download `dissertation-support.zip`

2. **Extract to your vault**
   ```bash
   # Navigate to your Obsidian vault
   cd /path/to/your/vault
   
   # Create plugins directory if it doesn't exist
   mkdir -p .obsidian/plugins
   
   # Extract the plugin
   unzip dissertation-support.zip -d .obsidian/plugins/
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

2. **Required settings:**
   - **OpenAI API Key**: Get from [OpenAI](https://platform.openai.com/api-keys)
   - **Dissertation Topic**: Brief description of your research
   - **Deadline**: Your submission deadline

3. **Optional settings:**
   - **Reminder Interval**: How often to show reminders (default: 60 minutes)
   - **Proactive Reminders**: Toggle on/off (default: enabled)

## First Use

1. **Generate your dissertation plan**
   - Use command: "Plan my dissertation with AI" (Ctrl/Cmd+P)
   - Or click the brain icon 🧠 in the ribbon
   - Wait for AI to generate your structured plan

2. **Let the reminders work**
   - Reminders will start automatically based on your interval
   - You'll see gentle notifications like "Ready for 15 minutes of work?"

## Troubleshooting

### Plugin won't load
- Check that all files are in `.obsidian/plugins/dissertation-support/`
- Restart Obsidian
- Check the console (Ctrl+Shift+I) for error messages

### AI planning fails
- Verify your OpenAI API key is correct
- Check that you have credits in your OpenAI account
- Ensure your dissertation topic is filled in

### No reminders appearing
- Check that "Proactive Reminders" is enabled in settings
- Verify reminder interval is set to a reasonable value (5-120 minutes)
- Restart the plugin: disable and re-enable it

### Need help?
- Open an issue on [GitHub](https://github.com/alexbnewhouse/proactivity/issues)
- Include your Obsidian version and error messages
- Check if others have had similar issues

## Uninstalling

To remove the plugin:
1. Disable it in Settings → Community Plugins
2. Delete the folder: `.obsidian/plugins/dissertation-support/`