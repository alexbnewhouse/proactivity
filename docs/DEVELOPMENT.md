# Proactivity Development Guide

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Git
- OpenAI API key
- Obsidian (for plugin development)

### Development Environment Setup

1. **Clone Repository**
```bash
git clone https://github.com/alexbnewhouse/proactivity.git
cd proactivity
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your OpenAI API key and preferences
```

3. **Start Development Servers**
```bash
# Terminal 1: Backend development server
npm run backend:dev

# Terminal 2: Frontend development (if building web UI)
npm run frontend:dev

# Terminal 3: Obsidian plugin development
cd src/obsidian-plugin
npm run dev
```

## Project Architecture

### Overview

Proactivity follows a modular architecture designed for maintainability and ADHD-friendly development:

```
src/
├── backend/           # Node.js API server
│   ├── services/      # Core business logic
│   ├── routes/        # API endpoints
│   ├── middleware/    # Express middleware
│   └── utils/         # Helper functions
├── frontend/          # Web interface (future)
├── obsidian-plugin/   # Obsidian integration
├── shared/            # Common types and utilities
└── tests/             # Test suites
```

### Design Principles

#### ADHD-Friendly Development
- **Clear Separation of Concerns**: Each service has a single responsibility
- **Predictable Patterns**: Consistent naming and structure across modules
- **Comprehensive Documentation**: Every function and class is documented
- **Error Tolerance**: Graceful handling of edge cases and user errors

#### Scalability
- **Service-Oriented**: Each major feature is a separate service
- **Event-Driven**: Services communicate through events, not direct coupling
- **Configurable**: Easy to adjust behavior without code changes
- **Extensible**: Plugin architecture for custom integrations

## Backend Development

### Core Services

#### TaskBreakdownService
AI-powered task decomposition using OpenAI's API.

```javascript
import TaskBreakdownService from './services/taskBreakdownService.js';

const service = new TaskBreakdownService(process.env.OPENAI_API_KEY);

// Break down a task with ADHD-specific optimizations
const breakdown = await service.breakdownTask(
  "Write dissertation introduction",
  {
    currentEnergyLevel: 'moderate',
    availableTime: 60,
    executiveFunctionChallenges: ['task_initiation']
  }
);
```

**Key Features:**
- ADHD-aware prompt engineering
- Fallback to rule-based breakdown if AI fails
- Energy level and complexity matching
- Executive function consideration

#### ADHDPatternService
Behavioral pattern detection and intervention suggestions.

```javascript
import ADHDPatternService from './services/adhdPatternService.js';

const service = new ADHDPatternService();

// Detect patterns from behavior data
const patterns = service.detectPatterns({
  task_delay_minutes: 45,
  completion_rate: 0.3,
  avoidance_behaviors: 3
});

// Get personalized interventions
const interventions = service.getInterventionsForPattern(
  'procrastination',
  0.8 // likelihood
);
```

**Pattern Types:**
- Procrastination detection and intervention
- Hyperfocus identification and protection
- Time blindness support
- Overwhelm prevention
- Task switching assistance

#### ProactiveNotificationService
Context-aware, ADHD-friendly notification system.

```javascript
import ProactiveNotificationService from './services/proactiveNotificationService.js';

const service = new ProactiveNotificationService(patternService);

// Send ADHD-friendly notification
const notification = {
  type: 'gentle_check_in',
  urgency: 'low',
  message: 'How\'s your focus today?',
  hyperfocusCompatible: false
};

await service.sendNotification(notification);
```

**Features:**
- Daily notification limits to prevent overwhelm
- Quiet hours respect
- Emergency override capability
- Hyperfocus protection
- ADHD-specific tone and messaging

#### OutOfOfficeService
Comprehensive break management with hooks.

```javascript
import OutOfOfficeService from './services/outOfOfficeService.js';

const service = new OutOfOfficeService();

// Register custom service hook
service.registerHook('custom_service', {
  onPause: (config) => {
    // Pause custom functionality
    return { paused: true };
  },
  onResume: (config) => {
    // Resume with welcome back
    return { resumed: true };
  }
});

// Start vacation mode
await service.setOutOfOffice({
  reason: 'vacation',
  duration: 7,
  pauseServices: ['notifications', 'patterns']
});
```

### API Design Patterns

