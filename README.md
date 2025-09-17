# Dissertation Support – Obsidian Plugin

> An ADHD-friendly academic productivity plugin that transforms overwhelming dissertation projects into manageable, momentum-building workflows.

[![CI/CD Pipeline](https://github.com/alexbnewhouse/proactivity/actions/workflows/ci.yml/badge.svg)](https://github.com/alexbnewhouse/proactivity/actions/workflows/ci.yml)

Built intentionally small. No dashboards. No overwhelm. Just: **plan once → get guided → build momentum → make progress.**

## 🎯 Why This Plugin Exists

If you have ADHD, the hardest part of academic work usually isn't thinking or writing — it's **starting**. Traditional productivity tools wait for you to open them. This plugin does the opposite: it comes to you with gentle, actionable prompts and structured guidance.

Instead of staring at a blank page wondering "where do I even begin?", you get:
- 🤖 **AI-guided project planning** through conversational dialogue  
- 📋 **Academic templates** that break projects into ADHD-friendly phases
- ✅ **Micro-task boards** focused on 5-25 minute chunks
- 📊 **Visual project management** with drag-and-drop Kanban boards
- ⏰ **Proactive reminders** that preserve momentum between sessions

The goal: reduce activation energy and maintain continuity in your academic work.

---

## ✨ Core Features (Phase 2 Complete)

### 🤖 AI Project Initiation Dialogue (ENHANCED!)
**Stop staring at blank pages.** A conversational AI guide asks 5-7 targeted questions about your project, then generates a structured plan with immediate next steps.

**ADHD-friendly design:**
- Plain language, no academic jargon
- Short dialogue sessions (5-10 minutes max)
- Saves progress so you never lose work
- Generates immediately actionable tasks
- **NEW**: Automatic dissertation planning for dissertation projects
- **NEW**: Seamless integration with Kanban boards
- **NEW**: Smart project context detection and API key management

### 📋 Academic Project Templates (6 Pre-Built)
**Pre-structured academic workflows** designed specifically for neurodivergent minds:

- **📚 Dissertation** - Multi-chapter research project
- **📰 Research Paper** - Journal article or conference paper  
- **📝 Research Proposal** - Grant or thesis proposal
- **📖 Dissertation Chapter** - Individual chapter focus
- **🎤 Academic Presentation** - Conference or defense talks
- **🔍 Literature Review** - Systematic research synthesis

**Each template includes:**
- ⏱️ Time estimates for every task (5-25 minute micro-tasks)
- ⚡ Energy level indicators (low/medium/high)
- 🎯 Clear phase progression with checkpoints
- 💡 Built-in ADHD-specific tips and strategies

### 📊 Project Kanban Boards (ENHANCED!)
**Visual project management** with full interactive functionality:

- 🎨 **Drag-and-drop interface** for moving tasks between project phases
- ⚡ **Energy-aware task organization** - match tasks to your current energy level
- ⏱️ **ADHD-friendly time estimation** with optimistic/realistic/pessimistic ranges
- 📈 **Visual progress tracking** with completion percentages and subtask breakdown
- 🚦 **WIP limits** to prevent overwhelm
- 🎯 **Focus views** to reduce cognitive load
- ✅ **Interactive card actions** - edit, complete, link to notes, and delete cards
- 🔗 **Smart project integration** - boards created from project dialogue appear instantly

### ✅ Daily Micro-Task Board  
**Today-focused task management** that prevents backlog hoarding:

- Add tasks via button or command palette
- Cycle status with one click: todo → doing → done
- Drag to reorder; ordering persists for the day
- Tasks live in plugin data, rendered into daily notes
- Each list is per-day and intentionally ephemeral

### 📊 Resume Cards in Daily Notes
**Context preservation** to eliminate "where was I?" moments:

- Automatically captures your last working context
- Shows up in daily notes with quick restart actions
- Includes file links and last paragraph worked on
- Reduces friction between work sessions

### ⏰ Proactive Reminder System
**Gentle nudges** that come to you instead of waiting for you:

- Configurable intervals (default: 60 minutes)
- Randomized, encouraging messages
- Context-aware suggestions
- No shame, no pressure - just momentum

**Example reminders:**
- "🎓 Ready for 15 minutes of work?"
- "✍️ Open the doc and read the last paragraph?"
- "📚 Pick two sources for your lit review?"

---

## 🚀 Quick Start

### Installation
1. **Manual Install**: Copy `dissertation-support/` folder to `.obsidian/plugins/` in your vault
2. **BRAT Install**: Add `alexbnewhouse/proactivity` in BRAT plugin
3. **Enable**: Go to Settings → Community Plugins → Enable "Dissertation Support"

### 5-Minute Setup
1. **Configure Settings**: Settings → Dissertation Support
   - Add OpenAI API Key (required for AI features)
   - Set your dissertation topic (optional - can be set during project creation)
   - Configure reminder interval (default: 60 minutes)
   
2. **Start Your First Project**: 
   - Click the 🧠 brain icon in the ribbon
   - Select "Start New Project"
   - Follow the AI dialogue (5-7 questions)
   - **NEW**: For dissertation projects, AI planning triggers automatically!
   - Choose an academic template and watch your Kanban board populate
   
3. **Build Momentum**:
   - Open the Project Kanban Board (auto-updates with new projects)
   - Use interactive card buttons to edit, complete, and manage tasks
   - Focus on just 2-3 tasks today
   - Let proactive reminders keep you on track

---

## 📱 How to Use

### Daily Workflow
```
🌅 Morning: Check Resume Card in daily note
    ↓
🎯 Pick 2-3 Micro-Tasks from your Kanban board
    ↓  
⚡ Work in 25-minute focus sessions
    ↓
✅ Use card buttons to mark tasks complete and move them visually
    ↓
🎉 Celebrate progress, no matter how small
```

### Main Commands
| Command | What It Does |
|---------|--------------|
| **Start New Project** | Launch AI dialogue for project planning |
| **Show Project Kanban Board** | Open visual project management |
| **Show Welcome Guide** | Access comprehensive feature guide |
| **Plan my dissertation with AI** | Generate structured dissertation plan (auto-created for dissertation projects) |
| **Add Micro Task** | Quick capture for 5-25 minute tasks |
| **Toggle reminders** | Enable/disable proactive nudges |

### Accessing Features
- **🧠 Brain Icon (Ribbon)**: Main menu with all features
- **Command Palette** (`Ctrl/Cmd+P`): Search for any command
- **Right Sidebar**: Kanban Board and Welcome Guide views
- **Daily Notes**: Automatic Resume Cards and Task Boards

---

## ⚙️ Configuration

### Settings Overview
| Setting | Purpose | Default |
|---------|---------|---------|
| **OpenAI API Key** | Required for AI planning features | (empty) |
| **Dissertation Topic** | Context for AI planning | (empty) |
| **Deadline** | Enables timeline calculations | (empty) |
| **Target Word Count** | For pacing suggestions | (empty) |
| **Reminder Interval** | Minutes between gentle nudges | 60 |
| **Plan Output Folder** | Where AI generates plans | (vault root) |

### Privacy & Data
- 🔒 **API Key**: Stored locally only, never shared
- 📝 **Generated Plans**: Markdown files in your vault
- 💾 **Task Data**: Plugin data, synced with vault
- 🌐 **External Calls**: Only OpenAI for planning (optional)
- 📊 **No Analytics**: Nothing tracked or sent anywhere

---

## 🔄 Development Phases

### ✅ Phase 1: Foundation (Complete)
- Basic proactive reminders
- Simple AI planning
- Micro-task management

### ✅ Phase 2: ADHD-Optimized Features (Complete)
- AI Project Initiation Dialogue with smart project detection
- Academic Project Templates (6 pre-built)
- Interactive Visual Kanban Boards with full card management
- Enhanced Welcome Guide and comprehensive testing
- Context preservation and seamless project integration
- Automatic AI planning for dissertation projects

### 🔄 Phase 3: Advanced Academic Features (In Progress)
- Citation management integration
- Academic writing assistance
- Progress analytics and insights
- Collaboration features
- Advanced workflow automation

---

## 🤝 Contributing

This plugin is built by someone with ADHD, for people with ADHD. Contributions welcome, especially from neurodivergent researchers and writers.

**Guidelines:**
- Keep features small and focused
- Minimize cognitive overhead
- Directly support task initiation or continuity
- Test with ADHD users when possible

See `CONTRIBUTING.md` for detailed guidelines.

---

## 📄 License

MIT License - Use it however it helps you write and make progress.

---

## 💝 Support

If this plugin helps you inch forward on your academic work:
- ⭐ **Star the repo** to help others find it
- 🐛 **Report bugs** to keep it stable and useful
- 💡 **Suggest improvements** that support activation and momentum
- 🗣️ **Share your story** - knowing it helps motivates continued development

---

**Built with 🧠 by neurodivergent minds, for neurodivergent minds.**

> *Momentum beats perfection. One paragraph today is a win.*