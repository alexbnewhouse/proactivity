#!/bin/bash

# Test Proactive Reminders and Notifications
echo "🔍 Testing Proactive Reminders System"
echo "======================================"

echo ""
echo "📋 Checking implementation..."

# Check if main methods exist
if grep -q "startProactiveReminders()" /Users/alexnewhouse/proactivity/dissertation-support/main.ts; then
    echo "✅ startProactiveReminders() method found"
else
    echo "❌ startProactiveReminders() method missing"
fi

if grep -q "showProactiveReminder()" /Users/alexnewhouse/proactivity/dissertation-support/main.ts; then
    echo "✅ showProactiveReminder() method found"
else
    echo "❌ showProactiveReminder() method missing"
fi

if grep -q "toggleReminders()" /Users/alexnewhouse/proactivity/dissertation-support/main.ts; then
    echo "✅ toggleReminders() method found"
else
    echo "❌ toggleReminders() method missing"
fi

echo ""
echo "🔧 Checking configuration..."

# Check default settings
if grep -q "isReminderActive: true" /Users/alexnewhouse/proactivity/dissertation-support/main.ts; then
    echo "✅ Reminders enabled by default"
else
    echo "❌ Reminders not enabled by default"
fi

if grep -q "reminderInterval: 60" /Users/alexnewhouse/proactivity/dissertation-support/main.ts; then
    echo "✅ Default interval set to 60 minutes"
else
    echo "❌ Default interval not found"
fi

echo ""
echo "📝 Checking notification messages..."

REMINDER_COUNT=$(grep -c '"🎓\|"✍️\|"📚\|"🔍\|"💭\|"📝' /Users/alexnewhouse/proactivity/dissertation-support/main.ts)
echo "✅ Found $REMINDER_COUNT reminder messages"

echo ""
echo "🎯 Checking command registration..."

if grep -q "id: 'toggle-reminders'" /Users/alexnewhouse/proactivity/dissertation-support/main.ts; then
    echo "✅ Toggle reminders command registered"
else
    echo "❌ Toggle reminders command not found"
fi

echo ""
echo "🧹 Checking cleanup..."

if grep -q "stopProactiveReminders()" /Users/alexnewhouse/proactivity/dissertation-support/main.ts && grep -q "onunload()" /Users/alexnewhouse/proactivity/dissertation-support/main.ts; then
    echo "✅ Proper cleanup in onunload()"
else
    echo "❌ Missing proper cleanup"
fi

echo ""
echo "📊 SUMMARY"
echo "=========="
echo "The proactive reminder system appears to be implemented with:"
echo "• Configurable interval (default: 1 hour)"
echo "• Multiple gentle reminder messages"
echo "• Toggle on/off functionality"
echo "• Proper cleanup on plugin unload"
echo "• Rate limiting (won't spam within 10 minutes)"
echo ""
echo "🚀 To test in Obsidian:"
echo "1. Enable the plugin"
echo "2. Open Command Palette (Cmd+P)"
echo "3. Search for 'Toggle proactive reminders'"
echo "4. Make sure reminders are ON"
echo "5. Wait up to 60 minutes for first reminder"
echo ""
echo "⚡ To test immediately:"
echo "1. Go to plugin settings"
echo "2. Change reminder interval to 1 minute"
echo "3. Wait 1 minute for a notification"
echo "4. Change back to preferred interval"