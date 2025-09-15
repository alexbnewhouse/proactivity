# ProActive PhD Obsidian Plugin Documentation

## Overview

The ProActive PhD Obsidian plugin provides seamless integration between your knowledge management workflow and ADHD-focused productivity assistance. It brings AI-powered task breakdown, pattern recognition, and proactive support directly into your Obsidian vault.

## Features

### 🧠 ADHD-Aware Interface
- **Energy Level Tracking**: Visual energy indicators with personalized task suggestions
- **Cognitive Load Management**: Simplified interfaces that reduce decision fatigue
- **Progress Celebration**: Built-in acknowledgment of achievements, big and small
- **Gentle Interruptions**: Notifications respect your current focus state

### 📝 Dissertation Integration
- **Smart Task Suggestions**: Context-aware recommendations based on your current notes
- **Progress Tracking**: Automatic logging of writing sessions and breakthroughs
- **Research Workflow**: Seamless integration with literature review and analysis
- **Daily Notes Enhancement**: Structured progress tracking in your daily notes

### 🛡️ Out of Office Mode
- **Vacation Mode**: Complete pause of proactive features for true breaks
- **Deep Focus Mode**: Minimal interruptions during intense work sessions
- **Emergency Override**: Urgent access when needed without breaking your rest
- **Gradual Re-engagement**: Gentle return to full productivity features

## Installation

### Prerequisites
- Obsidian v0.15.0 or higher
- ProActive PhD backend server running (see main README)
- OpenAI API key

### Manual Installation
1. Download the plugin files from the repository
2. Copy to your vault's `.obsidian/plugins/proactive-phd/` directory
3. Enable in Obsidian Settings → Community Plugins
4. Configure your API settings

### BRAT Installation
1. Install the BRAT plugin from Obsidian's community plugins
2. Add this repository: `https://github.com/alexbnewhouse/proactivity`
3. BRAT will handle installation and updates

## Configuration

### Essential Settings

#### API Configuration
```
OpenAI API Key: sk-...
Server URL: http://localhost:3001
```

#### ADHD Support Features
```
✅ Enable Proactive Notifications
✅ Enable Pattern Detection
✅ Enable Hyperfocus Protection
Max Daily Notifications: 8-12
```

#### Obsidian Integration
```
Dissertation Folder: "Dissertation"
Daily Notes Path: "Daily Notes"
Task Tag Prefix: "#proactive-phd"
Enable Smart Linking: ✅
Enable Progress Tracking: ✅
```

### Advanced Configuration

#### Notification Timing
- **Quiet Hours**: Customize when notifications are paused
- **Energy Check Interval**: How often to assess your focus state
- **Procrastination Threshold**: Minutes before offering help

#### Pattern Detection Sensitivity
- **Hyperfocus Warning**: Time before suggesting breaks
- **Task Switching Detection**: Sensitivity to attention jumping
- **Overwhelm Threshold**: Number of open tasks that triggers support

## User Interface

### Main View Panel

The ProActive PhD view appears in your right sidebar and includes:

#### Energy Level Section
- **Visual Energy Buttons**: High ⚡, Moderate 🔋, Low 🪫, Depleted 😴
- **Energy-Based Recommendations**: Contextual suggestions for your current state
- **Smart Task Matching**: Higher cognitive load tasks when you're alert

#### Current Focus Section
- **Focus Input**: What you're working on right now
- **Focus Timer**: Built-in Pomodoro-style sessions
- **Context Tracking**: Automatic logging for pattern recognition

#### Task Suggestions Section
- **AI-Generated Tasks**: Personalized micro-tasks based on your energy and context
- **Template Tasks**: Pre-built task breakdowns for common dissertation activities
- **Refresh Button**: Get new suggestions anytime

#### Progress Tracking Section
- **Daily Progress Bar**: Visual representation of your accomplishments
- **Achievement Stats**: Tasks completed, time focused, words written
- **Celebration Button**: Acknowledge your wins (important for ADHD motivation!)

