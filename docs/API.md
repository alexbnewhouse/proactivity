# Proactivity API Documentation

## Overview

The Proactivity backend provides RESTful APIs for AI-powered task breakdown, ADHD pattern detection, proactive notifications, and out-of-office management.

**Base URL**: `http://localhost:3001/api`

## Authentication

Currently, the API is open for development. Production deployments will require API keys or JWT tokens.

## Core Concepts

### ADHD-Centric Design
All endpoints are designed with ADHD considerations:
- **Cognitive Load Reduction**: Simple, predictable response structures
- **Error Tolerance**: Forgiving input validation with helpful error messages
- **Pattern Recognition**: Learning from user behavior to provide personalized responses
- **Gentle Interruption**: Notifications respect user's current state and energy level

## Endpoints

### Task Management

#### `POST /api/tasks/breakdown`
Break down a complex task into ADHD-friendly micro-tasks.

**Request Body:**
```json
{
  "task": "Write literature review for Chapter 2",
  "context": {
    "currentEnergyLevel": "moderate",
    "availableTime": 60,
    "preferredComplexity": "simple",
    "executiveFunctionChallenges": ["task_initiation", "working_memory"],
    "currentProject": "dissertation"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "originalTask": "Write literature review for Chapter 2",
    "microTasks": [
      {
        "id": "task_1",
        "title": "Set up workspace",
        "description": "Open documents and clear distractions",
        "estimatedMinutes": 5,
        "complexity": "micro",
        "motivationBooster": "Starting is the hardest part - you've got this! 💪"
      }
    ],
    "totalEstimatedTime": 55,
    "adhdOptimizations": ["low-friction-start", "pomodoro-friendly"]
  }
}
```

#### `GET /api/tasks/suggestions`
Get personalized task suggestions based on current context.

**Query Parameters:**
- `energyLevel`: `high|moderate|low|depleted`
- `availableTime`: Minutes available (default: 30)
- `category`: `research|writing|analysis|organization|administrative|creative|revision`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "suggestion_1",
      "title": "Quick brain dump",
      "description": "Write down all thoughts about your research",
      "estimatedMinutes": 10,
      "complexity": "micro",
      "motivationBooster": "Getting thoughts out of your head creates mental space! 🧠"
    }
  ]
}
```

### Pattern Detection

#### `POST /api/patterns/detect`
Analyze behavior data to detect ADHD patterns.

**Request Body:**
```json
{
  "behaviorData": {
    "task_delay_minutes": 45,
    "completion_rate": 0.3,
    "avoidance_behaviors": 3,
    "continuous_work_minutes": 25,
    "break_frequency": 0
  },
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "patterns": [
      {
        "type": "procrastination",
        "likelihood": 0.8,
        "severity": "moderate",
        "triggers": ["task_complexity", "unclear_requirements"],
        "recommendedInterventions": [
          {
            "type": "task_breakdown",
            "message": "Let's make this less overwhelming. I'll break this into tiny steps.",
            "action": "break_into_micro_tasks"
          }
        ]
      }
    ],
    "recommendations": [
      {
        "type": "environmental",
        "suggestion": "Try the 2-minute rule: if it takes less than 2 minutes, do it now",
        "confidence": 0.8
      }
    ]
  }
}
```

#### `POST /api/patterns/intervention/execute`
Execute a specific intervention for a detected pattern.

**Request Body:**
```json
{
  "interventionType": "task_breakdown",
  "patternType": "procrastination",
  "context": {
    "task": "Write methodology section",
    "currentDuration": 30,
    "estimatedDuration": 45
  }
}
```

### Out of Office Management

#### `GET /api/out-of-office/status`
Get current out of office status.

**Response:**
```json
{
  "success": true,
  "data": {
    "active": true,
    "reason": "vacation",
    "message": "On vacation! 🏖️ Recharging for maximum productivity!",
    "timeAway": { "days": 2, "hours": 14, "minutes": 30 },
    "timeRemaining": { "days": 4, "hours": 9, "minutes": 30 },
    "pausedServices": ["notifications", "patterns", "tasks"],
    "emergencyMode": true
  }
}
```

#### `POST /api/out-of-office/start`
Start out of office mode.

**Request Body:**
```json
{
  "reason": "vacation",
  "duration": 7,
  "durationType": "days",
  "message": "Beach vacation! 🏖️",
  "pauseServices": ["notifications", "patterns", "tasks"],
  "enableEmergencyMode": true,
  "emergencyKeyword": "URGENT"
}
```

#### Quick Presets

**Vacation Mode**: `POST /api/out-of-office/presets/vacation`
```json
{
  "days": 7,
  "autoResume": true
}
```

**Deep Focus**: `POST /api/out-of-office/presets/deep-focus`
```json
{
  "hours": 4
}
```

**Sick Day**: `POST /api/out-of-office/presets/sick-day`
```json
{
  "hours": 24
}
```

#### `POST /api/out-of-office/emergency`
Emergency override when out of office.

**Request Body:**
```json
{
  "message": "URGENT: Need to submit conference abstract today",
  "action": "task_breakdown",
  "context": {
    "deadline": "2024-03-15T17:00:00Z"
  }
}
```

### Health Check

#### `GET /health`
System health and service status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-03-15T10:00:00Z",
  "version": "1.0.0",
  "services": {
    "taskBreakdown": true,
    "patterns": true,
    "notifications": true,
    "outOfOffice": true
  }
}
```

