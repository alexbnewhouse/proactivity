import express from 'express';
import TodoQualityValidationService from '../services/todoQualityValidationService.js';

const router = express.Router();
const todoValidator = new TodoQualityValidationService();

// Check if morning planning is required for today
router.get('/status', async (req, res) => {
  try {
    const userId = 1; // Default user for now
    const database = req.app.locals.services.database;
    const enforcementService = req.app.locals.services.enforcement;

    const today = new Date().toISOString().split('T')[0];
    const isComplete = await database.isMorningPlanningComplete(userId, today);

    if (isComplete) {
      return res.json({
        required: false,
        completed: true,
        message: 'Morning planning already completed for today'
      });
    }

    // Get enforcement status
    const enforcementStatus = enforcementService.getEnforcementStatus(userId);

    res.json({
      required: true,
      completed: false,
      spectrumLevel: enforcementStatus.currentLevel || 1,
      startTime: enforcementStatus.startTime,
      minutesElapsed: enforcementStatus.minutesElapsed || 0,
      escalationCount: enforcementStatus.escalationCount || 0,
      message: 'Morning planning required',
      enforcement: enforcementStatus
    });

  } catch (error) {
    console.error('Error checking morning planning status:', error);
    res.status(500).json({
      error: 'Failed to check morning planning status',
      required: false // Fail gracefully
    });
  }
});

// Create daily plan
router.post('/', async (req, res) => {
  try {
    const userId = 1; // Default user for now
    const database = req.app.locals.services.database;
    const spectrumService = req.app.locals.services.spectrum;

    const {
      dailyGoal,
      energyLevel,
      availableTimeMinutes,
      tasks,
      planningDurationMinutes,
      planDate
    } = req.body;

    // Validate required fields
    if (!dailyGoal || !tasks || tasks.length === 0) {
      return res.status(400).json({
        error: 'Daily goal and at least one task are required'
      });
    }

    // Validate todo quality and provide feedback
    const qualityValidation = todoValidator.validateTodoList(tasks);

    // If quality is poor, suggest improvements
    if (qualityValidation.averageQualityScore < 50) {
      return res.status(400).json({
        error: 'Todo quality needs improvement for ADHD effectiveness',
        qualityValidation,
        message: 'Please review the suggestions and improve your todos before proceeding'
      });
    }

    // Create daily plan
    const planData = {
      energyLevel,
      availableTimeMinutes,
      dailyGoal,
      planningDurationMinutes
    };

    const dailyPlan = await database.createDailyPlan(userId, planDate, planData);

    // Create tasks and link to daily plan
    const createdTasks = [];
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const taskData = {
        title: task.title,
        description: task.description,
        estimatedMinutes: task.estimatedMinutes,
        category: task.category,
        priority: task.priority,
        energyRequired: task.energyRequired,
        aiGenerated: task.aiGenerated || false,
        executiveFunctionDemands: task.executiveFunctionDemands || [],
        toolsNeeded: task.toolsNeeded || [],
        completionCriteria: task.completionCriteria || '',
        motivationBooster: task.motivationBooster || ''
      };

      const createdTask = await database.createTask(userId, taskData);

      // Link task to daily plan
      await database.getDb().run(`
        INSERT INTO daily_plan_tasks (daily_plan_id, task_id, planned_order)
        VALUES (?, ?, ?)
      `, [dailyPlan.id, createdTask.id, i + 1]);

      createdTasks.push(createdTask);
    }

    // Complete the daily plan
    await database.completeDailyPlan(userId, planDate);

    // Complete enforcement (this will reset spectrum level and deactivate browser enforcement)
    await req.app.locals.services.enforcement.completeEnforcementForUser(userId);

    res.json({
      success: true,
      message: 'Morning planning completed successfully!',
      dailyPlan: {
        ...dailyPlan,
        tasks: createdTasks
      }
    });

  } catch (error) {
    console.error('Error creating daily plan:', error);
    res.status(500).json({
      error: 'Failed to create daily plan',
      details: error.message
    });
  }
});

// Request emergency bypass
router.post('/bypass', async (req, res) => {
  try {
    const userId = 1; // Default user for now
    const enforcementService = req.app.locals.services.enforcement;

    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        error: 'Bypass reason must be at least 10 characters long'
      });
    }

    const result = await enforcementService.handleEmergencyBypass(userId, reason);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        duration: result.duration,
        warning: 'This bypass is temporary. Planning will be required again soon.'
      });
    } else {
      res.status(403).json({
        success: false,
        error: result.message
      });
    }

  } catch (error) {
    console.error('Error processing bypass request:', error);
    res.status(500).json({
      error: 'Failed to process bypass request',
      details: error.message
    });
  }
});

// Escalate spectrum level
router.post('/escalate', async (req, res) => {
  try {
    const userId = 1; // Default user for now
    const database = req.app.locals.services.database;
    const spectrumService = req.app.locals.services.spectrum;

    const { reason, data } = req.body;

    const currentLevel = await spectrumService.getCurrentSpectrumLevel(userId);
    const newLevel = await spectrumService.escalateSpectrumLevel(userId, reason, data);

    // Record spectrum event
    await database.recordSpectrumEvent(userId, {
      eventType: 'level_escalation',
      previousLevel: currentLevel,
      newLevel: newLevel,
      reason: reason,
      hoursElapsed: data?.elapsedTime ? Math.round(data.elapsedTime / 60 * 100) / 100 : null
    });

    res.json({
      success: true,
      message: `Spectrum level escalated to ${newLevel}`,
      previousLevel: currentLevel,
      newLevel: newLevel,
      reason: reason
    });

  } catch (error) {
    console.error('Error escalating spectrum level:', error);
    res.status(500).json({
      error: 'Failed to escalate spectrum level',
      details: error.message
    });
  }
});

// Validate todo quality
router.post('/validate-todos', async (req, res) => {
  try {
    const { todos } = req.body;

    if (!todos || !Array.isArray(todos) || todos.length === 0) {
      return res.status(400).json({
        error: 'Array of todos is required'
      });
    }

    const validation = todoValidator.validateTodoList(todos);

    res.json({
      success: true,
      validation,
      message: `Todo list quality: ${validation.overallFriendliness} (${validation.averageQualityScore}/100)`
    });

  } catch (error) {
    console.error('Error validating todos:', error);
    res.status(500).json({
      error: 'Failed to validate todos',
      details: error.message
    });
  }
});

// Validate individual todo
router.post('/validate-todo', async (req, res) => {
  try {
    const { todo } = req.body;

    if (!todo) {
      return res.status(400).json({
        error: 'Todo object is required'
      });
    }

    const validation = todoValidator.validateTodo(todo);

    res.json({
      success: true,
      validation,
      message: `Todo quality: ${validation.adhdFriendliness} (${validation.qualityScore}/100)`
    });

  } catch (error) {
    console.error('Error validating todo:', error);
    res.status(500).json({
      error: 'Failed to validate todo',
      details: error.message
    });
  }
});

// Get todo improvement suggestions
router.post('/improve-todo', async (req, res) => {
  try {
    const { todo } = req.body;

    if (!todo) {
      return res.status(400).json({
        error: 'Todo object is required'
      });
    }

    const validation = todoValidator.validateTodo(todo);

    res.json({
      success: true,
      original: todo,
      improved: validation.improvedVersion,
      breakdown: validation.breakdown,
      issues: validation.issues,
      suggestions: validation.suggestions,
      qualityScore: validation.qualityScore
    });

  } catch (error) {
    console.error('Error improving todo:', error);
    res.status(500).json({
      error: 'Failed to improve todo',
      details: error.message
    });
  }
});

export default router;