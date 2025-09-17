// Shared type definitions for Proactivity

/**
 * ADHD-specific task complexity levels
 */
export const TaskComplexity = {
  MICRO: 'micro',       // 5-15 minutes, single action
  SIMPLE: 'simple',     // 15-30 minutes, straightforward
  MODERATE: 'moderate', // 30-60 minutes, requires focus
  COMPLEX: 'complex',   // 1-3 hours, high cognitive load
  OVERWHELMING: 'overwhelming' // 3+ hours, needs breakdown
};

/**
 * User energy levels for ADHD-aware scheduling
 */
export const EnergyLevel = {
  DEPLETED: 'depleted',   // Can only handle micro tasks
  LOW: 'low',             // Simple tasks only
  MODERATE: 'moderate',   // Normal task capacity
  HIGH: 'high',           // Can handle complex tasks
  HYPERFOCUS: 'hyperfocus' // Optimal for overwhelming tasks
};

/**
 * Task status for Kanban/Gantt tracking
 */
export const TaskStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  BLOCKED: 'blocked',
  REVIEW: 'review',
  DONE: 'done'
};

/**
 * Executive function domains from ADHD research
 */
export const ExecutiveFunction = {
  WORKING_MEMORY: 'working_memory',
  COGNITIVE_FLEXIBILITY: 'cognitive_flexibility',
  INHIBITORY_CONTROL: 'inhibitory_control',
  TASK_INITIATION: 'task_initiation',
  PLANNING: 'planning',
  ORGANIZATION: 'organization',
  TIME_MANAGEMENT: 'time_management',
  SUSTAINED_ATTENTION: 'sustained_attention'
};

/**
 * Task categories specific to dissertation writing
 */
export const TaskCategory = {
  RESEARCH: 'research',           // Literature review, data collection
  WRITING: 'writing',             // Drafting, editing
  ANALYSIS: 'analysis',           // Data analysis, interpretation
  ORGANIZATION: 'organization',   // Note organization, planning
  ADMINISTRATIVE: 'administrative', // Emails, scheduling
  CREATIVE: 'creative',           // Brainstorming, ideation
  REVISION: 'revision'            // Editing, proofreading
};

/**
 * Enhanced Task structure with time tracking for Gantt charts
 */
export const TaskTemplate = {
  id: '',                    // Unique identifier
  title: '',                 // Task title
  description: '',           // Detailed description
  status: TaskStatus.TODO,   // Current status
  priority: 'medium',        // low, medium, high, urgent
  complexity: TaskComplexity.MODERATE,
  category: TaskCategory.WRITING,
  
  // Time tracking for Gantt charts
  startTime: null,          // ISO string or null
  endTime: null,            // ISO string or null
  scheduledStartTime: null, // Planned start time
  scheduledEndTime: null,   // Planned end time
  estimatedMinutes: 30,     // Estimated duration
  actualMinutes: 0,         // Tracked time spent
  
  // Metadata
  energyLevel: EnergyLevel.MODERATE,
  createdAt: '',            // ISO string
  updatedAt: '',            // ISO string
  completedAt: null,        // ISO string or null
  
  // ADHD-specific
  procrastinationScore: 0,  // 0-10
  motivationBooster: '',    // Encouraging message
  adhdOptimized: false,     // Has been processed for ADHD
  
  // Sync metadata
  source: 'manual',         // manual, obsidian, ai
  syncStatus: 'synced',     // synced, pending, conflict
  lastSyncTime: '',         // ISO string
  
  // Dependencies for Gantt
  dependencies: [],         // Array of task IDs
  blocked: false,           // Is task blocked
  blockingReason: ''        // Why task is blocked
};

/**
 * Sync configuration between extension and Obsidian
 */
export const SyncConfig = {
  enableRealTimeSync: true,
  syncIntervalMinutes: 5,
  conflictResolution: 'manual', // manual, extension-wins, obsidian-wins
  syncComponents: {
    tasks: true,
    energyLevels: true,
    focusSessions: true,
    settings: true,
    patterns: true
  }
};

/**
 * Notification urgency levels
 */
export const NotificationUrgency = {
  LOW: 'low',       // Gentle nudge
  MEDIUM: 'medium', // Standard reminder
  HIGH: 'high',     // Important intervention
  CRITICAL: 'critical' // Procrastination intervention
};

/**
 * ADHD-specific patterns from research
 */
export const ADHDPattern = {
  PROCRASTINATION: 'procrastination',
  HYPERFOCUS: 'hyperfocus',
  TIME_BLINDNESS: 'time_blindness',
  TASK_SWITCHING: 'task_switching',
  OVERWHELM: 'overwhelm',
  PERFECTIONISM: 'perfectionism'
};

export default {
  TaskComplexity,
  EnergyLevel,
  ExecutiveFunction,
  TaskCategory,
  NotificationUrgency,
  ADHDPattern
};