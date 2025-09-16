# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Commands

### Development Server Commands
```bash
# Start all services in development mode
./start-all.sh

# Start individual services
npm run backend:dev          # Backend API server with nodemon
npm run frontend:dev         # React frontend (port 3000)
cd src/obsidian-plugin && npm run dev  # Obsidian plugin build watch

# Production builds
npm run build                # Build entire project
cd src/backend && npm start  # Production backend server
cd src/obsidian-plugin && npm run build  # Compile plugin TypeScript
```

### Testing and Quality
```bash
npm test                     # Run all tests
cd src/backend && npm run lint  # ESLint backend
cd src/backend && npm run health  # Check if backend is running
cd src/obsidian-plugin && npm run build  # TypeScript compilation check
```

### Installation and Setup
```bash
./setup-dev.sh             # One-command setup for entire project
./install-obsidian-plugin.sh  # Install plugin to user's Obsidian vault
```

### Backend Health Check
```bash
curl http://localhost:3001/health  # Quick backend health test
```

## Project Architecture

This is a multi-component ADHD-focused productivity system with three main interfaces: browser extension, Obsidian plugin, and backend API server.

### Core Architecture Pattern
- **Service-Oriented Backend**: Each major feature is encapsulated in a service class
- **Modular Plugin System**: Obsidian plugin with separate concerns for UI, integration, and API communication
- **Browser Extension**: Chrome/Vivaldi extension with content scripts and background workers
- **Shared Type System**: Common TypeScript interfaces across all components

### Key Backend Services (src/backend/services/)
- **TaskBreakdownService**: AI-powered task decomposition using OpenAI API with ADHD-specific prompts and fallback rule-based breakdown
- **ADHDPatternService**: Behavioral pattern detection (procrastination, hyperfocus, time blindness, overwhelm)
- **ProactiveNotificationService**: Context-aware notifications with ADHD-friendly messaging and quiet hours
- **OutOfOfficeService**: Comprehensive break management with service hook system for pausing/resuming functionality
- **ProactivitySpectrumService**: Main orchestration service that coordinates other services
- **MorningPlanningEnforcementService**: Daily planning and task prioritization enforcement

### Backend API Structure
- **Consistent Response Format**: All endpoints return `{success: boolean, data: any, metadata: any}` with ADHD-friendly error messages
- **CORS Configuration**: Supports `app://obsidian.md` origin for plugin communication
- **Rate Limiting**: ADHD-friendly rate limiting with supportive messages instead of harsh errors
- **Database**: SQLite for development, prepared for PostgreSQL production

### Obsidian Plugin Architecture
- **Main Plugin Class**: `ProactivityPlugin` extends Obsidian's Plugin base class
- **Integration Service**: `ObsidianIntegrationService` handles all Obsidian API interactions (file creation, daily notes, task tracking)
- **API Client**: `ProactivityApiClient` manages backend communication with offline fallback
- **View System**: `ProactivityView` provides main dashboard interface with modern UI components
- **Pattern Detection**: `ADHDPatternDetector` monitors user behavior within Obsidian

### Browser Extension Components
- **Manifest V3**: Chrome extension with service worker background script
- **Content Scripts**: Inject gentle interventions and collect behavioral data
- **Dashboard**: Full-featured task management interface with sidebar/tab modes
- **Sync System**: LocalStorage-based communication bridge with Obsidian plugin

## Development Patterns

### Service Initialization Pattern
```typescript
// All services follow this constructor pattern with graceful fallbacks
class ExampleService {
  constructor(apiKey, options = {}) {
    if (!apiKey) {
      console.warn('Service running in fallback mode');
      this.fallbackMode = true;
    }
    // Initialize with defaults
  }
}
```

### ADHD-Friendly Error Handling
```javascript
// All API responses include supportive messaging
{
  success: false,
  error: {
    message: "Technical error",
    adhdFriendlyMessage: "Gentle, supportive explanation",
    suggestions: ["Specific next steps"],
    adhdSupport: {
      comfort: "Reassuring message",
      motivation: "Encouraging note"
    }
  }
}
```

### Plugin Development Pattern
```typescript
// Obsidian plugin methods always check for availability before execution
async somePluginMethod() {
  try {
    if (!this.integrationService) {
      console.error('Integration service not available');
      return;
    }
    // Execute functionality
  } catch (error) {
    console.error('Plugin operation failed:', error);
    new Notice('Gentle error message for user');
  }
}
```

## Key Configuration Files

### Environment Setup
- **Root .env**: OpenAI API key, port configurations, database settings
- **Backend .env**: Mirrors root .env for service configuration
- **Plugin Settings**: Stored in Obsidian's data.json with browser sync configuration

### Build Configuration
- **Root package.json**: Orchestrates all sub-projects with concurrently
- **Backend**: Express server with ES modules, nodemon for development
- **Plugin**: TypeScript compiled with esbuild, strict type checking enabled
- **Extension**: Manifest V3 with Vivaldi/Safari compatibility

## Testing Strategy

### Backend Testing
- **Unit Tests**: Jest for service testing with mocked OpenAI API
- **Integration Tests**: Supertest for API endpoint testing
- **Health Checks**: Automated service availability verification

### Plugin Testing
- **TypeScript Compilation**: `npm run build` validates all type definitions
- **Obsidian API Integration**: Manual testing with actual vault
- **Error Handling**: Graceful degradation testing when backend is offline

## Common Troubleshooting

### Plugin Won't Load
1. Check TypeScript compilation: `cd src/obsidian-plugin && npm run build`
2. Verify CORS in backend includes `app://obsidian.md`
3. Ensure all three files exist: main.js, manifest.json, styles.css

### Backend Connection Issues
1. Health check: `curl http://localhost:3001/health`
2. Check CORS configuration in `src/backend/server.js`
3. Verify OpenAI API key in .env file

### Browser Extension Sync Problems
1. Check localStorage communication bridge
2. Verify both apps have sync enabled in settings
3. Manual sync via Obsidian plugin interface

## Development Philosophy

This codebase prioritizes ADHD-friendly development patterns:
- **Clear Separation**: Each service has single responsibility
- **Graceful Degradation**: System works with missing components
- **Supportive Messaging**: All user-facing text is gentle and encouraging
- **Minimal Friction**: One-command setup and clear error messages
- **Pattern Consistency**: Similar code structures across all components