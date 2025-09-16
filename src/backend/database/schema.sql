-- Proactivity Database Schema
-- SQLite database for persistent task management and ADHD pattern tracking

-- Users table for basic user management
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- ADHD Profile
    adhd_severity_level TEXT DEFAULT 'moderate', -- mild, moderate, severe
    primary_symptoms TEXT, -- JSON array of symptoms
    coping_strategies TEXT, -- JSON array of preferred strategies
    preferred_spectrum_level INTEGER DEFAULT 5,
    max_daily_escalation INTEGER DEFAULT 8,

    -- Settings
    working_hours_start TEXT DEFAULT '09:00',
    working_hours_end TEXT DEFAULT '17:00',
    timezone TEXT DEFAULT 'UTC',
    morning_todo_enforcement BOOLEAN DEFAULT TRUE
);

-- Projects table for high-level project organization
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active', -- active, completed, paused, cancelled
    priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
    due_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completion_percentage INTEGER DEFAULT 0,

    -- ADHD-specific fields
    energy_required TEXT DEFAULT 'moderate', -- low, moderate, high
    complexity TEXT DEFAULT 'moderate', -- micro, simple, moderate, complex, overwhelming
    estimated_hours INTEGER,
    actual_hours INTEGER DEFAULT 0,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tasks table for individual tasks within projects
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    project_id INTEGER,
    parent_task_id INTEGER, -- For subtasks

    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    priority TEXT DEFAULT 'medium',
    due_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,

    -- ADHD Task Breakdown fields
    estimated_minutes INTEGER DEFAULT 25,
    actual_minutes INTEGER DEFAULT 0,
    complexity TEXT DEFAULT 'simple', -- micro, simple, moderate, complex
    category TEXT DEFAULT 'general', -- research, writing, analysis, organization, administrative, creative, revision
    energy_required TEXT DEFAULT 'moderate',
    executive_function_demands TEXT, -- JSON array of EF demands
    tools_needed TEXT, -- JSON array of tools/resources
    completion_criteria TEXT,
    motivation_booster TEXT,
    procrastination_risk TEXT DEFAULT 'medium', -- low, medium, high

    -- Task breakdown metadata
    original_task TEXT, -- If this was broken down from a larger task
    breakdown_strategy TEXT, -- momentum-building, parallel-processing, sequential
    ai_generated BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Daily planning and morning todos
