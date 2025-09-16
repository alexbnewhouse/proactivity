# Dissertation Support Plugin

A minimal Obsidian plugin designed specifically for ADHD-friendly dissertation writing support.

## Features

✅ **Proactive Reminders**: Gentle, configurable reminders that appear every hour (or whatever interval you set) to nudge you to work on your dissertation without requiring you to actively start anything.

✅ **AI-Powered Planning**: Use OpenAI's GPT-4 to break down your dissertation topic into specific, ADHD-friendly micro-tasks and create a structured plan.

✅ **Micro-commitment System**: Reminders offer tiny starts instead of overwhelming asks.

✅ **Minimal Interface**: Everything works through simple notifications and commands - no complex dashboards to manage.

## Installation

1. Copy the plugin files to your Obsidian vault's `.obsidian/plugins/dissertation-support/` directory
2. Enable the plugin in Obsidian's Community Plugins settings
3. Configure your settings (OpenAI API key, dissertation topic, reminder interval)

## Quick Start

1. **Set up your dissertation info**: Go to Settings > Dissertation Support and enter:
   - Your OpenAI API key
   - Your dissertation topic
   - Your deadline (optional)
   - Reminder interval (default: 60 minutes)

2. **Generate your AI plan**: Use the command "Plan my dissertation with AI" or click the brain icon in the ribbon

3. **Let the reminders work**: The plugin will automatically show gentle reminders at your chosen interval

## Commands

- `Plan my dissertation with AI` - Generate a structured dissertation plan using AI
- `Toggle proactive reminders` - Enable/disable automatic reminders

## The Problem This Solves

Traditional productivity apps require you to actively open them and start working - exactly what's hardest for ADHD brains. This plugin brings the nudges to you, right in your writing environment, with gentle reminders that make it easier to just... start.

Instead of "Start a 25-minute pomodoro," you get "Ready for 15 minutes of dissertation work?" or "How about opening your dissertation document?"

## Privacy & Data

- Your API key is stored locally in Obsidian
- AI planning requests go directly to OpenAI - nothing is stored on external servers
- All generated plans are saved as markdown files in your vault
- Reminder data stays local to your Obsidian installation

## Future Enhancements

Based on feedback, potential additions:
- Context preservation (remembering where you left off)
- Daily planning automation
- Progress tracking
- Integration with daily notes

---

Built for ADHD minds who need proactive support, not another app to remember to check.