#### Consistent Response Format
```javascript
// Success response
{
  success: true,
  data: { /* actual data */ },
  metadata: {
    timestamp: "2024-03-15T10:00:00Z",
    requestId: "req_123"
  }
}

// Error response with ADHD support
{
  success: false,
  error: {
    status: 400,
    message: "Technical error message",
    adhdFriendlyMessage: "Gentle, supportive explanation",
    suggestions: ["Specific next steps"],
    adhdSupport: {
      comfort: "Reassuring message",
      nextSteps: ["Action items"],
      motivation: "Encouraging note"
    }
  }
}
```

#### Error Handling Strategy
```javascript
// ADHD-friendly error middleware
const errorHandler = (err, req, res, next) => {
  // Log technical details
  console.error(err);

  // Provide supportive user message
  const response = {
    success: false,
    error: {
      message: err.message,
      adhdFriendlyMessage: generateSupportiveMessage(err),
      suggestions: getSuggestions(err.type),
      adhdSupport: {
        comfort: getComfortMessage(err.status),
        motivation: "You've got this! Every problem has a solution."
      }
    }
  };

  res.status(err.status || 500).json(response);
};
```

### Database Integration

Currently using SQLite for simplicity. Future versions will support PostgreSQL.

```javascript
// Example database service
class DatabaseService {
  constructor() {
    this.db = new sqlite3.Database('./data/proactivity.db');
  }

  async saveUserPattern(userId, pattern) {
    const query = `
      INSERT INTO user_patterns (user_id, pattern_type, likelihood, detected_at)
      VALUES (?, ?, ?, ?)
    `;

    return this.db.run(query, [userId, pattern.type, pattern.likelihood, new Date()]);
  }

  async getUserPatterns(userId, days = 30) {
    const query = `
      SELECT * FROM user_patterns
      WHERE user_id = ? AND detected_at > date('now', '-${days} days')
      ORDER BY detected_at DESC
    `;

    return this.db.all(query, [userId]);
  }
}
```

## Frontend Development

### Framework Choice: React + TypeScript

Future web interface will use React with TypeScript for type safety and ADHD-friendly development.

```typescript
// Component structure
interface TaskCardProps {
  task: Task;
  onStart: (taskId: string) => void;
  onBreakdown: (task: Task) => void;
  energyLevel: EnergyLevel;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onStart,
  onBreakdown,
  energyLevel
}) => {
  // ADHD-friendly task display
  return (
    <div className="task-card">
      <h3>{task.title}</h3>
      <div className="task-meta">
        <span className="time-estimate">⏱️ {task.estimatedMinutes}min</span>
        <span className="complexity">{task.complexity}</span>
      </div>
      <p className="motivation">{task.motivationBooster}</p>
      <div className="actions">
        <button onClick={() => onStart(task.id)}>▶️ Start</button>
        <button onClick={() => onBreakdown(task)}>🔨 Break Down</button>
      </div>
    </div>
  );
};
```

### State Management

Using Zustand for simple, ADHD-friendly state management:

```typescript
import { create } from 'zustand';

interface AppState {
  currentEnergyLevel: EnergyLevel;
  tasks: Task[];
  patterns: DetectedPattern[];
  outOfOfficeMode: boolean;

  // Actions
  updateEnergyLevel: (level: EnergyLevel) => void;
  addTask: (task: Task) => void;
  startOutOfOffice: (config: OutOfOfficeConfig) => void;
}

const useAppStore = create<AppState>((set, get) => ({
  currentEnergyLevel: 'moderate',
  tasks: [],
  patterns: [],
  outOfOfficeMode: false,

  updateEnergyLevel: (level) => {
    set({ currentEnergyLevel: level });
    // Trigger task suggestions refresh
    fetchTaskSuggestions(level);
  },

  addTask: (task) => {
    set((state) => ({ tasks: [...state.tasks, task] }));
  },

  startOutOfOffice: async (config) => {
    const result = await api.outOfOffice.start(config);
    set({ outOfOfficeMode: result.success });
  }
}));
```

## Obsidian Plugin Development

### Plugin Architecture

```typescript
// Main plugin class
export default class ProactivityPlugin extends Plugin {
  settings: ProactivitySettings;
  integrationService: ObsidianIntegrationService;
  patternDetector: ADHDPatternDetector;

  async onload() {
    // Initialize services
    await this.loadSettings();
    this.integrationService = new ObsidianIntegrationService(this.app, this.settings);
    this.patternDetector = new ADHDPatternDetector(this.app, this.settings);

    // Register views and commands
    this.registerView(VIEW_TYPE_PROACTIVITY, (leaf) =>
      new ProactivityView(leaf, this.settings, this.integrationService)
    );

    this.registerCommands();
    this.startPatternDetection();
  }
}
```

