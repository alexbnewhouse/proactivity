# Proactivity Sync System Guide

## Overview

The Proactivity ecosystem now features comprehensive bidirectional synchronization between the browser extension and Obsidian plugin. This ensures your tasks, energy levels, focus sessions, and AI-generated breakdowns stay consistent across all platforms.

## How Sync Works

### Architecture
- **Backend Server**: Central hub that stores all data and facilitates sync
- **Browser Extension**: Primary task management interface with full sync capabilities
- **Obsidian Plugin**: Deep integration with your notes and seamless sync

### Data Flow
1. **Create/Update**: Changes made in either platform are queued for sync
2. **Push**: Local changes are sent to the backend server
3. **Pull**: Remote changes from other platforms are retrieved
4. **Merge**: Conflicts are resolved using timestamps and user preferences
5. **Apply**: Changes are applied to local data stores

## What Gets Synced

### ✅ Tasks
- Task titles, descriptions, and statuses
- Due dates, start times, and estimated durations
- AI-generated task breakdowns and micro-steps
- ADHD optimization flags and motivational boosters
- Dependencies and scheduling information

### ✅ Energy Levels
- Current energy status (high, moderate, low, depleted)
- Energy tracking history and patterns
- Context-aware energy suggestions

### ✅ Focus Sessions
- Active focus session status
- Session durations and break schedules
- Focus metrics and productivity patterns

### ✅ AI Task Breakdowns
- Generated micro-tasks and action steps
- Motivational messages and ADHD optimizations
- Completion criteria and complexity ratings

## Setup Instructions

### Browser Extension Setup
1. Install the Proactivity browser extension
2. Open the dashboard and navigate to Settings
3. Ensure "Enable Sync" is turned on
4. Set your preferred sync interval (recommended: 5 minutes)

### Obsidian Plugin Setup
1. Install the Proactivity plugin in Obsidian
2. Go to Settings → Proactivity
3. In "Browser Extension Sync" section:
   - Enable "Browser Extension Sync"
   - Turn on sync for Tasks, Energy Levels, and Focus Sessions
   - Set sync interval (recommended: 5 minutes)
4. Configure your server URL if using a custom backend

### Backend Server (Optional)
For advanced users who want local data control:
```bash
cd proactivity/src/backend
npm start
```
The backend runs on `http://localhost:3001` by default.

## Using the Sync System

### In Browser Extension
- **Dashboard**: View synced tasks from Obsidian
- **AI Helper**: Generated breakdowns sync to Obsidian notes
- **Task Management**: Create, update, and complete tasks
- **Energy Tracking**: Set energy levels that sync to daily notes

### In Obsidian Plugin
- **Command Palette**: "Sync with Browser Extension" for manual sync
- **Status Bar**: Shows sync status (🔄 online, ⏸️ offline)
- **AI Helper**: Cmd+Shift+A generates tasks that sync to extension
- **Settings**: Configure sync preferences and view status

### Manual Sync
- **Browser**: Click sync button in dashboard settings
- **Obsidian**: Use Command Palette → "Sync with Browser Extension"
- **Automatic**: Sync happens every 5 minutes by default

## Conflict Resolution

When the same task is modified in both platforms:

### Timestamp-Based Resolution
- Most recent change wins by default
- Older changes are preserved in conflict log

### Manual Resolution
- Conflicted items appear in both platforms
- User can choose which version to keep
- Merge options available for complex conflicts

### Conflict Examples
```
Conflict: Task "Write Chapter 3"
Local (Obsidian): "Write Chapter 3 - Introduction" (modified 2:30 PM)
Remote (Extension): "Write Chapter 3 - Draft outline first" (modified 2:45 PM)
Resolution: Remote version wins (more recent)
```

## Troubleshooting

### Sync Not Working
1. **Check Connection**: Verify internet connectivity
2. **Backend Status**: Ensure backend server is running (if self-hosted)
3. **Settings**: Confirm sync is enabled in both platforms
4. **Manual Sync**: Try triggering manual sync to test

