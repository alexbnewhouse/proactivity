# Proactivity Obsidian Plugin Installation and Usage Guide

## Overview

The Proactivity Obsidian plugin is an AI-powered ADHD-friendly assistant designed specifically for dissertation writing and academic work. It provides intelligent task breakdown, energy-aware scheduling, and gentle interventions to help you stay focused and productive.

## Features

- **🧠 AI Task Breakdown**: Turn overwhelming tasks into manageable micro-steps
- **⚡ Energy-Based Scheduling**: Get task suggestions that match your current energy level  
- **🎯 Smart Focus Sessions**: Pomodoro-style timers with ADHD accommodations
- **📊 Pattern Detection**: Learn your productivity rhythms and work with them
- **🤗 Gentle Interventions**: Non-judgmental support when procrastinating or hyperfocusing
- **📝 Daily Note Integration**: Seamlessly track tasks and progress in your vault
- **🔄 Backend Sync**: Optional cloud sync with local fallback mode

## Installation

### Method 1: Quick Install (Recommended)

1. **Copy Plugin Files**
   ```bash
   # Navigate to your Obsidian vault
   cd /path/to/your/vault/.obsidian/plugins/
   
   # Create the plugin directory
   mkdir -p proactivity
   
   # Copy the plugin files
   cp /path/to/proactivity/src/obsidian-plugin/main.js proactivity/
   cp /path/to/proactivity/src/obsidian-plugin/manifest.json proactivity/
   cp /path/to/proactivity/src/obsidian-plugin/styles.css proactivity/
   ```

2. **Enable Plugin in Obsidian**
   - Open Obsidian Settings (⚙️)
   - Go to Community Plugins
   - Turn off Safe Mode if it's enabled
   - Find "Proactivity" in the list and enable it
   - Configure your preferences in Plugin Options → Proactivity

### Method 2: Development Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/alexbnewhouse/proactivity.git
   cd proactivity/src/obsidian-plugin
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build Plugin**
   ```bash
   npm run build
   ```

4. **Link to Obsidian**
   ```bash
   # Create symlink to your Obsidian plugins folder
   ln -s $(pwd) "/path/to/your/vault/.obsidian/plugins/proactivity"
   ```

## Backend Setup (Optional but Recommended)

For full AI functionality, set up the backend server:

1. **Install Backend**
   ```bash
   cd proactivity/src/backend
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp ../../.env.example .env
   # Edit .env and add your OpenAI API key:
   echo "OPENAI_API_KEY=your_openai_api_key_here" >> .env
   ```

3. **Start Backend**
   ```bash
   npm start
   ```
   
   The backend will run on `http://localhost:3002`

## Configuration

### Basic Settings

1. **API Configuration**
   - **OpenAI API Key**: For AI-powered task breakdown
   - **Server URL**: Backend server URL (default: `http://localhost:3002`)

2. **ADHD Support Features**
   - **Proactive Notifications**: Gentle check-ins and suggestions
   - **Pattern Detection**: Learn from your work patterns
   - **Hyperfocus Protection**: Break reminders during long sessions
   - **Max Daily Notifications**: Prevent overwhelm (default: 12)

3. **Obsidian Integration**
   - **Dissertation Folder**: Path to your dissertation notes
   - **Daily Note Path**: Where to store daily task tracking
   - **Task Tag Prefix**: Tag for organizing Proactivity-related content

### Advanced Settings

- **Energy Check Interval**: How often to prompt for energy level updates
- **Procrastination Threshold**: Minutes of inactivity before intervention
- **Default Breakdown Depth**: How detailed to make task breakdowns
- **Smart Linking**: Automatically connect related notes

## Usage Guide

### Getting Started

1. **Open Proactivity Panel**
   - Click the brain icon (🧠) in the ribbon
   - Or use Command Palette: "Proactivity"

2. **Set Your Energy Level**
   - Choose from High ⚡, Moderate 🔋, Low 🪫, or Depleted 😴
   - This affects task suggestions and breakdown complexity

3. **Get Task Suggestions**
   - View personalized suggestions based on your energy
   - Click "▶️ Start" to begin a task
   - Click "🔨 Break Down" to get detailed steps