### Obsidian Integration Patterns

#### File Manipulation
```typescript
// Create ADHD-friendly daily note
async createDailyNote(): Promise<TFile> {
  const date = new Date().toISOString().split('T')[0];
  const path = `Daily Notes/${date}.md`;

  const template = `# Daily Note - ${date}

#proactivity/daily-note

## Energy Tracking

## Current Focus

## Tasks
- [ ]

## Celebrations

## Reflections

---
*Generated by Proactivity*`;

  return await this.app.vault.create(path, template);
}
```

#### Progress Tracking
```typescript
// Track writing progress
async trackProgress(file: TFile) {
  const content = await this.app.vault.read(file);
  const wordCount = content.split(/\s+/).length;

  // Update daily note with progress
  const dailyNote = await this.getDailyNote();
  const progressEntry = `\n- ${new Date().toLocaleTimeString()}: ${wordCount} words in ${file.name}\n`;

  await this.appendToSection(dailyNote, 'Progress', progressEntry);
}
```

### UI Components

#### Energy Level Selector
```typescript
class EnergyLevelSelector {
  private container: HTMLElement;
  private currentLevel: EnergyLevel = 'moderate';

  constructor(container: HTMLElement, onChange: (level: EnergyLevel) => void) {
    this.container = container;
    this.render();
  }

  private render() {
    const levels: Array<{level: EnergyLevel, emoji: string, label: string}> = [
      { level: 'high', emoji: '⚡', label: 'High' },
      { level: 'moderate', emoji: '🔋', label: 'Moderate' },
      { level: 'low', emoji: '🪫', label: 'Low' },
      { level: 'depleted', emoji: '😴', label: 'Depleted' }
    ];

    levels.forEach(({ level, emoji, label }) => {
      const button = this.container.createEl('button', {
        cls: `energy-button ${this.currentLevel === level ? 'active' : ''}`,
        text: `${emoji} ${label}`
      });

      button.onclick = () => {
        this.currentLevel = level;
        this.onChange(level);
        this.updateActiveState();
      };
    });
  }
}
```

## Testing Strategy

### Unit Tests

```javascript
// Example test for TaskBreakdownService
import { describe, it, expect, beforeEach } from 'vitest';
import TaskBreakdownService from '../src/backend/services/taskBreakdownService.js';

describe('TaskBreakdownService', () => {
  let service;

  beforeEach(() => {
    service = new TaskBreakdownService('test-api-key');
  });

  it('should break down complex tasks into micro-tasks', async () => {
    const task = 'Write literature review chapter';
    const context = {
      currentEnergyLevel: 'moderate',
      availableTime: 60
    };

    const breakdown = await service.breakdownTask(task, context);

    expect(breakdown.microTasks).toHaveLength.greaterThan(1);
    expect(breakdown.microTasks[0].estimatedMinutes).toBeLessThanOrEqual(30);
    expect(breakdown.adhdOptimizations).toContain('low-friction-start');
  });

  it('should provide fallback when AI fails', async () => {
    // Mock API failure
    service.openai = { chat: { completions: { create: () => { throw new Error('API Error'); } } } };

    const breakdown = await service.breakdownTask('Test task', {});

    expect(breakdown.breakdownStrategy).toBe('rule-based-fallback');
    expect(breakdown.microTasks).toHaveLength.greaterThan(0);
  });
});
```

### Integration Tests

```javascript
// API endpoint testing
import request from 'supertest';
import app from '../src/backend/server.js';

describe('Task API', () => {
  it('should break down tasks via API', async () => {
    const response = await request(app)
      .post('/api/tasks/breakdown')
      .send({
        task: 'Write methodology section',
        context: { energyLevel: 'high' }
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.microTasks).toBeDefined();
  });

  it('should handle invalid input gracefully', async () => {
    const response = await request(app)
      .post('/api/tasks/breakdown')
      .send({ /* missing task */ })
      .expect(400);

    expect(response.body.error.adhdFriendlyMessage).toBeDefined();
    expect(response.body.error.suggestions).toBeInstanceOf(Array);
  });
});
```

### E2E Tests