#### Quick Actions Grid
- **🔨 Break Down Task**: AI-powered task decomposition
- **🤝 Body Doubling**: Virtual accountability partner
- **🧘 Quick Breathing**: Mindfulness exercises for overwhelm
- **📝 Quick Note**: Rapid thought capture
- **🎲 Random Task**: Overcome decision paralysis
- **💡 Motivation Boost**: Encouraging reminders

#### ADHD Support Section
- **Pattern Recognition Display**: Current detected patterns and trends
- **Support Tools**: Procrastination help, time anchors, overwhelm reset
- **Intervention Suggestions**: Contextual support based on your current state

### Command Palette

Access all features via `Ctrl/Cmd + P`:

| Command | Function |
|---------|----------|
| `ProActive PhD: Break down current task` | AI breakdown of selected text or current file |
| `ProActive PhD: Quick energy level check` | Energy assessment modal |
| `ProActive PhD: Start focused work session` | 25-minute Pomodoro timer |
| `ProActive PhD: Help! I'm procrastinating` | Immediate intervention assistance |
| `ProActive PhD: Celebrate progress made` | Progress acknowledgment |
| `ProActive PhD: Start vacation mode` | Full out-of-office mode |
| `ProActive PhD: Start deep focus mode` | Minimal interruption mode |
| `ProActive PhD: End out of office mode` | Resume all features |

### Status Bar Integration

The status bar shows your current state:
- `ProActive: Ready` - All systems operational
- `ProActive: Energy: moderate` - Current energy level
- `ProActive: 🎯 Focusing` - Active focus session
- `ProActive: 🏖️ Vacation Mode` - Out of office active
- `ProActive: 🤝 Body Doubling` - Virtual partner active

## Workflows

### Daily Dissertation Workflow

1. **Morning Setup**
   - Open ProActive PhD panel
   - Set your current energy level
   - Review AI-suggested tasks for the day
   - Choose one micro-task to start

2. **Task Execution**
   - Use "Start focused work session" for timed work
   - Break down overwhelming tasks as needed
   - Track progress in daily notes automatically

3. **Energy Management**
   - Update energy level as it changes
   - Accept suggested breaks during hyperfocus
   - Use quick breathing exercises if overwhelmed

4. **Evening Reflection**
   - Celebrate completed tasks
   - Review patterns detected
   - Plan tomorrow's priorities

### Research Workflow

1. **Literature Review**
   - Use task breakdown for systematic review
   - Track sources in structured notes
   - Use smart linking for connections

2. **Data Analysis**
   - Break analysis into micro-steps
   - Track methodology decisions
   - Document insights as they emerge

3. **Writing Process**
   - Start with outline breakdown
   - Use energy-matched writing tasks
   - Celebrate paragraph/section completions

### Out of Office Workflow

1. **Before Break**
   - Choose appropriate out-of-office mode
   - Set duration and emergency parameters
   - Trust the system to respect your boundaries

2. **During Break**
   - Enjoy reduced interruptions
   - Use emergency override only if truly needed
   - Let your brain rest and recharge

3. **Return Process**
   - Gradual re-engagement with features
   - Welcome back messages and motivation
   - Fresh task suggestions for renewed energy

## Customization

### Daily Note Templates

The plugin can automatically enhance your daily notes:

```markdown
# Daily Note - {{date}}

#proactive-phd/daily-note

## Energy Tracking
<!-- Automatic energy level updates -->

## Current Focus
<!-- Active task tracking -->

## Tasks
<!-- AI-suggested and completed tasks -->

## Progress
<!-- Automatic progress logging -->

## Patterns
<!-- Detected ADHD patterns and interventions -->

## Celebrations
<!-- Achievement acknowledgments -->

## Reflections
<!-- End-of-day insights -->
```

### Custom Task Templates

Create your own task breakdown templates:

```javascript
// In plugin settings
{
  "customTemplates": [
    {
      "name": "Chapter Writing Session",
      "category": "writing",
      "microTasks": [
        {
          "title": "Review chapter outline",
          "estimatedMinutes": 10,
          "complexity": "simple"
        },
        {
          "title": "Write opening paragraph",
          "estimatedMinutes": 20,
          "complexity": "moderate"
        }
      ]
    }
  ]
}
```