### Key Features

#### Task Breakdown
- **Command**: `Proactivity: Break down current task`
- **Usage**: Select text or have a file open, then run the command
- **Result**: Get 3-8 ADHD-friendly micro-steps with time estimates

#### Energy Management
- **Command**: `Proactivity: Quick energy level check`
- **Purpose**: Update your current energy for better task matching
- **Tracking**: Automatically logged in daily notes

#### Focus Sessions
- **Command**: `Proactivity: Start focused work session`
- **Duration**: 25 minutes with ADHD accommodations
- **Features**: Gentle check-ins, break reminders, progress tracking

#### Emergency Support
- **Command**: `Proactivity: Help! I'm procrastinating`
- **Response**: Immediate task breakdown and motivation
- **Body Doubling**: Virtual accountability mode

#### Progress Celebration
- **Command**: `Proactivity: Celebrate progress made`
- **Purpose**: Acknowledge achievements and build positive patterns
- **Tracking**: Logged for pattern recognition

### Daily Workflow

1. **Morning Setup**
   - Open Proactivity panel
   - Set current energy level
   - Review AI-suggested tasks for the day

2. **Work Sessions**
   - Use focus timer for structured work
   - Accept gentle interventions when helpful
   - Break down overwhelming tasks immediately

3. **Energy Management**
   - Update energy level as it changes
   - Switch to appropriate tasks for your current state
   - Take breaks when suggested

4. **Evening Reflection**
   - Celebrate completed tasks
   - Review productivity patterns
   - Set intentions for tomorrow

## Troubleshooting

### Plugin Not Loading
- Check that all files (main.js, manifest.json, styles.css) are in the plugin folder
- Verify Safe Mode is disabled in Community Plugins
- Restart Obsidian after installation

### Backend Connection Issues
- **Message**: "Backend offline - using local mode"
- **Solution**: Start the backend server on port 3002
- **Alternative**: Plugin works in offline mode with reduced functionality

### Task Breakdown Not Working
- **Check**: OpenAI API key in backend .env file
- **Fallback**: Plugin provides rule-based breakdowns without AI
- **Network**: Ensure backend is accessible

### Daily Notes Not Created
- **Check**: Daily Notes path in plugin settings
- **Create**: Folder structure manually if needed
- **Permissions**: Ensure Obsidian can write to the directory

## Advanced Usage

### Custom Task Templates

Create your own task breakdown templates by modifying the backend:

```javascript
// In src/backend/routes/taskRoutes.js
const customTemplate = {
  id: 'my_template',
  name: 'My Custom Template',
  category: 'research',
  microTasks: [
    // Your custom steps
  ]
};
```

### Integration with Other Plugins

- **Daily Notes**: Automatically integrates with daily notes
- **Calendar**: Use with calendar plugins for time-blocking
- **Tasks**: Compatible with task management plugins
- **Templater**: Use templates for consistent daily note structure

### API Integration

Access backend API directly:

```javascript
// Get task suggestions
fetch('http://localhost:3002/api/tasks/suggestions?energyLevel=moderate')

// Break down task
fetch('http://localhost:3002/api/tasks/breakdown', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ task: 'Your task here' })
});
```

## Privacy and Data

- **Local First**: Core functionality works entirely offline
- **Optional Sync**: Backend connection is optional for AI features
- **No Tracking**: No analytics or user data collection
- **Your Data**: All notes and tasks remain in your vault
- **API Calls**: Only OpenAI API calls when using AI features

## Support and Community

- **Issues**: Report bugs on GitHub
- **Feature Requests**: Open discussions on GitHub
- **ADHD Community**: Share experiences and tips
- **Documentation**: Check docs/ folder for detailed guides

## Credits

Built with love by and for the ADHD academic community. Special thanks to:
- ADHD researchers whose work informed the design
- Beta testers who provided invaluable feedback
- The Obsidian community for plugin development support
- Everyone who shared their productivity struggles and successes

---

**Remember**: This tool is designed to work *with* your ADHD brain, not against it. Be patient with yourself, celebrate small wins, and use whatever features actually help you. You've got this! 🧠💪