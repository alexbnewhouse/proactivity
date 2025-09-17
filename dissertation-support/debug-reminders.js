// Diagnostic Tool for Proactive Reminders
// Add this to your browser console when Obsidian is running to debug reminders

console.log("🔍 DISSERTATION SUPPORT REMINDER DIAGNOSTICS");
console.log("===========================================");

// Check if plugin is loaded
const plugin = app.plugins.plugins['dissertation-support'];

if (!plugin) {
    console.log("❌ Plugin not found or not loaded");
} else {
    console.log("✅ Plugin found and loaded");
    
    // Check settings
    console.log("\n📋 SETTINGS:");
    console.log("- Reminders active:", plugin.settings.isReminderActive);
    console.log("- Reminder interval:", plugin.settings.reminderInterval, "minutes");
    console.log("- Last reminder time:", new Date(plugin.settings.lastReminderTime).toLocaleString());
    console.log("- Time since last reminder:", 
        Math.floor((Date.now() - plugin.settings.lastReminderTime) / (60 * 1000)), 
        "minutes ago");
    
    // Check if interval is running
    console.log("\n⏰ TIMER STATUS:");
    console.log("- Interval object:", plugin.reminderInterval ? "Active" : "Not active");
    
    // Calculate next reminder time
    if (plugin.settings.isReminderActive) {
        const nextReminder = plugin.settings.lastReminderTime + (plugin.settings.reminderInterval * 60 * 1000);
        const minutesUntilNext = Math.max(0, Math.floor((nextReminder - Date.now()) / (60 * 1000)));
        console.log("- Next reminder in:", minutesUntilNext, "minutes");
        
        if (minutesUntilNext === 0) {
            console.log("- ⚠️  Reminder should trigger soon (within rate limit)");
        }
    }
    
    // Test reminder manually
    console.log("\n🧪 MANUAL TEST:");
    console.log("Run this to test a reminder manually:");
    console.log("app.plugins.plugins['dissertation-support'].showProactiveReminder()");
    
    // Check rate limiting
    const timeSinceLastReminder = Date.now() - plugin.settings.lastReminderTime;
    const rateLimitMinutes = 10;
    const rateLimited = timeSinceLastReminder < (rateLimitMinutes * 60 * 1000);
    
    console.log("\n🚦 RATE LIMITING:");
    console.log("- Rate limited (10min rule):", rateLimited);
    if (rateLimited) {
        const minutesLeft = Math.ceil((rateLimitMinutes * 60 * 1000 - timeSinceLastReminder) / (60 * 1000));
        console.log("- Minutes until rate limit expires:", minutesLeft);
    }
    
    // Recommendations
    console.log("\n💡 RECOMMENDATIONS:");
    if (!plugin.settings.isReminderActive) {
        console.log("- Enable reminders: Run command 'Toggle proactive reminders'");
    }
    if (plugin.settings.reminderInterval > 60) {
        console.log("- Consider shorter interval for testing (current:", plugin.settings.reminderInterval, "min)");
    }
    if (!plugin.reminderInterval) {
        console.log("- Restart reminders: app.plugins.plugins['dissertation-support'].startProactiveReminders()");
    }
    
    console.log("\n🔧 QUICK FIXES:");
    console.log("// Set 1-minute interval for testing:");
    console.log("app.plugins.plugins['dissertation-support'].settings.reminderInterval = 1;");
    console.log("app.plugins.plugins['dissertation-support'].saveSettings();");
    console.log("app.plugins.plugins['dissertation-support'].startProactiveReminders();");
    
    console.log("\n// Trigger immediate reminder (bypasses rate limit):");
    console.log("app.plugins.plugins['dissertation-support'].settings.lastReminderTime = 0;");
    console.log("app.plugins.plugins['dissertation-support'].showProactiveReminder();");
}

console.log("\n" + "=".repeat(50));