### Integration with Other Plugins

#### Tasks Plugin Integration
- Automatic task creation with ADHD-friendly formatting
- Progress tracking via task completion
- Integration with Kanban boards

#### Calendar Plugin Integration
- Energy level scheduling
- Focus session planning
- Break reminders

#### Templater Integration
- Dynamic daily note creation
- Context-aware templates
- Progress tracking automation

## Troubleshooting

### Common Issues

#### Plugin Not Loading
1. Check Obsidian version (minimum 0.15.0)
2. Ensure Safe Mode is disabled
3. Verify plugin files in correct directory
4. Restart Obsidian

#### API Connection Issues
1. Confirm backend server is running (`http://localhost:3001/health`)
2. Check firewall settings
3. Verify API key in settings
4. Test with simple task breakdown

#### Notifications Not Working
1. Check notification permissions in Obsidian
2. Verify max daily notifications setting
3. Ensure not in out-of-office mode
4. Check quiet hours configuration

#### Pattern Detection Not Accurate
1. Allow 3-5 days for initial pattern learning
2. Ensure consistent energy level updates
3. Check behavior data in console
4. Adjust detection sensitivity

### Debug Mode

Enable debug mode in settings for detailed logging:

```javascript
// Console commands for debugging
ProActivePHD.getStatus()
ProActivePHD.getPatterns()
ProActivePHD.testConnection()
ProActivePHD.exportData()
```

### Performance Optimization

For large vaults or slower devices:

1. **Reduce Update Frequency**
   - Increase energy check intervals
   - Lower pattern detection sensitivity
   - Disable real-time progress tracking

2. **Limit Features**
   - Disable smart linking for large vaults
   - Use manual energy updates only
   - Reduce notification frequency

3. **Data Management**
   - Regular cleanup of old daily notes
   - Archive completed task data
   - Optimize vault structure

## Development

### Plugin Architecture

```
src/
├── main.ts                 # Main plugin class
├── proactive-view.ts       # Main UI panel
├── obsidian-integration-service.ts  # Obsidian API integration
├── task-breakdown-modal.ts # Task breakdown interface
├── adhd-pattern-detector.ts # Local pattern detection
└── styles/                 # CSS styles
```

### API Integration

The plugin communicates with the backend via REST API:

```typescript
// Example API call
const response = await fetch(`${this.settings.serverUrl}/api/tasks/breakdown`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    task: 'Write methodology section',
    context: {
      energyLevel: this.currentEnergyLevel,
      availableTime: 60
    }
  })
});
```

### Event System

The plugin uses Obsidian's event system for real-time updates:

```typescript
// Listen for file changes
this.app.vault.on('modify', (file) => {
  this.trackProgress(file);
});

// Pattern detection events
this.patternDetector.on('pattern-detected', (pattern) => {
  this.handlePattern(pattern);
});
```

### Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Follow TypeScript and Obsidian plugin conventions
4. Add tests for new functionality
5. Submit pull request

### Testing

```bash
# Run tests
npm test

# Type checking
npm run type-check

# Build for testing
npm run build

# Hot reload during development
npm run dev
```

## Support

### Getting Help

1. **Documentation**: Check this guide and the main README
2. **GitHub Issues**: Report bugs and request features
3. **Community**: Join discussions in the repository
4. **Email**: Contact support@proactivephd.com for urgent issues

### Feedback

Your feedback helps improve the plugin for all ADHD users:

- **Feature Requests**: What would make your workflow easier?
- **Pattern Accuracy**: Are the detected patterns helpful?
- **UI/UX**: Is the interface intuitive and calming?
- **Performance**: Any lag or slowdowns in your vault?

### Research Participation

Consider participating in our research studies:

- **Usage Analytics**: Anonymous data to improve ADHD support
- **Intervention Effectiveness**: Help validate our approaches
- **User Experience**: Feedback on accessibility and usability

The ProActive PhD plugin is designed by and for people with ADHD. Your experience and insights directly shape its development.