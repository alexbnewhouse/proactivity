import { ADHDPattern, EnergyLevel, ExecutiveFunction } from '../../shared/types.js';

/**
 * Service for detecting and responding to ADHD-specific behavioral patterns
 * Based on research in executive function and cognitive behavioral interventions
 */
class ADHDPatternService {
  constructor() {
    this.patterns = new Map();
    this.interventions = new Map();
    this.initializePatternDetection();
    this.initializeInterventions();
  }

  /**
   * Initialize pattern detection algorithms based on ADHD research
   */
  initializePatternDetection() {
    this.patterns.set(ADHDPattern.PROCRASTINATION, {
      triggers: [
        'task_delay_minutes > 30',
        'task_complexity === "overwhelming"',
        'completion_rate < 0.3',
        'avoidance_behaviors > 2'
      ],
      indicators: [
        'multiple_tab_switching',
        'social_media_checks',
        'cleaning_organizing_instead',
        'research_rabbit_holes'
      ],
      severity_thresholds: {
        mild: { delay_minutes: 30, avoidance_count: 2 },
        moderate: { delay_minutes: 120, avoidance_count: 4 },
        severe: { delay_minutes: 480, avoidance_count: 8 }
      }
    });

    this.patterns.set(ADHDPattern.HYPERFOCUS, {
      triggers: [
        'continuous_work_minutes > 90',
        'task_switching_rate < 0.1',
        'break_frequency === 0',
        'time_awareness === false'
      ],
      indicators: [
        'missed_meal_notifications',
        'ignored_break_reminders',
        'bathroom_avoidance',
        'social_isolation'
      ],
      benefits: ['high_productivity', 'flow_state', 'creative_insights'],
      risks: ['burnout', 'physical_strain', 'neglect_other_tasks']
    });

    this.patterns.set(ADHDPattern.TIME_BLINDNESS, {
      triggers: [
        'time_estimation_error > 50%',
        'deadline_awareness === false',
        'schedule_adherence < 0.4'
      ],
      indicators: [
        'late_to_meetings',
        'underestimated_task_duration',
        'rushed_submissions',
        'forgotten_deadlines'
      ]
    });

    this.patterns.set(ADHDPattern.OVERWHELM, {
      triggers: [
        'open_tasks > 15',
        'cognitive_load_score > 8',
        'decision_paralysis === true'
      ],
      indicators: [
        'increased_anxiety',
        'decreased_task_initiation',
        'perfectionism_spikes',
        'shutdown_behaviors'
      ]
    });
  }

  /**
   * Initialize evidence-based interventions for each pattern
   */
  initializeInterventions() {
    this.interventions.set(ADHDPattern.PROCRASTINATION, {
      immediate: [
        {
          type: 'task_reduction',
          action: 'break_into_micro_tasks',
          message: 'Let\'s make this less overwhelming. I\'ll break this into tiny steps.',
          implementation: this.breakIntoMicroTasks.bind(this)
        },
        {
          type: 'environmental_change',
          action: 'suggest_location_change',
          message: 'Sometimes a change of scenery helps. Try moving to a different spot?',
          implementation: this.suggestEnvironmentalChange.bind(this)
        },
        {
          type: 'body_doubling',
          action: 'activate_virtual_presence',
          message: 'I\'ll stay with you while you work on this. You\'re not alone!',
          implementation: this.activateVirtualBodyDoubling.bind(this)
        }
      ],
      cognitive: [
        {
          type: 'reframe_catastrophizing',
          prompt: 'What would you tell a friend in this situation?',
          technique: 'cognitive_restructuring'
        },
        {
          type: 'implementation_intention',
          prompt: 'If/when X happens, then I will do Y',
          technique: 'if_then_planning'
        }
      ]
    });

    this.interventions.set(ADHDPattern.HYPERFOCUS, {
      supportive: [
        {
          type: 'optimize_environment',
          action: 'minimize_interruptions',
          message: 'I see you\'re in the zone! I\'ll hold non-urgent notifications.',
          implementation: this.optimizeHyperfocusEnvironment.bind(this)
        },
        {
          type: 'gentle_reminders',
          action: 'health_check_ins',
          message: 'You\'ve been focused for 2 hours. Quick water break?',
          schedule: [90, 150, 210] // minutes
        }
      ],
      protective: [
        {
          type: 'burnout_prevention',
          action: 'suggest_stopping_point',
          message: 'You\'ve made amazing progress! Consider a natural stopping point.',
          trigger: 'work_duration > 180'
        }
      ]
    });

    this.interventions.set(ADHDPattern.TIME_BLINDNESS, {
      structural: [
        {
          type: 'time_anchoring',
          action: 'provide_time_checks',
          message: 'Time check: It\'s been 30 minutes. You estimated 20 for this task.',
          implementation: this.provideTimeAnchors.bind(this)
        },
        {
          type: 'deadline_visualization',
          action: 'show_time_remaining',
          message: 'Your deadline is in 3 days, 14 hours. Here\'s what needs to happen.',
          implementation: this.visualizeDeadlines.bind(this)
        }
      ]
    });

    this.interventions.set(ADHDPattern.OVERWHELM, {
      immediate: [
        {
          type: 'cognitive_load_reduction',
          action: 'external_memory',
          message: 'Let me hold onto these details for you. Focus on just one thing.',
          implementation: this.createExternalMemory.bind(this)
        },
        {
          type: 'priority_clarification',
          action: 'urgent_important_matrix',
          message: 'Let\'s figure out what actually needs attention right now.',
          implementation: this.clarifyPriorities.bind(this)
        }
      ],
      grounding: [
        {
          type: 'mindfulness_prompt',
          action: 'breathing_reminder',
          message: 'Take 3 deep breaths. In for 4, hold for 4, out for 6.',
          implementation: this.guideMindfulness.bind(this)
        }
      ]
    });
  }

