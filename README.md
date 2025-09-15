# ProActive PhD

A proactive AI assistant designed specifically for ADHD-focused dissertation writing, with deep Obsidian integration and cutting-edge productivity research implementation.

## Overview

ProActive PhD leverages the latest research in ADHD cognitive behavioral interventions, AI-powered productivity assistance, and academic writing workflow optimization. Unlike traditional productivity apps that require users to remember to use them, ProActive PhD anticipates needs and intervenes proactively.

## Key Features

### 🧠 **Executive Function Augmentation**
- AI-powered task breakdown for overwhelming projects
- Working memory support through visual synthesis
- Cognitive load balancing based on current capacity

### ⚡ **Proactive Task Initiation**
- Context-aware task suggestions based on time, energy, and patterns
- Friction reduction through "next best action" recommendations
- Hyperfocus detection and optimization

### 🎯 **Adaptive Time Architecture**
- Day theming system for consistent work patterns
- Energy-based scheduling aligned with circadian rhythms
- Momentum preservation and procrastination intervention

### 📝 **Deep Obsidian Integration**
- Smart note synthesis and automatic connection creation
- Progress visualization through Tasks plugin integration
- Research workflow automation with Zotero integration

### 🤝 **Behavioral Activation System**
- Virtual body doubling for accountability
- CBT-based cognitive restructuring for avoidance patterns
- Pattern recognition for productivity optimization

## Quick Start

### Backend Setup

1. **Clone and Setup**
```bash
# Clone the repository
git clone https://github.com/alexbnewhouse/proactivity.git
cd proactivity

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

2. **Configure Environment**
Edit `.env` with your settings:
```env
# Required: OpenAI API key for AI task breakdown
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Customize other settings
PORT=3001
NODE_ENV=development
```

3. **Start the Server**
```bash
# Start development server
npm run dev

# Or start just the backend
npm run backend:dev
```

The backend will be available at `http://localhost:3001`

### Obsidian Plugin Installation

#### Method 1: Manual Installation (Recommended for Development)

1. **Copy Plugin Files**
```bash
# Navigate to your Obsidian vault's plugins directory
cd /path/to/your/vault/.obsidian/plugins/

# Create plugin directory
mkdir proactive-phd

# Copy plugin files from this repository
cp -r /path/to/proactivity/src/obsidian-plugin/* proactive-phd/
```

2. **Enable the Plugin**
- Open Obsidian
- Go to Settings → Community Plugins
- Make sure "Safe mode" is OFF
- Find "ProActive PhD" in the list and enable it
- Configure your settings (see Configuration section below)

#### Method 2: Development Setup

1. **Link for Development**
```bash
# From the proactivity repository root
cd src/obsidian-plugin

# Build the plugin (if using TypeScript)
npm run build

# Create symbolic link to your vault
ln -s "$(pwd)" "/path/to/your/vault/.obsidian/plugins/proactive-phd"
```

2. **Hot Reload During Development**
```bash
# Watch for changes and rebuild
npm run dev
```

#### Method 3: BRAT Plugin (Beta Reviewers Auto-update Tool)

1. Install the BRAT plugin from Obsidian's community plugins
2. Add this repository URL: `https://github.com/alexbnewhouse/proactivity`
3. BRAT will automatically install and update the plugin

### Plugin Configuration

After installing the plugin, configure it for optimal ADHD support:

1. **API Configuration**
   - Add your OpenAI API key (same as backend)
   - Set backend server URL: `http://localhost:3001`

2. **ADHD Support Settings**
   - ✅ Enable Proactive Notifications
   - ✅ Enable Pattern Detection
   - ✅ Enable Hyperfocus Protection
   - Set max daily notifications: 8-12 (adjust based on preference)

3. **Obsidian Integration**
   - Set your dissertation folder path (e.g., "Dissertation")
   - Configure daily notes path
   - Enable smart linking and progress tracking

4. **Personalization**
   - Adjust notification timing for your schedule
   - Set your preferred task breakdown depth
   - Configure energy check intervals

## Usage Guide

### Basic Workflow

1. **Set Your Energy Level**: Use the energy buttons or command palette to indicate your current focus capacity
2. **Get Task Suggestions**: The AI will suggest ADHD-friendly tasks based on your energy and context
3. **Break Down Overwhelming Tasks**: Use "Break down current task" command for complex projects
4. **Track Progress**: The plugin automatically tracks your work patterns and celebrates wins