```javascript
// Obsidian plugin testing
import { test, expect } from '@playwright/test';

test('Energy level selection updates task suggestions', async ({ page }) => {
  await page.goto('app://obsidian.md/vault');

  // Open Proactivity view
  await page.click('[data-testid="proactivity-ribbon"]');

  // Select high energy
  await page.click('[data-testid="energy-high"]');

  // Verify high-energy tasks are suggested
  await expect(page.locator('[data-testid="task-suggestions"]')).toContainText('complex');
});
```

## Performance Optimization

### Backend Optimization

#### Caching Strategy
```javascript
import NodeCache from 'node-cache';

class CachedTaskBreakdownService extends TaskBreakdownService {
  constructor(apiKey) {
    super(apiKey);
    this.cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache
  }

  async breakdownTask(task, context) {
    const cacheKey = this.generateCacheKey(task, context);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return { ...cached, fromCache: true };
    }

    const breakdown = await super.breakdownTask(task, context);
    this.cache.set(cacheKey, breakdown);

    return breakdown;
  }

  generateCacheKey(task, context) {
    return `${task}_${context.energyLevel}_${context.availableTime}`;
  }
}
```

#### Rate Limiting
```javascript
import rateLimit from 'express-rate-limit';

// ADHD-friendly rate limiting with helpful messages
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Rate limit reached',
    adhdFriendlyMessage: 'You\'re very productive today! Let\'s take a short breather before the next request.',
    suggestions: [
      'This is actually great timing for a 5-minute break',
      'Try some deep breathing or stretching',
      'Come back refreshed and ready to continue'
    ]
  },
  standardHeaders: true,
  legacyHeaders: false
});
```

### Plugin Optimization

#### Lazy Loading
```typescript
// Load services only when needed
class ProactivityPlugin extends Plugin {
  private _integrationService?: ObsidianIntegrationService;

  get integrationService(): ObsidianIntegrationService {
    if (!this._integrationService) {
      this._integrationService = new ObsidianIntegrationService(this.app, this.settings);
    }
    return this._integrationService;
  }
}
```

#### Debounced Updates
```typescript
import { debounce } from 'lodash';

class ProgressTracker {
  private updateProgress = debounce(async (file: TFile) => {
    // Expensive progress calculation
    const progress = await this.calculateProgress(file);
    await this.saveProgress(progress);
  }, 1000); // Wait 1 second after typing stops

  onFileModified(file: TFile) {
    this.updateProgress(file);
  }
}
```

## Deployment

### Development Deployment

```bash
# Local development
npm run dev

# Test production build
npm run build
npm start
```

### Production Deployment

```bash
# Docker deployment
docker build -t proactivity .
docker run -d -p 3001:3001 --env-file .env proactivity

# Or with docker-compose
docker-compose up -d
```

### Environment Configuration

```yaml
# docker-compose.yml
version: '3.8'
services:
  proactivity:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DATABASE_URL=postgresql://user:pass@db:5432/proactivity
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=proactivity
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Contributing Guidelines

### Code Style

- **TypeScript**: Use strict mode and explicit types
- **ESLint**: Follow Airbnb configuration with ADHD-friendly exceptions
- **Prettier**: Consistent formatting
- **JSDoc**: Document all public methods

### Commit Convention

```bash
# Feature commits
feat(tasks): add energy-based task suggestions

# Bug fixes
fix(notifications): resolve quiet hours not being respected

# Documentation
docs(api): update task breakdown endpoint documentation

# Refactoring
refactor(patterns): simplify procrastination detection logic
```

### Pull Request Process

1. **Fork and Branch**: Create feature branch from main
2. **Develop**: Follow TDD where possible
3. **Test**: Ensure all tests pass and coverage >80%
4. **Document**: Update relevant documentation
5. **Review**: Submit PR with clear description
6. **Merge**: Squash commits for clean history

### Issue Templates

```markdown
## Bug Report
**Describe the bug**
A clear description of what the bug is.

**ADHD Impact**
How does this bug affect the ADHD user experience?

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. See error

**Expected Behavior**
What should happen instead?

**Environment**
- OS: [e.g. macOS, Windows]
- Obsidian Version: [e.g. 1.0.0]
- Plugin Version: [e.g. 1.0.0]
```

### Development Workflow

```bash
# Start new feature
git checkout -b feature/new-adhd-pattern
npm run test:watch
# Develop with TDD

# Before committing
npm run lint
npm run test
npm run type-check
npm run build

# Commit and push
git add .
git commit -m "feat(patterns): add overwhelm detection"
git push origin feature/new-adhd-pattern
```

This development guide ensures that all contributors can work effectively while maintaining the ADHD-friendly principles that make Proactivity unique.