  /**
   * Detect ADHD patterns from user behavior data
   */
  detectPatterns(behaviorData) {
    const detectedPatterns = [];

    for (const [patternType, patternConfig] of this.patterns) {
      const likelihood = this.calculatePatternLikelihood(behaviorData, patternConfig);

      if (likelihood > 0.6) {
        detectedPatterns.push({
          type: patternType,
          likelihood,
          severity: this.calculateSeverity(behaviorData, patternConfig),
          triggers: this.identifyActiveTriggers(behaviorData, patternConfig),
          recommendedInterventions: this.getInterventionsForPattern(patternType, likelihood)
        });
      }
    }

    return detectedPatterns;
  }

  /**
   * Calculate likelihood of a specific pattern based on behavior data
   */
  calculatePatternLikelihood(behaviorData, patternConfig) {
    const { triggers, indicators } = patternConfig;
    let score = 0;
    let maxScore = 0;

    // Evaluate triggers
    triggers.forEach(trigger => {
      maxScore += 1;
      if (this.evaluateTrigger(trigger, behaviorData)) {
        score += 1;
      }
    });

    // Evaluate indicators
    if (indicators) {
      indicators.forEach(indicator => {
        maxScore += 0.5;
        if (behaviorData[indicator] === true) {
          score += 0.5;
        }
      });
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Evaluate a specific trigger condition
   */
  evaluateTrigger(trigger, data) {
    try {
      // Simple expression evaluator for trigger conditions
      const expression = trigger.replace(/([a-z_]+)/g, (match) => {
        return data[match] !== undefined ? JSON.stringify(data[match]) : 'false';
      });

      // eslint-disable-next-line no-eval
      return eval(expression);
    } catch (error) {
      console.warn('Error evaluating trigger:', trigger, error);
      return false;
    }
  }

  /**
   * Calculate pattern severity
   */
  calculateSeverity(behaviorData, patternConfig) {
    if (!patternConfig.severity_thresholds) return 'moderate';

    const { mild, moderate, severe } = patternConfig.severity_thresholds;

    for (const [key, value] of Object.entries(severe)) {
      if (behaviorData[key] >= value) return 'severe';
    }

    for (const [key, value] of Object.entries(moderate)) {
      if (behaviorData[key] >= value) return 'moderate';
    }

    return 'mild';
  }

  /**
   * Get appropriate interventions for detected pattern
   */
  getInterventionsForPattern(patternType, likelihood) {
    const interventions = this.interventions.get(patternType);
    if (!interventions) return [];

    const recommended = [];

    // Always include immediate interventions for high likelihood patterns
    if (likelihood > 0.8 && interventions.immediate) {
      recommended.push(...interventions.immediate);
    }

    // Add cognitive interventions for sustained patterns
    if (likelihood > 0.7 && interventions.cognitive) {
      recommended.push(...interventions.cognitive);
    }

    // Add supportive interventions for beneficial patterns (like hyperfocus)
    if (interventions.supportive) {
      recommended.push(...interventions.supportive);
    }

    return recommended.slice(0, 3); // Limit to avoid overwhelming user
  }

  // Intervention Implementation Methods

  async breakIntoMicroTasks(taskData) {
    // Integration point with TaskBreakdownService
    return {
      action: 'task_breakdown_initiated',
      message: 'Breaking this down into smaller, manageable pieces...',
      result: await this.taskBreakdownService?.breakdownTask(taskData.task, {
        currentEnergyLevel: EnergyLevel.LOW,
        preferredComplexity: 'micro',
        executiveFunctionChallenges: [ExecutiveFunction.TASK_INITIATION]
      })
    };
  }

  suggestEnvironmentalChange() {
    const suggestions = [
      'Try working from the kitchen table',
      'Move to a coffee shop or library',
      'Change your lighting or music',
      'Work standing up for a bit',
      'Try the 15-minute rule: just 15 minutes in a new spot'
    ];

    return {
      action: 'environment_change_suggested',
      message: suggestions[Math.floor(Math.random() * suggestions.length)],
      options: suggestions
    };
  }

  activateVirtualBodyDoubling() {
    return {
      action: 'body_doubling_activated',
      message: 'I\'m here with you. Let\'s tackle this together, one small step at a time.',
      features: [
        'periodic_check_ins',
        'progress_acknowledgment',
        'gentle_accountability',
        'celebration_of_wins'
      ],
      checkInInterval: 15 // minutes
    };
  }

  optimizeHyperfocusEnvironment() {
    return {
      action: 'hyperfocus_optimization',
      message: 'Hyperfocus detected! Optimizing your environment to support this state.',
      optimizations: [
        'notifications_silenced',
        'interruptions_blocked',
        'health_reminders_queued',
        'recovery_plan_prepared'
      ]
    };
  }

  provideTimeAnchors(currentDuration, estimatedDuration) {
    const ratio = currentDuration / estimatedDuration;
    let message = `Time check: ${currentDuration} minutes elapsed.`;

    if (ratio > 1.5) {
      message += ' This is taking longer than expected. Consider if you need to adjust the scope or take a break.';
    } else if (ratio < 0.5) {
      message += ' You\'re moving faster than expected! Great job.';
    }

    return {
      action: 'time_anchor_provided',
      message,
      timeData: {
        elapsed: currentDuration,
        estimated: estimatedDuration,
        ratio
      }
    };
  }

  visualizeDeadlines(deadline, currentProgress) {
    const timeRemaining = new Date(deadline) - new Date();
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));

    return {
      action: 'deadline_visualized',
      message: `${hoursRemaining} hours until deadline. Current progress: ${currentProgress}%`,
      visualization: {
        timeRemaining: hoursRemaining,
        progress: currentProgress,
        paceNeeded: this.calculateRequiredPace(currentProgress, hoursRemaining)
      }
    };
  }