CREATE TABLE IF NOT EXISTS daily_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,

    -- Planning status
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed
    energy_level TEXT, -- depleted, low, moderate, high, hyperfocus
    available_time_minutes INTEGER,
    daily_goal TEXT,

    -- Morning planning enforcement
    planning_start_time DATETIME,
    planning_completion_time DATETIME,
    escalation_level INTEGER DEFAULT 1,
    bypass_used BOOLEAN DEFAULT FALSE,
    bypass_reason TEXT,

    UNIQUE(user_id, plan_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Link daily plans to specific tasks
CREATE TABLE IF NOT EXISTS daily_plan_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    daily_plan_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    planned_order INTEGER, -- Order within the day
    time_block_start TEXT, -- HH:MM format
    time_block_end TEXT,
    completed BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (daily_plan_id) REFERENCES daily_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Focus sessions and time tracking
CREATE TABLE IF NOT EXISTS focus_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_id INTEGER,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    planned_duration INTEGER, -- in minutes
    actual_duration INTEGER, -- in minutes

    -- Session quality metrics
    energy_level_start TEXT,
    energy_level_end TEXT,
    focus_quality INTEGER, -- 1-10 scale
    distractions_count INTEGER DEFAULT 0,
    break_count INTEGER DEFAULT 0,

    -- ADHD-specific tracking
    hyperfocus_detected BOOLEAN DEFAULT FALSE,
    procrastination_before INTEGER DEFAULT 0, -- minutes procrastinated before starting
    session_type TEXT DEFAULT 'work', -- work, break, hyperfocus, procrastination

    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- ADHD pattern detection and tracking
CREATE TABLE IF NOT EXISTS pattern_detections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    pattern_type TEXT NOT NULL, -- procrastination, hyperfocus, time_blindness, task_switching, overwhelm, perfectionism
    severity TEXT DEFAULT 'moderate', -- mild, moderate, severe
    confidence REAL NOT NULL, -- 0.0 to 1.0
    duration_minutes INTEGER, -- How long the pattern lasted

    -- Context when detected
    current_task_id INTEGER,
    time_of_day TEXT, -- morning, afternoon, evening, night
    energy_level TEXT,

    -- Pattern-specific data (JSON)
    triggers TEXT, -- JSON array of triggers that led to pattern
    indicators TEXT, -- JSON array of behavioral indicators
    intervention_suggested TEXT, -- JSON object of suggested intervention
    intervention_applied TEXT, -- JSON object of intervention actually applied
    intervention_effective BOOLEAN,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (current_task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- Proactive interventions and spectrum events
CREATE TABLE IF NOT EXISTS spectrum_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_time DATETIME DEFAULT CURRENT_TIMESTAMP,

    event_type TEXT NOT NULL, -- level_change, morning_escalation, hijack_activation, bypass_request
    previous_level INTEGER,
    new_level INTEGER,
    reason TEXT,

    -- Morning planning specific
    morning_planning_date DATE,
    hours_elapsed INTEGER, -- For morning escalation tracking
    attempts_count INTEGER,

    -- Hijack mode specific
    hijack_active BOOLEAN DEFAULT FALSE,
    blocked_apps TEXT, -- JSON array
    allowed_apps TEXT, -- JSON array
    escape_attempts INTEGER DEFAULT 0,

    -- Bypass information
    bypass_granted BOOLEAN DEFAULT FALSE,
    bypass_duration_minutes INTEGER,
    bypass_reason TEXT,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User energy level tracking throughout the day
CREATE TABLE IF NOT EXISTS energy_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    energy_level TEXT NOT NULL, -- depleted, low, moderate, high, hyperfocus

    -- Context
    activity TEXT, -- What they were doing when logged
    location TEXT, -- Where they were working
    time_since_break INTEGER, -- Minutes since last break
    caffeine_intake BOOLEAN DEFAULT FALSE,
    medication_taken BOOLEAN DEFAULT FALSE,

    -- Self-reported metrics
    focus_ability INTEGER, -- 1-10 scale
    motivation_level INTEGER, -- 1-10 scale
    stress_level INTEGER, -- 1-10 scale

    notes TEXT,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Habit tracking for building planning behaviors
CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    habit_name TEXT NOT NULL,
    habit_type TEXT DEFAULT 'planning', -- planning, task_breakdown, energy_tracking
    description TEXT,

    target_frequency TEXT DEFAULT 'daily', -- daily, weekly, custom
    target_streak INTEGER DEFAULT 7, -- Days to maintain for habit formation
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,

    -- ADHD-specific habit support
    difficulty_level INTEGER DEFAULT 1, -- 1-10, auto-adjusts based on success
    reminder_frequency TEXT DEFAULT 'normal', -- gentle, normal, insistent
    celebration_style TEXT DEFAULT 'standard', -- minimal, standard, enthusiastic

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Daily habit completion tracking
CREATE TABLE IF NOT EXISTS habit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    log_date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at DATETIME,

    -- Quality metrics
    completion_quality INTEGER, -- 1-10 scale
    effort_required INTEGER, -- 1-10 scale
    satisfaction INTEGER, -- 1-10 scale

    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(habit_id, log_date),
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications and interventions sent to user
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    notification_type TEXT NOT NULL, -- energy_check, gentle_reminder, pattern_intervention, spectrum_escalation
    urgency TEXT DEFAULT 'medium', -- low, medium, high, critical
    title TEXT NOT NULL,
    message TEXT NOT NULL,

    -- ADHD-specific fields
    tone_style TEXT DEFAULT 'encouraging', -- gentle, encouraging, firm, supportive
    cognitive_load INTEGER DEFAULT 1, -- 1-5 scale
    dismissible BOOLEAN DEFAULT TRUE,
    requires_action BOOLEAN DEFAULT FALSE,

    -- Delivery and response tracking
    delivered BOOLEAN DEFAULT FALSE,
    read BOOLEAN DEFAULT FALSE,
    dismissed BOOLEAN DEFAULT FALSE,
    action_taken TEXT, -- JSON of user response
    effective BOOLEAN, -- Did it help?

    -- Related data
    pattern_detection_id INTEGER,
    spectrum_event_id INTEGER,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pattern_detection_id) REFERENCES pattern_detections(id) ON DELETE SET NULL,
    FOREIGN KEY (spectrum_event_id) REFERENCES spectrum_events(id) ON DELETE SET NULL
);

-- Browser activity tracking for pattern detection
CREATE TABLE IF NOT EXISTS browser_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    activity_type TEXT NOT NULL, -- page_visit, tab_switch, app_switch, idle_start, idle_end
    url TEXT,
    domain TEXT,
    page_title TEXT,
    app_name TEXT,

    -- Activity metrics
    duration_seconds INTEGER,
    tab_count INTEGER, -- Number of tabs open
    window_count INTEGER,

    -- Context
    focus_session_id INTEGER,
    is_distracting BOOLEAN DEFAULT FALSE,
    is_productive BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (focus_session_id) REFERENCES focus_sessions(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date ON daily_plans(user_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_date ON focus_sessions(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_pattern_detections_user_type ON pattern_detections(user_id, pattern_type);
CREATE INDEX IF NOT EXISTS idx_energy_logs_user_time ON energy_logs(user_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_browser_activity_user_time ON browser_activity(user_id, timestamp);

-- Insert default user for development
INSERT OR IGNORE INTO users (id, username, email) VALUES (1, 'default', 'user@proactivity.local');

-- Insert default habits for new users
INSERT OR IGNORE INTO habits (user_id, habit_name, description) VALUES
(1, 'Morning Planning', 'Complete daily task planning before starting work'),
(1, 'Energy Check-ins', 'Log energy level at least 3 times per day'),
(1, 'Task Breakdown', 'Break down any task over 60 minutes into smaller pieces');