### Out of Office Mode 🏖️

ProActive PhD includes a sophisticated "out of office" system to pause proactive features when you need a break:

#### Quick Modes
- **Vacation Mode**: `Ctrl/Cmd + P` → "Start vacation mode"
  - Pauses all notifications and task suggestions
  - Emergency override available with keyword
  - Auto-resume after specified days

- **Deep Focus Mode**: `Ctrl/Cmd + P` → "Start deep focus mode"
  - Pauses only interrupting notifications
  - Keeps helpful features active
  - Perfect for hyperfocus sessions

- **Sick Day Mode**: Available via API or status bar
  - Gentle pause for health recovery
  - Minimal interruptions

#### Custom Out of Office
Configure your own break modes with:
```javascript
// API call to backend
POST /api/out-of-office/start
{
  "reason": "personal",
  "duration": 48,
  "durationType": "hours",
  "message": "Taking time for family 👨‍👩‍👧‍👦",
  "pauseServices": ["notifications", "patterns"],
  "enableEmergencyMode": true,
  "emergencyKeyword": "URGENT"
}
```

#### Emergency Override
When out of office mode is active with emergency mode enabled:
- Include your emergency keyword (default: "URGENT") in any request
- System temporarily allows the action while maintaining overall break mode
- Perfect for true emergencies without fully disrupting your rest

### Commands Available

| Command | Description | Shortcut |
|---------|-------------|----------|
| Break down current task | AI-powered task breakdown | - |
| Quick energy level check | Assess and update energy | - |
| Start focused work session | 25-minute Pomodoro timer | - |
| Help! I'm procrastinating | Intervention assistance | - |
| Celebrate progress made | Acknowledge accomplishments | - |
| Start vacation mode | Full break from proactive features | - |
| Start deep focus mode | Minimal interruption mode | - |
| End out of office mode | Resume all features | - |

### ADHD-Specific Features

#### Pattern Recognition
The system learns your patterns and provides personalized interventions:
- **Procrastination Detection**: Notices when you're avoiding tasks and offers gentle help
- **Hyperfocus Protection**: Reminds you to take breaks during intense focus sessions
- **Time Blindness Support**: Provides time anchors and realistic estimates
- **Overwhelm Prevention**: Breaks down cognitive load when you're struggling

#### Task Adaptation
Every task suggestion is optimized for ADHD:
- **Granular Steps**: 5-25 minute micro-tasks to reduce initiation friction
- **Energy Matching**: High-energy tasks when you're alert, simple tasks when depleted
- **Motivation Boosters**: Encouraging messages tailored to your current state
- **Executive Function Support**: Clear completion criteria and minimal decision fatigue

## Project Structure

```
src/
├── frontend/          # React/Next.js web application
├── backend/           # Node.js API server with AI integration
├── obsidian-plugin/   # Obsidian plugin for seamless integration
└── shared/            # Shared utilities and types

docs/                  # Documentation and research references
tests/                 # Test suites and fixtures
```

## Research Foundation

This project is built on extensive research in:
- ADHD executive function challenges in academic settings
- Proactive AI assistance for cognitive support
- Academic writing productivity optimization
- Knowledge management systems for research workflows

## Development Roadmap

### Phase 1: MVP (4-6 weeks)
- [x] Project setup and core architecture
- [ ] Basic task breakdown and reminder system
- [ ] Simple Obsidian integration
- [ ] Core notification engine

### Phase 2: Intelligence Layer (6-8 weeks)
- [ ] AI-powered task suggestion engine
- [ ] Productivity pattern recognition
- [ ] Advanced Obsidian workflow automation

### Phase 3: Full Integration (8-10 weeks)
- [ ] Complete research workflow integration
- [ ] Advanced behavioral activation features
- [ ] Comprehensive analytics and progress tracking

### Phase 4: Research & Refinement
- [ ] User studies with ADHD PhD students
- [ ] Iterative improvement based on real-world usage
- [ ] Integration with institutional systems

## Contributing

We welcome contributions from researchers, developers, and ADHD advocates. Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

For support, questions, or feedback, please open an issue or contact our team at [support@proactivephd.com](mailto:support@proactivephd.com).