  createExternalMemory(tasks) {
    return {
      action: 'external_memory_created',
      message: 'I\'ve captured all these details. You can focus on just the next step.',
      storage: {
        tasks: tasks.map(t => ({ ...t, stored: true })),
        accessMethod: 'ask_me_anytime',
        focusTask: tasks.find(t => t.priority === 'highest') || tasks[0]
      }
    };
  }

  clarifyPriorities(tasks) {
    const categorized = {
      urgent_important: [],
      important_not_urgent: [],
      urgent_not_important: [],
      neither: []
    };

    tasks.forEach(task => {
      const category = this.categorizePriority(task);
      categorized[category].push(task);
    });

    return {
      action: 'priorities_clarified',
      message: 'Here\'s what actually needs your attention right now:',
      matrix: categorized,
      nextAction: categorized.urgent_important[0] || categorized.important_not_urgent[0]
    };
  }

  guideMindfulness() {
    return {
      action: 'mindfulness_guided',
      message: 'Let\'s ground yourself with some breathing. Follow along:',
      sequence: [
        { instruction: 'Breathe in slowly for 4 counts', duration: 4000 },
        { instruction: 'Hold for 4 counts', duration: 4000 },
        { instruction: 'Breathe out slowly for 6 counts', duration: 6000 },
        { instruction: 'Pause', duration: 2000 }
      ],
      cycles: 3
    };
  }

  // Utility methods

  calculateRequiredPace(currentProgress, hoursRemaining) {
    const remainingWork = 100 - currentProgress;
    return hoursRemaining > 0 ? remainingWork / hoursRemaining : Infinity;
  }

  categorizePriority(task) {
    const urgent = task.deadline && new Date(task.deadline) - new Date() < 24 * 60 * 60 * 1000;
    const important = task.importance > 7 || task.category === 'dissertation';

    if (urgent && important) return 'urgent_important';
    if (!urgent && important) return 'important_not_urgent';
    if (urgent && !important) return 'urgent_not_important';
    return 'neither';
  }

  /**
   * Get pattern-specific recommendations for user
   */
  getPersonalizedRecommendations(userPatterns, currentContext) {
    const recommendations = [];

    userPatterns.forEach(pattern => {
      const patternRecommendations = this.generateRecommendationsForPattern(
        pattern,
        currentContext
      );
      recommendations.push(...patternRecommendations);
    });

    return this.prioritizeRecommendations(recommendations);
  }

  generateRecommendationsForPattern(pattern, context) {
    const recommendations = [];

    switch (pattern.type) {
      case ADHDPattern.PROCRASTINATION:
        recommendations.push({
          type: 'environmental',
          suggestion: 'Try the 2-minute rule: if it takes less than 2 minutes, do it now',
          confidence: 0.8
        });
        break;

      case ADHDPattern.TIME_BLINDNESS:
        recommendations.push({
          type: 'structural',
          suggestion: 'Use visual timers and set hourly check-ins',
          confidence: 0.9
        });
        break;

      case ADHDPattern.HYPERFOCUS:
        recommendations.push({
          type: 'protective',
          suggestion: 'Set "hyperfocus alarms" every 90 minutes for health breaks',
          confidence: 0.85
        });
        break;
    }

    return recommendations;
  }

  prioritizeRecommendations(recommendations) {
    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 recommendations
  }
}

export default ADHDPatternService;