## Error Handling

All errors follow a consistent ADHD-friendly format:

```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "Invalid input provided",
    "adhdFriendlyMessage": "It looks like some information is missing or incorrect. Let's check the details together.",
    "suggestions": [
      "Check that all required fields are filled in",
      "Make sure your input follows the expected format"
    ],
    "adhdSupport": {
      "comfort": "It's totally normal to miss details sometimes - ADHD brains process so much information!",
      "nextSteps": [
        "Take a deep breath",
        "Review the information you entered",
        "Try again with careful attention to details"
      ],
      "motivation": "Remember: every challenge is an opportunity to practice resilience. You've got this! 💪"
    }
  }
}
```

## Rate Limiting

- **Development**: No limits
- **Production**: 100 requests per minute per IP
- **Out of Office**: When active, most endpoints return 503 with helpful messages

## Webhook Integration

The API supports webhooks for real-time pattern detection and intervention:

```json
{
  "event": "pattern_detected",
  "data": {
    "pattern": "procrastination",
    "severity": "moderate",
    "user": "user123",
    "timestamp": "2024-03-15T10:00:00Z"
  }
}
```

## SDK Examples

### JavaScript/Node.js

```javascript
import ProactivityAPI from 'proactivity-sdk';

const api = new ProactivityAPI('http://localhost:3001');

// Break down a task
const breakdown = await api.tasks.breakdown(
  'Write introduction chapter',
  {
    energyLevel: 'moderate',
    availableTime: 90
  }
);

// Start vacation mode
const vacation = await api.outOfOffice.startVacation(5, true);

// Handle patterns
api.patterns.on('procrastination', (data) => {
  console.log('Procrastination detected:', data);
});
```

### Python

```python
from proactivity import ProactivityAPI

api = ProactivityAPI('http://localhost:3001')

# Break down a task
breakdown = api.tasks.breakdown(
    'Analyze survey data',
    energy_level='high',
    available_time=120
)

# Start out of office
api.out_of_office.start_deep_focus(hours=3)
```

## Development Notes

### Local Development
```bash
# Start the API server
npm run backend:dev

# Test with curl
curl -X GET http://localhost:3001/health

# Test task breakdown
curl -X POST http://localhost:3001/api/tasks/breakdown \
  -H "Content-Type: application/json" \
  -d '{"task": "Test task", "context": {"energyLevel": "moderate"}}'
```

### Environment Variables
```env
OPENAI_API_KEY=your_key_here
PORT=3001
NODE_ENV=development
MAX_DAILY_NOTIFICATIONS=12
PROCRASTINATION_THRESHOLD=30
```

### Custom Hooks
Services can register custom hooks for out-of-office events:

```javascript
outOfOfficeService.registerHook('custom_service', {
  onPause: (config) => {
    // Pause custom service
    return { paused: true, customData: 'service_specific' };
  },
  onResume: (config) => {
    // Resume custom service
    return { resumed: true };
  }
});
```