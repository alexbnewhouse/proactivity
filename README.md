# Proactivity

A proactive AI assistant designed specifically for ADHD-focused productivity, featuring computer hijacking interventions, comprehensive Obsidian integration, and cutting-edge behavioral research implementation.

## Overview

Proactivity leverages the latest research in ADHD cognitive behavioral interventions, AI-powered productivity assistance, and academic writing workflow optimization. Unlike traditional productivity apps that require users to remember to use them, Proactivity anticipates needs and intervenes proactively with gentle, ADHD-friendly guidance.

## 🚀 Quick Start

**Get started in 30 seconds:**

```bash
# One-command setup
./setup-dev.sh

# Start everything
./start-all.sh
```

See [QUICK_START.md](QUICK_START.md) for detailed setup options.

## 🎯 Three Ways to Use Proactivity

### 1. Browser Extension Only (Immediate Use)
**Perfect for instant procrastination help and focus tracking**

- **Setup**: 30 seconds to load extension in browser
- **Features**: Gentle interventions, tab switching awareness, hyperfocus protection
- **Best for**: Anyone who wants immediate ADHD-friendly browsing guidance

### 2. Full Backend System (5 minutes)
**For AI-powered task breakdown and cross-device sync**

- **Setup**: Run setup script, add API key, start services
- **Features**: Everything + AI task breakdown, pattern learning, dashboard
- **Best for**: Complete productivity management across all devices

### 3. Obsidian Plugin (Research/Writing)
**For dissertation and academic work**

- **Setup**: Copy plugin to vault, enable in settings
- **Features**: Smart note integration, writing progress tracking, research workflows
- **Best for**: Students, researchers, academic writers

## Key Features

### 🧠 **Computer Hijacking & Gentle Interventions**
- **Procrastination Detection**: Notices when you're on distracting sites and offers gentle nudges
- **Tab Switching Awareness**: Helps when you're rapidly jumping between tasks (classic ADHD!)
- **Hyperfocus Protection**: Reminds you to take breaks during extended work sessions
- **Context-Aware Suggestions**: Understands what you're working on and suggests next steps
- **Energy-Matched Tasks**: Only suggests tasks that match your current mental state

### ⚡ **Executive Function Augmentation**
- AI-powered task breakdown for overwhelming projects
- Working memory support through visual synthesis
- Cognitive load balancing based on current capacity
- Smart "next best action" recommendations

### 🎯 **ADHD-Specific Design**
- **Gentle, Non-Judgmental Language**: "Let's refocus" instead of "You're distracted"
- **Micro-Task Breakdown**: 5-25 minute tasks to reduce initiation friction
- **Energy Level Awareness**: High-energy tasks when alert, simple tasks when depleted
- **Pattern Recognition**: Learns your productivity rhythms and works with them

### 📝 **Deep Obsidian Integration**
- Smart note synthesis and automatic connection creation
- Progress visualization and writing session tracking
- Research workflow automation
- ADHD-friendly daily note templates

### 🤝 **Behavioral Support System**
- Virtual body doubling for accountability
- CBT-based cognitive restructuring for avoidance patterns
- Celebration and positive reinforcement features
- Out-of-office modes for genuine rest

## 🌐 Browser Extension Features

### Immediate Interventions
- **Procrastination Sites**: Gentle overlay when you've been on YouTube/Reddit/etc for 5+ minutes
- **Focus Mode**: Block distracting sites during work sessions
- **Tab Chaos Management**: Notice when you're switching tabs rapidly and offer focus help

### Smart Notifications
- **Energy Check-ins**: "How's your energy level right now?"
- **Break Reminders**: After 90+ minutes of continuous work
- **Task Transitions**: "Ready to move to your next planned task?"

### Popup Interface
- **Current Energy Level**: ⚡ High, 🔋 Moderate, 🪫 Low, 😴 Depleted
- **Quick Actions**: Start focus session, view tasks, take break
- **Today's Stats**: Focus time, tab switches, break time
- **Intervention Settings**: Customize which helps you want

## 🧠 Obsidian Plugin Features

### Main Interface Panel
- **Energy-Based Task Suggestions**: Tasks matched to your current mental state
- **AI Task Breakdown**: Turn overwhelming tasks into manageable micro-steps
- **Progress Tracking**: Visual progress bars and achievement stats
- **Quick Actions**: 🔨 Break Down Task, 🤝 Body Doubling, 🧘 Quick Breathing