### Data Inconsistency
1. **Force Sync**: Use manual sync button to push/pull all data
2. **Clear Cache**: Clear browser extension storage and re-sync
3. **Reset**: Disable and re-enable sync in settings

### Performance Issues
1. **Sync Interval**: Increase interval to 10-15 minutes for large datasets
2. **Selective Sync**: Disable sync for less critical data types
3. **Queue Size**: Monitor sync queue size in status display

## Status Indicators

### Browser Extension
- **🟢 Synced**: All changes synchronized
- **🟡 Syncing**: Sync in progress  
- **🔴 Error**: Sync failed, will retry
- **⏸️ Offline**: No internet connection

### Obsidian Plugin
- **🔄**: Online and syncing
- **⏸️**: Offline mode
- **(2)**: Number in parentheses shows queued items

## Advanced Configuration

### Custom Sync Rules
```javascript
// In extension's sync-service.js
const syncConfig = {
  conflictResolution: 'latest_wins', // 'manual', 'local_wins', 'remote_wins'
  retryAttempts: 3,
  syncTimeout: 30000,
  batchSize: 50
};
```

### API Endpoints
The sync system uses these backend endpoints:
- `POST /api/sync/push` - Push local changes
- `GET /api/sync/pull` - Pull remote changes
- `GET /api/sync/status` - Get sync status
- `POST /api/sync/resolve-conflict` - Resolve conflicts

### Local Storage Keys
Browser extension stores sync data in:
- `proactivity_tasks` - Task data
- `proactivity_sync_queue` - Pending changes
- `proactivity_last_sync` - Last sync timestamp

## Best Practices

### For Daily Use
1. **Start with Obsidian**: Use for deep work and planning
2. **Switch to Extension**: Use for task execution and focus sessions
3. **Check Status**: Monitor sync status regularly
4. **Manual Sync**: Trigger before important work sessions

### For Team Collaboration
1. **Shared Backend**: Use single backend server for team
2. **User Separation**: Configure unique user IDs
3. **Conflict Awareness**: Communicate about simultaneous editing

### For Privacy
1. **Local Backend**: Run your own backend server
2. **Selective Sync**: Only sync non-sensitive data
3. **Encryption**: Enable encryption for sensitive tasks

## Pro Tips

### Workflow Integration
- **Morning Routine**: Start in Obsidian for planning, sync to extension for execution
- **AI Breakdowns**: Generate in either platform, access from both
- **Energy Tracking**: Use extension's quick energy buttons, see patterns in Obsidian

### ADHD-Specific Benefits
- **Context Switching**: Seamlessly move between platforms without losing progress
- **Redundancy**: Never lose tasks due to platform crashes or forgotten entries
- **Motivation**: Access AI motivational boosters from anywhere

### Performance Optimization
- **Batch Operations**: Make multiple changes before sync triggers
- **Off-Peak Sync**: Schedule intensive syncs during low-usage periods
- **Network Awareness**: Sync pauses during poor connectivity

## Troubleshooting Common Issues

### "Sync Failed" Message
**Cause**: Network connectivity or backend issues  
**Solution**: Check connection, try manual sync, restart backend if self-hosted

### Duplicate Tasks Appearing
**Cause**: Conflict resolution creating duplicates  
**Solution**: Use "Resolve Conflicts" in settings, merge or delete duplicates

### Slow Sync Performance
**Cause**: Large task lists or frequent syncs  
**Solution**: Increase sync interval, enable selective sync for specific data types

### Missing AI Breakdowns
**Cause**: AI service not accessible during sync  
**Solution**: Ensure OpenAI API key is configured, check backend AI service status

## Support

For additional help:
1. Check the status indicators in both platforms
2. Review sync logs in browser developer console
3. Try disabling and re-enabling sync
4. Restart both applications and trigger manual sync

The Proactivity sync system is designed to be robust and user-friendly, ensuring your productivity workflow remains seamless across all platforms.