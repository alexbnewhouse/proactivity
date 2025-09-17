import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Database {
  constructor() {
    this.db = null;
    this.dbPath = join(__dirname, 'proactivity.db');
  }

  async initialize() {
    try {
      // Create database directory if it doesn't exist
      const dbDir = dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Open database connection
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // Enable foreign keys
      await this.db.exec('PRAGMA foreign_keys = ON');
      await this.db.exec('PRAGMA journal_mode = WAL'); // Better performance for concurrent reads

      // Initialize schema
      await this.initializeSchema();

      console.log('✅ Database initialized successfully');
      return this.db;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async initializeSchema() {
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split schema by statements and execute each one
    const statements = schema.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await this.db.exec(statement + ';');
        } catch (error) {
          console.error('Error executing schema statement:', statement.substring(0, 100) + '...');
          throw error;
        }
      }
    }
  }

  getDb() {
    if (!this.db) {
      console.error('❌ Database not initialized. Call initialize() first.');
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  // User management
  async createUser(userData) {
    const { username, email, adhdProfile = {} } = userData;

    const user = await this.db.run(`
      INSERT INTO users (username, email, adhd_severity_level, primary_symptoms, coping_strategies, preferred_spectrum_level)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      username,
      email,
      adhdProfile.severityLevel || 'moderate',
      JSON.stringify(adhdProfile.primarySymptoms || []),
      JSON.stringify(adhdProfile.copingStrategies || []),
      adhdProfile.preferredSpectrumLevel || 5
    ]);

    return { id: user.lastID, username, email };
  }

  async getUser(userId) {
    return await this.db.get('SELECT * FROM users WHERE id = ?', [userId]);
  }

  // Morning planning management
  async createDailyPlan(userId, planDate, planData = {}) {
    const plan = await this.db.run(`
      INSERT OR REPLACE INTO daily_plans (
        user_id, plan_date, energy_level, available_time_minutes, daily_goal,
        planning_start_time, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      planDate,
      planData.energyLevel,
      planData.availableTimeMinutes,
      planData.dailyGoal,
      new Date().toISOString(),
      'in_progress'
    ]);

    return { id: plan.lastID, ...planData };
  }

  async completeDailyPlan(userId, planDate) {
    return await this.db.run(`
      UPDATE daily_plans
      SET status = 'completed', completed_at = ?, planning_completion_time = ?
      WHERE user_id = ? AND plan_date = ?
    `, [new Date().toISOString(), new Date().toISOString(), userId, planDate]);
  }

  async getDailyPlan(userId, planDate) {
    const plan = await this.db.get(`
      SELECT * FROM daily_plans
      WHERE user_id = ? AND plan_date = ?
    `, [userId, planDate]);

    if (plan) {
      // Get associated tasks
      plan.tasks = await this.db.all(`
        SELECT t.*, dpt.planned_order, dpt.time_block_start, dpt.time_block_end, dpt.completed as plan_completed
        FROM tasks t
        JOIN daily_plan_tasks dpt ON t.id = dpt.task_id
        WHERE dpt.daily_plan_id = ?
        ORDER BY dpt.planned_order
      `, [plan.id]);
    }

    return plan;
  }

  async isMorningPlanningComplete(userId, date = null) {
    const planDate = date || new Date().toISOString().split('T')[0];
    const plan = await this.getDailyPlan(userId, planDate);
    return plan && plan.status === 'completed';
  }

  // Task management
  async createTask(userId, taskData) {
    const {
      projectId, parentTaskId, title, description, priority = 'medium',
      dueDate, estimatedMinutes = 25, complexity = 'simple',
      category = 'general', energyRequired = 'moderate',
      executiveFunctionDemands = [], toolsNeeded = [],
      completionCriteria, motivationBooster, originalTask,
      breakdownStrategy, aiGenerated = false
    } = taskData;

    const task = await this.db.run(`
      INSERT INTO tasks (
        user_id, project_id, parent_task_id, title, description, priority,
        due_date, estimated_minutes, complexity, category, energy_required,
        executive_function_demands, tools_needed, completion_criteria,
        motivation_booster, original_task, breakdown_strategy, ai_generated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, projectId, parentTaskId, title, description, priority,
      dueDate, estimatedMinutes, complexity, category, energyRequired,
      JSON.stringify(executiveFunctionDemands), JSON.stringify(toolsNeeded),
      completionCriteria, motivationBooster, originalTask, breakdownStrategy, aiGenerated
    ]);

    return { id: task.lastID, ...taskData };
  }

  async getTasks(userId, filters = {}) {
    let query = 'SELECT * FROM tasks WHERE user_id = ?';
    const params = [userId];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.projectId) {
      query += ' AND project_id = ?';
      params.push(filters.projectId);
    }

    if (filters.energyLevel) {
      query += ' AND energy_required = ?';
      params.push(filters.energyLevel);
    }

    if (filters.dueToday) {
      query += ' AND date(due_date) = date("now")';
    }

    query += ' ORDER BY priority DESC, due_date ASC, created_at DESC';

    return await this.db.all(query, params);
  }

  async updateTaskStatus(taskId, status, actualMinutes = null) {
    const updateData = { status, updated_at: new Date().toISOString() };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (actualMinutes !== null) {
      updateData.actual_minutes = actualMinutes;
    }

    const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(taskId);

    return await this.db.run(
      `UPDATE tasks SET ${setClause} WHERE id = ?`,
      values
    );
  }

  // Project management
  async createProject(userId, projectData) {
    const {
      title, description, priority = 'medium', dueDate,
      energyRequired = 'moderate', complexity = 'moderate',
      estimatedHours
    } = projectData;

    const project = await this.db.run(`
      INSERT INTO projects (
        user_id, title, description, priority, due_date,
        energy_required, complexity, estimated_hours
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, title, description, priority, dueDate, energyRequired, complexity, estimatedHours]);

    return { id: project.lastID, ...projectData };
  }

  async getProjects(userId, status = 'active') {
    return await this.db.all(`
      SELECT p.*,
             COUNT(t.id) as task_count,
             COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE p.user_id = ? AND p.status = ?
      GROUP BY p.id
      ORDER BY p.priority DESC, p.due_date ASC
    `, [userId, status]);
  }

  // Pattern detection
  async recordPatternDetection(userId, patternData) {
    const {
      patternType, severity = 'moderate', confidence, durationMinutes,
      currentTaskId, timeOfDay, energyLevel, triggers = [], indicators = [],
      interventionSuggested, interventionApplied, interventionEffective
    } = patternData;

    const pattern = await this.db.run(`
      INSERT INTO pattern_detections (
        user_id, pattern_type, severity, confidence, duration_minutes,
        current_task_id, time_of_day, energy_level, triggers, indicators,
        intervention_suggested, intervention_applied, intervention_effective
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, patternType, severity, confidence, durationMinutes,
      currentTaskId, timeOfDay, energyLevel, JSON.stringify(triggers),
      JSON.stringify(indicators), JSON.stringify(interventionSuggested),
      JSON.stringify(interventionApplied), interventionEffective
    ]);

    return { id: pattern.lastID, ...patternData };
  }

  async getRecentPatterns(userId, days = 7, patternType = null) {
    let query = `
      SELECT * FROM pattern_detections
      WHERE user_id = ? AND detected_at >= datetime('now', '-${days} days')
    `;
    const params = [userId];

    if (patternType) {
      query += ' AND pattern_type = ?';
      params.push(patternType);
    }

    query += ' ORDER BY detected_at DESC';

    return await this.db.all(query, params);
  }

  // Focus sessions
  async startFocusSession(userId, taskId, plannedDuration = 25) {
    const session = await this.db.run(`
      INSERT INTO focus_sessions (user_id, task_id, start_time, planned_duration, energy_level_start)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, taskId, new Date().toISOString(), plannedDuration, 'moderate']); // TODO: get actual energy level

    return { id: session.lastID, userId, taskId, plannedDuration };
  }

  async endFocusSession(sessionId, sessionData = {}) {
    const {
      energyLevelEnd, focusQuality, distractionsCount = 0,
      breakCount = 0, hyperfocusDetected = false, notes = ''
    } = sessionData;

    const endTime = new Date().toISOString();

    // Calculate actual duration
    const session = await this.db.get('SELECT start_time FROM focus_sessions WHERE id = ?', [sessionId]);
    const startTime = new Date(session.start_time);
    const actualDuration = Math.round((new Date() - startTime) / (1000 * 60));

    return await this.db.run(`
      UPDATE focus_sessions
      SET end_time = ?, actual_duration = ?, energy_level_end = ?,
          focus_quality = ?, distractions_count = ?, break_count = ?,
          hyperfocus_detected = ?, notes = ?
      WHERE id = ?
    `, [
      endTime, actualDuration, energyLevelEnd, focusQuality,
      distractionsCount, breakCount, hyperfocusDetected, notes, sessionId
    ]);
  }

  // Energy tracking
  async logEnergyLevel(userId, energyData) {
    const {
      energyLevel, activity, location, timeSinceBreak,
      caffeineIntake = false, medicationTaken = false,
      focusAbility, motivationLevel, stressLevel, notes = ''
    } = energyData;

    const log = await this.db.run(`
      INSERT INTO energy_logs (
        user_id, energy_level, activity, location, time_since_break,
        caffeine_intake, medication_taken, focus_ability, motivation_level,
        stress_level, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, energyLevel, activity, location, timeSinceBreak,
      caffeineIntake, medicationTaken, focusAbility, motivationLevel,
      stressLevel, notes
    ]);

    return { id: log.lastID, ...energyData };
  }

  async getRecentEnergyLevels(userId, hours = 24) {
    return await this.db.all(`
      SELECT * FROM energy_logs
      WHERE user_id = ? AND logged_at >= datetime('now', '-${hours} hours')
      ORDER BY logged_at DESC
    `, [userId]);
  }

  // Spectrum events
  async recordSpectrumEvent(userId, eventData) {
    const {
      eventType, previousLevel, newLevel, reason,
      morningPlanningDate, hoursElapsed, attemptsCount,
      hijackActive = false, blockedApps = [], allowedApps = [],
      bypassGranted = false, bypassDurationMinutes, bypassReason
    } = eventData;

    const event = await this.db.run(`
      INSERT INTO spectrum_events (
        user_id, event_type, previous_level, new_level, reason,
        morning_planning_date, hours_elapsed, attempts_count,
        hijack_active, blocked_apps, allowed_apps,
        bypass_granted, bypass_duration_minutes, bypass_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, eventType, previousLevel, newLevel, reason,
      morningPlanningDate, hoursElapsed, attemptsCount,
      hijackActive, JSON.stringify(blockedApps), JSON.stringify(allowedApps),
      bypassGranted, bypassDurationMinutes, bypassReason
    ]);

    return { id: event.lastID, ...eventData };
  }
}

// Singleton instance
const database = new Database();

export default database;
export { Database };