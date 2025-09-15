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