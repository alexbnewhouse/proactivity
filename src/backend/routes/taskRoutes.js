import express from 'express';
import { TaskComplexity, EnergyLevel, ExecutiveFunction } from '../../shared/types.js';

const router = express.Router();

/**
 * @route POST /api/tasks/breakdown
 * @description Break down a complex task into ADHD-friendly micro-tasks
 * @access Public (will be protected in production)
 */
router.post('/breakdown', async (req, res) => {
  try {
    const { task, context = {} } = req.body;

    if (!task || typeof task !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Task description is required and must be a string'
      });
    }

    const taskBreakdownService = req.app.locals.services.taskBreakdown;

    // Validate context parameters
    const validatedContext = {
      currentEnergyLevel: Object.values(EnergyLevel).includes(context.currentEnergyLevel)
        ? context.currentEnergyLevel
        : EnergyLevel.MODERATE,
      availableTime: Math.max(5, Math.min(240, parseInt(context.availableTime) || 60)),
      preferredComplexity: Object.values(TaskComplexity).includes(context.preferredComplexity)
        ? context.preferredComplexity
        : TaskComplexity.SIMPLE,
      executiveFunctionChallenges: Array.isArray(context.executiveFunctionChallenges)
        ? context.executiveFunctionChallenges.filter(ef => Object.values(ExecutiveFunction).includes(ef))
        : [],
      currentProject: context.currentProject || 'dissertation'
    };

    const breakdown = await taskBreakdownService.breakdownTask(task, validatedContext);

    res.json({
      success: true,
      data: breakdown,
      metadata: {
        originalTask: task,
        context: validatedContext,
        timestamp: new Date().toISOString(),
        totalMicroTasks: breakdown.microTasks.length,
        estimatedTotalTime: breakdown.totalEstimatedTime
      }
    });
  } catch (error) {
    console.error('Task breakdown error:', error);
    res.status(500).json({
      error: 'Task breakdown failed',
      message: 'Unable to break down the task. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/tasks/suggestions
 * @description Get personalized task suggestions based on current context
 * @access Public
 */
router.get('/suggestions', async (req, res) => {
  try {
    const {
      energyLevel = EnergyLevel.MODERATE,
      availableTime = 30,
      category,
      difficulty
    } = req.query;

    // Generate contextual task suggestions
    const suggestions = generateTaskSuggestions({
      energyLevel,
      availableTime: parseInt(availableTime),
      category,
      difficulty
    });

    res.json({
      success: true,
      data: suggestions,
      metadata: {
        count: suggestions.length,
        energyLevel,
        availableTime: parseInt(availableTime),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Task suggestions error:', error);
    res.status(500).json({
      error: 'Failed to generate suggestions',
      message: 'Unable to generate task suggestions'
    });
  }
});

/**
 * @route POST /api/tasks/start
 * @description Start tracking a task
 * @access Public
 */
router.post('/start', async (req, res) => {
  try {
    const { taskId, userId, estimatedDuration } = req.body;

    if (!taskId) {
      return res.status(400).json({
        error: 'Task ID is required'
      });
    }

    // Start task tracking
    const taskSession = {
      id: `session_${Date.now()}`,
      taskId,
      userId: userId || 'anonymous',
      startTime: new Date().toISOString(),
      estimatedDuration: estimatedDuration || 25,
      status: 'active'
    };

    // In a real app, this would be stored in a database
    // For now, we'll just return the session info

    res.json({
      success: true,
      data: taskSession,
      message: 'Task started successfully'
    });
  } catch (error) {
    console.error('Start task error:', error);
    res.status(500).json({
      error: 'Failed to start task',
      message: 'Unable to start task tracking'
    });
  }
});

/**
 * @route POST /api/tasks/complete
 * @description Mark a task as completed
 * @access Public
 */
router.post('/complete', async (req, res) => {
  try {
    const { taskId, userId, actualDuration, difficulty, notes } = req.body;

    if (!taskId) {
      return res.status(400).json({
        error: 'Task ID is required'
      });
    }

    const completion = {
      id: `completion_${Date.now()}`,
      taskId,
      userId: userId || 'anonymous',
      completedAt: new Date().toISOString(),
      actualDuration: actualDuration || null,
      difficulty: difficulty || null,
      notes: notes || '',
      celebrationMessage: generateCelebrationMessage()
    };

    res.json({
      success: true,
      data: completion,
      message: completion.celebrationMessage
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({
      error: 'Failed to complete task',
      message: 'Unable to mark task as completed'
    });
  }
});

/**
 * @route GET /api/tasks/templates
 * @description Get task breakdown templates for common dissertation activities
 * @access Public
 */
router.get('/templates', (req, res) => {
  try {
    const templates = getDissertationTaskTemplates();

    res.json({
      success: true,
      data: templates,
      metadata: {
        count: templates.length,
        categories: [...new Set(templates.map(t => t.category))]
      }
    });
  } catch (error) {
    console.error('Templates error:', error);
    res.status(500).json({
      error: 'Failed to load templates',
      message: 'Unable to load task templates'
    });
  }
});

// Helper functions

function generateTaskSuggestions({ energyLevel, availableTime, category, difficulty }) {
  const suggestions = [];

  // Energy-based suggestions
  const energySuggestions = {
    [EnergyLevel.HIGH]: [
      {
        title: 'Draft a complex section',
        description: 'Use your high energy for challenging writing',
        estimatedMinutes: Math.min(availableTime, 60),
        complexity: TaskComplexity.COMPLEX,
        executiveFunctionDemands: [ExecutiveFunction.PLANNING, ExecutiveFunction.SUSTAINED_ATTENTION]
      },
      {
        title: 'Conduct data analysis',
        description: 'Perfect time for analytical thinking',
        estimatedMinutes: Math.min(availableTime, 45),
        complexity: TaskComplexity.COMPLEX,
        executiveFunctionDemands: [ExecutiveFunction.COGNITIVE_FLEXIBILITY, ExecutiveFunction.WORKING_MEMORY]
      }
    ],
    [EnergyLevel.MODERATE]: [
      {
        title: 'Edit existing content',
        description: 'Review and improve your writing',
        estimatedMinutes: Math.min(availableTime, 30),
        complexity: TaskComplexity.MODERATE,
        executiveFunctionDemands: [ExecutiveFunction.SUSTAINED_ATTENTION]
      },
      {
        title: 'Organize references',
        description: 'Structure your research materials',
        estimatedMinutes: Math.min(availableTime, 25),
        complexity: TaskComplexity.SIMPLE,
        executiveFunctionDemands: [ExecutiveFunction.ORGANIZATION]
      }
    ],
    [EnergyLevel.LOW]: [
      {
        title: 'Read and highlight',
        description: 'Light reading with note-taking',
        estimatedMinutes: Math.min(availableTime, 20),
        complexity: TaskComplexity.SIMPLE,
        executiveFunctionDemands: [ExecutiveFunction.SUSTAINED_ATTENTION]
      },
      {
        title: 'Format citations',
        description: 'Simple formatting tasks',
        estimatedMinutes: Math.min(availableTime, 15),
        complexity: TaskComplexity.MICRO,
        executiveFunctionDemands: [ExecutiveFunction.TASK_INITIATION]
      }
    ],
    [EnergyLevel.DEPLETED]: [
      {
        title: 'Review tomorrow\'s goals',
        description: 'Quick planning for when refreshed',
        estimatedMinutes: Math.min(availableTime, 10),
        complexity: TaskComplexity.MICRO,
        executiveFunctionDemands: [ExecutiveFunction.PLANNING]
      }
    ]
  };

  const energyBasedTasks = energySuggestions[energyLevel] || energySuggestions[EnergyLevel.MODERATE];
  suggestions.push(...energyBasedTasks);

  // Add universal quick tasks
  suggestions.push(
    {
      title: 'Quick brain dump',
      description: 'Write down all thoughts about your research',
      estimatedMinutes: 10,
      complexity: TaskComplexity.MICRO,
      executiveFunctionDemands: [ExecutiveFunction.TASK_INITIATION]
    },
    {
      title: 'Set tomorrow\'s intention',
      description: 'Plan one specific goal for tomorrow',
      estimatedMinutes: 5,
      complexity: TaskComplexity.MICRO,
      executiveFunctionDemands: [ExecutiveFunction.PLANNING]
    }
  );

  return suggestions.slice(0, 5).map((task, index) => ({
    ...task,
    id: `suggestion_${Date.now()}_${index}`,
    source: 'ai_generated',
    adhdOptimized: true,
    motivationBooster: getRandomMotivation()
  }));
}

function generateCelebrationMessage() {
  const messages = [
    '🎉 Fantastic work! You completed that task!',
    '⭐ Amazing! Your persistence paid off!',
    '🚀 Look at you crushing your goals!',
    '💪 Your ADHD brain is powerful and capable!',
    '🌟 Every task completed is progress toward your dissertation!',
    '👏 You should be proud of this accomplishment!',
    '🔥 You\'re building momentum - keep it up!',
    '💎 Small steps lead to big achievements!'
  ];

  return messages[Math.floor(Math.random() * messages.length)];
}

function getRandomMotivation() {
  const motivations = [
    'You\'ve got this! 💪',
    'Progress over perfection! ✨',
    'Your future self will thank you! 🙏',
    'Every step counts! 👣',
    'You\'re stronger than you think! 🦾'
  ];

  return motivations[Math.floor(Math.random() * motivations.length)];
}

function getDissertationTaskTemplates() {
  return [
    {
      id: 'literature_review',
      name: 'Literature Review Session',
      category: 'research',
      description: 'Systematic approach to reviewing academic literature',
      microTasks: [
        {
          title: 'Set review focus',
          description: 'Define specific research question or theme to explore',
          estimatedMinutes: 5,
          complexity: TaskComplexity.MICRO
        },
        {
          title: 'Search for papers',
          description: 'Use academic databases to find relevant sources',
          estimatedMinutes: 15,
          complexity: TaskComplexity.SIMPLE
        },
        {
          title: 'Quick screen abstracts',
          description: 'Skim abstracts to identify most relevant papers',
          estimatedMinutes: 10,
          complexity: TaskComplexity.SIMPLE
        },
        {
          title: 'Read one key paper',
          description: 'Deep read of the most promising source',
          estimatedMinutes: 25,
          complexity: TaskComplexity.MODERATE
        },
        {
          title: 'Take structured notes',
          description: 'Document key findings and insights',
          estimatedMinutes: 15,
          complexity: TaskComplexity.SIMPLE
        }
      ]
    },
    {
      id: 'writing_session',
      name: 'Focused Writing Session',
      category: 'writing',
      description: 'Structured approach to dissertation writing',
      microTasks: [
        {
          title: 'Review outline',
          description: 'Look at your outline for the section you\'re writing',
          estimatedMinutes: 5,
          complexity: TaskComplexity.MICRO
        },
        {
          title: 'Write opening sentence',
          description: 'Craft the first sentence of your section',
          estimatedMinutes: 5,
          complexity: TaskComplexity.SIMPLE
        },
        {
          title: 'Draft one paragraph',
          description: 'Write a complete paragraph without editing',
          estimatedMinutes: 15,
          complexity: TaskComplexity.MODERATE
        },
        {
          title: 'Add supporting evidence',
          description: 'Include citations and examples',
          estimatedMinutes: 10,
          complexity: TaskComplexity.SIMPLE
        },
        {
          title: 'Quick revision pass',
          description: 'Read through and make basic improvements',
          estimatedMinutes: 10,
          complexity: TaskComplexity.SIMPLE
        }
      ]
    },
    {
      id: 'data_analysis',
      name: 'Data Analysis Session',
      category: 'analysis',
      description: 'Systematic approach to analyzing research data',
      microTasks: [
        {
          title: 'Define analysis question',
          description: 'Clarify what you want to learn from the data',
          estimatedMinutes: 5,
          complexity: TaskComplexity.MICRO
        },
        {
          title: 'Prepare data',
          description: 'Clean and organize data for analysis',
          estimatedMinutes: 15,
          complexity: TaskComplexity.MODERATE
        },
        {
          title: 'Run initial analysis',
          description: 'Perform basic statistical or qualitative analysis',
          estimatedMinutes: 20,
          complexity: TaskComplexity.COMPLEX
        },
        {
          title: 'Interpret results',
          description: 'Make sense of what the analysis shows',
          estimatedMinutes: 15,
          complexity: TaskComplexity.MODERATE
        },
        {
          title: 'Document findings',
          description: 'Write up key insights and conclusions',
          estimatedMinutes: 10,
          complexity: TaskComplexity.SIMPLE
        }
      ]
    }
  ];
}

export default router;