### Smart Commands (Ctrl/Cmd + P)
- `Proactivity: Break down current task` - AI breakdown of selected text or current file
- `Proactivity: Quick energy level check` - Energy assessment modal
- `Proactivity: Start focused work session` - 25-minute Pomodoro timer
- `Proactivity: Help! I'm procrastinating` - Immediate intervention assistance
- `Proactivity: Celebrate progress made` - Progress acknowledgment

### Pattern Detection
- **Hyperfocus Sessions**: Gentle break reminders after 90+ minutes
- **Procrastination Patterns**: Non-judgmental help when avoiding tasks
- **Task Switching**: Support when jumping between multiple files
- **Energy Rhythms**: Learn your productive times and work with them

### Daily Note Integration
- **ADHD-Friendly Templates**: Structured templates with energy tracking
- **Automatic Progress Logging**: Tasks completed, focus sessions, celebrations
- **Smart Linking**: Connect related notes and ideas automatically

## 📊 Dashboard Features (Full Backend)

### Analytics & Insights
- **Pattern Recognition**: Visual charts of your productivity patterns
- **Energy Tracking**: How your energy levels correlate with productivity
- **Task Completion**: Detailed breakdown of what you accomplished
- **Intervention Effectiveness**: Which types of help work best for you

### Task Management
- **AI-Powered Breakdown**: Turn any overwhelming task into manageable steps
- **Context-Aware Suggestions**: Based on time, energy, and current work
- **Progress Tracking**: Visual progress through complex projects
- **ADHD-Optimized Lists**: Sorted by energy level and complexity

### Behavioral Insights
- **Procrastination Patterns**: When and why you tend to procrastinate
- **Hyperfocus Sessions**: Track your deep work periods
- **Task Switching Analysis**: Understand your attention patterns
- **Success Factors**: What conditions lead to your best work

## 🏖️ Out of Office Mode

Proactivity respects your need for genuine rest with sophisticated break modes:

### Quick Modes
- **Vacation Mode**: Complete pause of all proactive features
- **Deep Focus Mode**: Minimal interruptions during intense work
- **Sick Day Mode**: Gentle pause for health recovery

### Smart Features
- **Emergency Override**: Include "URGENT" keyword for true emergencies
- **Gradual Re-engagement**: Gentle return to productivity features
- **Custom Duration**: Set your own break periods

## 🔧 Installation & Setup

### Method 1: One-Command Setup (Recommended)
```bash
git clone https://github.com/alexbnewhouse/proactivity.git
cd proactivity
./setup-dev.sh
```

