# Proactivity Quick Start Guide

Get up and running with your ADHD-friendly productivity assistant in minutes!

## 🚀 One-Command Setup

```bash
./setup-dev.sh
```

This script will install all dependencies and set up your development environment.

## 🎯 Immediate Usage Options

### Option 1: Browser Extension Only (Instant)
Perfect for immediate procrastination help and focus tracking:

1. Load the browser extension:
   - Chrome: `chrome://extensions/` → Load unpacked → `src/browser-extension`
   - Firefox: `about:debugging` → Load Temporary Add-on → `src/browser-extension/manifest.json`

2. Start using immediately:
   - Set your current energy level
   - Enable gentle interventions
   - Get ADHD-friendly nudges while browsing

### Option 2: Full Backend + Extension (5 minutes)
For AI-powered task breakdown and cross-device sync:

1. Edit `.env` with your OpenAI API key
2. Run `./start-all.sh`
3. Install browser extension (as above)
4. Access full dashboard at `http://localhost:3000`

### Option 3: Obsidian Integration (Research/Writing)
For dissertation and research work:

1. Copy `src/obsidian-plugin` to your vault's `.obsidian/plugins/proactivity/`
2. Enable the plugin in Obsidian settings
3. Use the brain icon or command palette for ADHD-friendly task management

## 🧠 What You Get Immediately

### Browser Extension Features
- **Procrastination Detection**: Gentle nudges when you're on distracting sites
- **Tab Switching Awareness**: Helpful reminders when rapidly switching tasks
- **Hyperfocus Protection**: Break reminders during extended work sessions
- **Energy Level Tracking**: Match tasks to your current mental state

### Backend Features (when running)
- **AI Task Breakdown**: Turn overwhelming tasks into manageable micro-steps
- **Pattern Recognition**: Learn your ADHD patterns and adapt interventions
- **Cross-Device Sync**: Your focus data syncs across all devices
- **Smart Suggestions**: Context-aware task recommendations

### Obsidian Plugin Features
- **Smart Task Suggestions**: Based on your current notes and energy
- **Writing Session Tracking**: Monitor your dissertation progress
- **ADHD-Friendly Daily Notes**: Structured templates for executive function
- **Pattern Detection**: Notice your productive times and work with them

## ⚡ Quick Commands

```bash
# Start everything
./start-all.sh

# Stop everything
./stop-all.sh

# Test if services are running
./quick-test.sh

# Build Obsidian plugin only
cd src/obsidian-plugin && npm run build
```

## 🎨 Customization

### Energy Levels
- **⚡ High**: Complex tasks, creative work, difficult problem-solving
- **🔋 Moderate**: Regular writing, code review, administrative tasks
- **🪫 Low**: Organization, simple edits, routine tasks
- **😴 Depleted**: Rest time, light reading, self-care

### Intervention Intensity
1. **Gentle Nudges**: Subtle reminders (default)
2. **Active Redirects**: Redirect to task pages
3. **Focus Mode**: Block distracting sites temporarily

## 🚨 Troubleshooting

### Browser Extension Not Working
- Check if manifest.json is valid
- Reload the extension in browser settings
- Check console for errors (F12 → Console)

### Backend Not Starting
- Check if port 3001 is available: `lsof -i :3001`
- Verify Node.js version: `node --version` (need 16+)
- Check .env file has required values

### Obsidian Plugin Issues
- Ensure Obsidian version is 0.15.0+
- Check .obsidian/plugins/proactivity/ exists
- Enable "Community plugins" in settings

## 💡 Pro Tips for ADHD Users

1. **Start Small**: Enable just one intervention type initially
2. **Energy First**: Always set your energy level - it makes everything better
3. **Gentle Mode**: Use the gentlest settings that still help you
4. **Celebrate Wins**: Use the celebration features liberally!
5. **Pattern Awareness**: Pay attention to what the system notices about your patterns

## 🆘 Need Help?

- **Documentation**: Check the `docs/` folder for detailed guides
- **Issues**: Report problems at the GitHub repository
- **ADHD-Specific Support**: Remember that this tool is designed BY and FOR people with ADHD

## 🌟 Remember

This isn't about being "more productive" in a neurotypical sense. It's about working WITH your ADHD brain, not against it. Be patient with yourself, celebrate small wins, and use whatever features actually help you.

You've got this! 🧠💪