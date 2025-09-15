import express from 'express';
import { ADHDPattern } from '../../shared/types.js';

const router = express.Router();

/**
 * @route POST /api/patterns/detect
 * @description Analyze user behavior data to detect ADHD patterns
 * @access Public
 */
router.post('/detect', async (req, res) => {
  try {
    const { behaviorData, userId } = req.body;

    if (!behaviorData || typeof behaviorData !== 'object') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Behavior data is required and must be an object'
      });
    }

    const patternService = req.app.locals.services.patterns;
    const detectedPatterns = patternService.detectPatterns(behaviorData);

    res.json({
      success: true,
      data: {
        patterns: detectedPatterns,
        recommendations: patternService.getPersonalizedRecommendations(
          detectedPatterns,
          behaviorData
        )
      },
      metadata: {
        userId: userId || 'anonymous',
        timestamp: new Date().toISOString(),
        patternCount: detectedPatterns.length
      }
    });
  } catch (error) {
    console.error('Pattern detection error:', error);
    res.status(500).json({
      error: 'Pattern detection failed',
      message: 'Unable to analyze behavior patterns'
    });
  }
});

/**
 * @route GET /api/patterns/interventions/:patternType
 * @description Get interventions for a specific ADHD pattern
 * @access Public
 */
router.get('/interventions/:patternType', (req, res) => {
  try {
    const { patternType } = req.params;
    const { severity = 'moderate' } = req.query;

    if (!Object.values(ADHDPattern).includes(patternType)) {
      return res.status(400).json({
        error: 'Invalid pattern type',
        message: `Pattern type must be one of: ${Object.values(ADHDPattern).join(', ')}`
      });
    }

    const patternService = req.app.locals.services.patterns;
    const interventions = patternService.getInterventionsForPattern(patternType, 0.8);

    res.json({
      success: true,
      data: {
        patternType,
        severity,
        interventions,
        description: getPatternDescription(patternType)
      }
    });
  } catch (error) {
    console.error('Interventions error:', error);
    res.status(500).json({
      error: 'Failed to get interventions',
      message: 'Unable to retrieve pattern interventions'
    });
  }
});

/**
 * @route POST /api/patterns/intervention/execute
 * @description Execute a specific intervention for a detected pattern
 * @access Public
 */
router.post('/intervention/execute', async (req, res) => {
  try {
    const { interventionType, patternType, context } = req.body;

    if (!interventionType || !patternType) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both intervention type and pattern type are required'
      });
    }

    const patternService = req.app.locals.services.patterns;
    let result;

    // Execute specific intervention based on type
    switch (interventionType) {
      case 'task_breakdown':
        result = await patternService.breakIntoMicroTasks(context);
        break;
      case 'environment_change':
        result = patternService.suggestEnvironmentalChange();
        break;
      case 'body_doubling':
        result = patternService.activateVirtualBodyDoubling();
        break;
      case 'time_anchor':
        result = patternService.provideTimeAnchors(
          context?.currentDuration || 0,
          context?.estimatedDuration || 30
        );
        break;
      case 'mindfulness':
        result = patternService.guideMindfulness();
        break;
      default:
        return res.status(400).json({
          error: 'Unknown intervention type',
          message: `Intervention type '${interventionType}' is not supported`
        });
    }

    res.json({
      success: true,
      data: result,
      metadata: {
        interventionType,
        patternType,
        executedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Intervention execution error:', error);
    res.status(500).json({
      error: 'Intervention execution failed',
      message: 'Unable to execute the requested intervention'
    });
  }
});

/**
 * @route GET /api/patterns/insights
 * @description Get insights about ADHD patterns and their management
 * @access Public
 */
router.get('/insights', (req, res) => {
  try {
    const insights = {
      patterns: Object.values(ADHDPattern).map(pattern => ({
        type: pattern,
        description: getPatternDescription(pattern),
        commonTriggers: getCommonTriggers(pattern),
        effectiveStrategies: getEffectiveStrategies(pattern),
        researchBasis: getResearchBasis(pattern)
      })),
      generalTips: [
        {
          title: 'External Structure',
          description: 'ADHD brains benefit from external organization systems and reminders',
          research: 'Barkley, R. A. (2012). Executive Functions'
        },
        {
          title: 'Task Granularity',
          description: 'Breaking tasks into 5-25 minute chunks reduces executive function load',
          research: 'Brown, T. E. (2013). A New Understanding of ADHD'
        },
        {
          title: 'Environmental Optimization',
          description: 'Minimizing distractions and optimizing stimulation levels improves focus',
          research: 'Zentall, S. S. (2006). ADHD and Education'
        }
      ]
    };

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({
      error: 'Failed to get insights',
      message: 'Unable to retrieve pattern insights'
    });
  }
});