### Method 2: Browser Extension Only
1. Open Chrome/Firefox
2. Go to extensions page (chrome://extensions/ or about:debugging)
3. Enable Developer Mode
4. Load unpacked: `src/browser-extension` folder
5. Start using immediately!

### Method 3: Obsidian Plugin Only
1. Copy `src/obsidian-plugin` to `.obsidian/plugins/proactivity/`
2. Enable in Obsidian Settings → Community Plugins
3. Configure with your preferences

### Method 4: Manual Setup
```bash
# Install dependencies
npm install
cd src/backend && npm install
cd ../frontend && npm install
cd ../obsidian-plugin && npm install

# Configure environment
cp .env.example .env
# Edit .env with your OpenAI API key

# Start services
./start-all.sh
```

## ⚙️ Configuration

### Environment Variables (.env)
```env
# Required: OpenAI API key for AI task breakdown
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Customize ports and settings
PORT=3001
FRONTEND_PORT=3000
NODE_ENV=development

# Optional: Database connection (if using advanced features)
DATABASE_URL=your_database_url_here
```

### Browser Extension Settings
- **Intervention Types**: Choose which interventions help you
- **Timing**: Adjust how quickly interventions trigger
- **Energy Levels**: Set your default energy patterns
- **Backend Integration**: Connect to your Proactivity server

### Obsidian Plugin Settings
- **API Configuration**: OpenAI key and backend URL
- **ADHD Support**: Notification preferences and intervention intensity
- **Vault Integration**: Folder paths and tag preferences
- **Pattern Detection**: Sensitivity and learning settings

## 🎯 Using the System

### Daily Workflow
1. **Morning Setup**: Set energy level, review AI-suggested tasks
2. **Work Sessions**: Use focus timer, accept gentle interventions
3. **Energy Management**: Update energy level as it changes throughout day
4. **Evening Reflection**: Celebrate accomplishments, review patterns

### Energy Level Guide
- **⚡ High**: Complex writing, creative work, difficult problem-solving
- **🔋 Moderate**: Regular writing, code review, administrative tasks
- **🪫 Low**: Organization, simple edits, routine tasks
- **😴 Depleted**: Rest time, light reading, self-care

### Intervention Philosophy
- **Gentle First**: Starts with subtle hints and suggestions
- **Escalating Support**: Increases help if needed, but always respectful
- **User Agency**: Easy opt-out, snooze, or customize options
- **ADHD-Informed**: Designed by and for people with ADHD

## 📁 Project Structure

```
proactivity/
├── src/
│   ├── browser-extension/    # Chrome/Firefox extension for computer hijacking
│   │   ├── manifest.json     # Extension configuration
│   │   ├── background.js     # Service worker for pattern detection
│   │   ├── content.js        # Injection script for interventions
│   │   └── popup.html        # Extension popup interface
│   ├── backend/              # Node.js API server with AI integration
│   │   ├── server.js         # Main server file
│   │   ├── routes/           # API endpoints
│   │   └── services/         # Business logic and AI integration
│   ├── frontend/             # React web dashboard
│   │   ├── src/components/   # UI components
│   │   └── src/pages/        # Dashboard pages
│   ├── obsidian-plugin/      # Full-featured Obsidian plugin
│   │   ├── src/              # TypeScript source files
│   │   ├── manifest.json     # Plugin configuration
│   │   └── styles.css        # ADHD-friendly styling
│   └── shared/               # Shared utilities and types
├── docs/                     # Documentation
│   ├── COMPUTER_HIJACKING_PLAN.md  # Technical implementation details
│   ├── API.md                # API documentation
│   └── DEVELOPMENT.md        # Development guide
├── setup-dev.sh             # One-command setup script
├── QUICK_START.md            # Quick start guide
└── README.md                 # This file
```

## 🔬 Research Foundation

This project is built on extensive research in:
- ADHD executive function challenges in academic and professional settings
- Proactive AI assistance for cognitive support
- Behavioral intervention timing and effectiveness
- Computer-mediated productivity support systems
- Gentle interruption and notification design

## 🛣️ Development Roadmap

### Phase 1: Core Platform ✅
- [x] Browser extension with gentle interventions
- [x] Complete Obsidian plugin with AI integration
- [x] Backend API with pattern recognition
- [x] One-command setup and deployment

### Phase 2: Enhanced Intelligence (Next 2-4 weeks)
- [ ] Machine learning for personalized intervention timing
- [ ] Advanced pattern recognition and prediction
- [ ] Calendar and email integration for context awareness
- [ ] Mobile companion app for cross-device sync

### Phase 3: Ecosystem Integration (Month 2)
- [ ] Slack/Discord integration for body doubling
- [ ] Google Workspace / Microsoft 365 integration
- [ ] Notion/Todoist/Things integration
- [ ] Health app integration (sleep, exercise data)

### Phase 4: Research & Refinement (Ongoing)
- [ ] User studies with ADHD community
- [ ] Efficacy research and intervention optimization
- [ ] Academic publication of findings
- [ ] Community plugin marketplace

## 📈 Success Metrics

The system tracks (anonymously and privately):
- **Intervention Effectiveness**: How often gentle nudges help vs. annoy
- **Task Completion Rates**: Before and after using the system
- **Procrastination Reduction**: Time spent on distracting vs. productive activities
- **Focus Session Quality**: Duration and satisfaction with work sessions
- **User Satisfaction**: Qualitative feedback on ADHD support quality

## 🤝 Contributing

We welcome contributions from:
- **ADHD Community**: Your lived experience shapes the design
- **Developers**: Help improve the technical implementation
- **Researchers**: Contribute to the evidence base
- **UX Designers**: Make the interface even more ADHD-friendly

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details.

## 🔒 Privacy & Security

Proactivity is designed with privacy as a core principle:
- **Local-First Processing**: Sensitive data processed on your device when possible
- **Encrypted Sync**: End-to-end encryption for cloud synchronization
- **Minimal Data Collection**: Only collect what's necessary for the features to work
- **Full Data Control**: Export and delete your data anytime
- **Transparent Analytics**: Clear disclosure of any anonymized usage data

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

## 💬 Support & Community

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Share experiences and ask questions
- **ADHD Community**: Connect with other users on Reddit r/ADHD
- **Email Support**: For private matters, contact through GitHub

## 🌟 Acknowledgments

Built with love by and for the ADHD community. Special thanks to:
- ADHD researchers whose work informed the design
- Beta testers who provided invaluable feedback
- The Obsidian community for plugin development support
- Everyone who shared their productivity struggles and successes

---

**Remember**: This tool is designed to work *with* your ADHD brain, not against it. Be patient with yourself, celebrate small wins, and use whatever features actually help you. You've got this! 🧠💪