/**
 * @route POST /api/patterns/feedback
 * @description Provide feedback on intervention effectiveness
 * @access Public
 */
router.post('/feedback', (req, res) => {
  try {
    const { interventionId, patternType, effectiveness, notes } = req.body;

    if (!interventionId || !patternType || effectiveness === undefined) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Intervention ID, pattern type, and effectiveness rating are required'
      });
    }

    const feedback = {
      id: `feedback_${Date.now()}`,
      interventionId,
      patternType,
      effectiveness: Math.max(1, Math.min(5, parseInt(effectiveness))),
      notes: notes || '',
      timestamp: new Date().toISOString(),
      processed: true
    };

    // In a real application, this would be stored in a database
    // and used to improve intervention recommendations

    res.json({
      success: true,
      data: feedback,
      message: 'Thank you for your feedback! This helps improve recommendations.'
    });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({
      error: 'Failed to process feedback',
      message: 'Unable to record intervention feedback'
    });
  }
});

// Helper functions

function getPatternDescription(pattern) {
  const descriptions = {
    [ADHDPattern.PROCRASTINATION]: 'Tendency to delay tasks, often due to executive function challenges, perfectionism, or feeling overwhelmed',
    [ADHDPattern.HYPERFOCUS]: 'Intense concentration on interesting tasks, sometimes to the exclusion of other important activities',
    [ADHDPattern.TIME_BLINDNESS]: 'Difficulty accurately perceiving and managing time, leading to underestimation of task duration',
    [ADHDPattern.TASK_SWITCHING]: 'Challenges with transitioning between different activities or shifting attention',
    [ADHDPattern.OVERWHELM]: 'Feeling paralyzed when faced with too many tasks or complex decisions',
    [ADHDPattern.PERFECTIONISM]: 'Setting unrealistically high standards that can prevent task completion or initiation'
  };

  return descriptions[pattern] || 'No description available';
}

function getCommonTriggers(pattern) {
  const triggers = {
    [ADHDPattern.PROCRASTINATION]: [
      'Unclear task requirements',
      'Perfectionist expectations',
      'Feeling overwhelmed by scope',
      'Lack of immediate consequences',
      'Boring or unstimulating tasks'
    ],
    [ADHDPattern.HYPERFOCUS]: [
      'Highly interesting or novel tasks',
      'Flow state activities',
      'Creative or problem-solving work',
      'Deadline pressure',
      'Optimal challenge level'
    ],
    [ADHDPattern.TIME_BLINDNESS]: [
      'Complex multi-step tasks',
      'Lack of external time anchors',
      'Engaging activities',
      'Stress or pressure',
      'Unfamiliar environments'
    ],
    [ADHDPattern.OVERWHELM]: [
      'Too many simultaneous demands',
      'Unclear priorities',
      'Information overload',
      'Decision fatigue',
      'High-stakes situations'
    ]
  };

  return triggers[pattern] || [];
}

function getEffectiveStrategies(pattern) {
  const strategies = {
    [ADHDPattern.PROCRASTINATION]: [
      'Break tasks into micro-steps',
      'Use the 2-minute rule',
      'Change environment',
      'Body doubling',
      'Implementation intentions (if-then planning)'
    ],
    [ADHDPattern.HYPERFOCUS]: [
      'Set protective alarms',
      'Schedule essential breaks',
      'Minimize interruptions during focus',
      'Plan transition activities',
      'Use hyperfocus for important tasks'
    ],
    [ADHDPattern.TIME_BLINDNESS]: [
      'Use visual timers',
      'Time-blocking schedules',
      'Regular time check-ins',
      'Buffer time between activities',
      'External accountability'
    ],
    [ADHDPattern.OVERWHELM]: [
      'Priority clarification (urgent/important matrix)',
      'External memory systems',
      'Mindfulness and grounding techniques',
      'Single-tasking focus',
      'Seek support and guidance'
    ]
  };

  return strategies[pattern] || [];
}

function getResearchBasis(pattern) {
  const research = {
    [ADHDPattern.PROCRASTINATION]: 'Research by Barkley (2012) shows procrastination in ADHD is linked to executive function deficits, particularly in working memory and inhibitory control.',
    [ADHDPattern.HYPERFOCUS]: 'Studies indicate hyperfocus represents a paradoxical manifestation of attention regulation difficulties in ADHD (Ashinoff & Abu-Akel, 2021).',
    [ADHDPattern.TIME_BLINDNESS]: 'Temporal processing deficits in ADHD are well-documented, with individuals showing consistent underestimation of time intervals (Barkley et al., 2001).',
    [ADHDPattern.OVERWHELM]: 'Cognitive load theory suggests that ADHD individuals reach capacity limitations more quickly due to working memory constraints (Sweller, 2011).'
  };

  return research[pattern] || 'Research basis not specified';
}

export default router;