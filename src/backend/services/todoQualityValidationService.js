/**
 * Todo Quality Validation Service
 *
 * Validates and improves todo items to be ADHD-friendly using specific criteria:
 * - Clear, actionable language
 * - Appropriate scope and complexity
 * - Realistic time estimates
 * - Proper breakdown of large tasks
 * - Executive function considerations
 */
class TodoQualityValidationService {
  constructor() {
    // Quality criteria weights
    this.qualityCriteria = {
      clarity: { weight: 0.25, importance: 'critical' },
      actionability: { weight: 0.25, importance: 'critical' },
      scope: { weight: 0.20, importance: 'high' },
      timeEstimate: { weight: 0.15, importance: 'medium' },
      specificity: { weight: 0.15, importance: 'medium' }
    };

    // ADHD-specific patterns
    this.problematicPatterns = {
      vague: [
        /work on/i, /deal with/i, /handle/i, /figure out/i, /sort out/i,
        /look into/i, /check/i, /review/i, /think about/i, /consider/i
      ],
      overwhelming: [
        /everything/i, /all/i, /complete/i, /finish/i, /entire/i,
        /whole/i, /full/i, /comprehensive/i
      ],
      perfectionist: [
        /perfect/i, /flawless/i, /comprehensive/i, /thorough/i,
        /complete overhaul/i, /total/i
      ],
      timeBlind: [
        /quickly/i, /fast/i, /asap/i, /immediately/i, /urgent/i,
        /rush/i, /hurry/i
      ]
    };

    // Positive action verbs for ADHD brains
    this.actionVerbs = [
      'write', 'create', 'draft', 'outline', 'list', 'research', 'read',
      'call', 'email', 'schedule', 'organize', 'sort', 'file', 'update',
      'edit', 'revise', 'format', 'calculate', 'analyze', 'compare',
      'test', 'verify', 'confirm', 'send', 'submit', 'post', 'publish'
    ];

    // Time estimation guidelines (in minutes)
    this.timeEstimationGuidelines = {
      micro: { min: 2, max: 10, description: 'Quick, simple tasks' },
      small: { min: 15, max: 30, description: 'Focused work blocks' },
      medium: { min: 45, max: 90, description: 'Complex tasks' },
      large: { min: 120, max: 240, description: 'Project components' },
      oversized: { min: 240, max: Infinity, description: 'Needs breakdown' }
    };
  }

  /**
   * Validate and score a todo item
   */
  validateTodo(todo) {
    const validation = {
      originalTodo: todo,
      qualityScore: 0,
      adhdFriendliness: 'poor',
      issues: [],
      suggestions: [],
      improvedVersion: null,
      breakdown: null
    };

    // Analyze different aspects
    const clarityScore = this.analyzeClarityAndActionability(todo, validation);
    const scopeScore = this.analyzeScopeAndComplexity(todo, validation);
    const timeScore = this.analyzeTimeEstimate(todo, validation);
    const specificityScore = this.analyzeSpecificity(todo, validation);

    // Calculate weighted score
    validation.qualityScore = Math.round(
      (clarityScore * this.qualityCriteria.clarity.weight +
       scopeScore * this.qualityCriteria.scope.weight +
       timeScore * this.qualityCriteria.timeEstimate.weight +
       specificityScore * this.qualityCriteria.specificity.weight) * 100
    );

    // Determine ADHD friendliness
    validation.adhdFriendliness = this.determineAdhdFriendliness(validation.qualityScore);

    // Generate improved version if needed
    if (validation.qualityScore < 70) {
      validation.improvedVersion = this.generateImprovedTodo(todo, validation);
    }

    // Generate breakdown for large tasks
    if (todo.estimatedMinutes && todo.estimatedMinutes > 60) {
      validation.breakdown = this.generateTaskBreakdown(todo);
    }

    return validation;
  }

  /**
   * Analyze clarity and actionability
   */
  analyzeClarityAndActionability(todo, validation) {
    let score = 100;

    const title = todo.title || todo.description || '';

    // Check for vague language
    const vagueMatches = this.problematicPatterns.vague.filter(pattern => pattern.test(title));
    if (vagueMatches.length > 0) {
      score -= 30;
      validation.issues.push({
        type: 'vague_language',
        severity: 'high',
        message: 'Contains vague language that makes it unclear what to do',
        examples: vagueMatches.map(p => p.source)
      });
      validation.suggestions.push({
        type: 'clarity',
        suggestion: 'Replace vague terms with specific action verbs',
        examples: ['Instead of "work on report" → "write introduction section for report"']
      });
    }

    // Check for action verbs
    const hasActionVerb = this.actionVerbs.some(verb =>
      title.toLowerCase().includes(verb.toLowerCase())
    );

    if (!hasActionVerb) {
      score -= 20;
      validation.issues.push({
        type: 'missing_action_verb',
        severity: 'medium',
        message: 'Todo doesn\'t start with a clear action verb'
      });
      validation.suggestions.push({
        type: 'actionability',
        suggestion: 'Start with a specific action verb',
        examples: this.actionVerbs.slice(0, 5)
      });
    }

    // Check for overwhelming language
    const overwhelmingMatches = this.problematicPatterns.overwhelming.filter(pattern => pattern.test(title));
    if (overwhelmingMatches.length > 0) {
      score -= 25;
      validation.issues.push({
        type: 'overwhelming_scope',
        severity: 'high',
        message: 'Language suggests an overwhelming scope'
      });
      validation.suggestions.push({
        type: 'scope',
        suggestion: 'Break down into smaller, specific actions',
        examples: ['Instead of "complete project" → "write first draft of section 1"']
      });
    }

    return Math.max(0, score);
  }

  /**
   * Analyze scope and complexity
   */
  analyzeScopeAndComplexity(todo, validation) {
    let score = 100;

    const estimatedMinutes = todo.estimatedMinutes || 0;
    const complexity = todo.complexity || 'unknown';

    // Check time vs complexity alignment
    if (estimatedMinutes > 120) {
      score -= 40;
      validation.issues.push({
        type: 'too_large',
        severity: 'critical',
        message: 'Task is too large for ADHD executive function (>2 hours)'
      });
      validation.suggestions.push({
        type: 'breakdown',
        suggestion: 'Break into 25-45 minute chunks',
        examples: ['Use Pomodoro technique: 25-min focused work + 5-min break']
      });
    } else if (estimatedMinutes > 60) {
      score -= 20;
      validation.issues.push({
        type: 'large_task',
        severity: 'medium',
        message: 'Task might be challenging for sustained attention (>1 hour)'
      });
      validation.suggestions.push({
        type: 'consider_breakdown',
        suggestion: 'Consider breaking into smaller subtasks'
      });
    }

    // Check for perfectionist language
    const perfectionistMatches = this.problematicPatterns.perfectionist.filter(pattern =>
      pattern.test(todo.title || '')
    );
    if (perfectionistMatches.length > 0) {
      score -= 30;
      validation.issues.push({
        type: 'perfectionist_language',
        severity: 'high',
        message: 'Language may trigger perfectionism paralysis'
      });
      validation.suggestions.push({
        type: 'perfectionism',
        suggestion: 'Focus on "good enough" progress over perfection',
        examples: ['Instead of "perfect presentation" → "create working draft of presentation"']
      });
    }

    return Math.max(0, score);
  }

  /**
   * Analyze time estimate realism
   */
  analyzeTimeEstimate(todo, validation) {
    let score = 100;

    if (!todo.estimatedMinutes) {
      score -= 20;
      validation.issues.push({
        type: 'missing_time_estimate',
        severity: 'medium',
        message: 'No time estimate provided'
      });
      validation.suggestions.push({
        type: 'time_estimate',
        suggestion: 'Add realistic time estimate to prevent time blindness',
        examples: ['Simple tasks: 15-30 min, Complex tasks: 45-90 min']
      });
      return score;
    }

    const minutes = todo.estimatedMinutes;
    const category = todo.category || 'general';

    // Check for time blindness patterns
    const timeBlindMatches = this.problematicPatterns.timeBlind.filter(pattern =>
      pattern.test(todo.title || '')
    );
    if (timeBlindMatches.length > 0) {
      score -= 25;
      validation.issues.push({
        type: 'time_blindness',
        severity: 'medium',
        message: 'Language suggests unrealistic time expectations'
      });
      validation.suggestions.push({
        type: 'realistic_timing',
        suggestion: 'Remove time pressure words and add buffer time',
        examples: ['Add 25% extra time for ADHD planning fallacy']
      });
    }

    // Validate time estimates based on category
    const categoryMultipliers = {
      'writing': 1.3, // Writing often takes longer
      'research': 1.5, // Research can be a rabbit hole
      'creative': 1.2, // Creative work is unpredictable
      'administrative': 0.8, // Admin tasks are usually quicker
      'analysis': 1.4 // Analysis can be complex
    };

    const multiplier = categoryMultipliers[category] || 1.0;
    const adjustedEstimate = minutes * multiplier;

    if (minutes < 10 && todo.complexity !== 'micro') {
      score -= 15;
      validation.suggestions.push({
        type: 'underestimated',
        suggestion: 'Time estimate may be too optimistic for ADHD brains'
      });
    }

    return Math.max(0, score);
  }

  /**
   * Analyze specificity and context
   */
  analyzeSpecificity(todo, validation) {
    let score = 100;

    const title = todo.title || '';
    const description = todo.description || '';
    const context = title + ' ' + description;

    // Check for context and specificity
    if (context.length < 10) {
      score -= 30;
      validation.issues.push({
        type: 'too_brief',
        severity: 'medium',
        message: 'Todo is too brief and lacks context'
      });
      validation.suggestions.push({
        type: 'context',
        suggestion: 'Add context about what, where, when, and why',
        examples: ['Include location, tools needed, or specific outcomes']
      });
    }

    // Check for completion criteria
    if (!todo.completionCriteria && todo.estimatedMinutes > 30) {
      score -= 15;
      validation.suggestions.push({
        type: 'completion_criteria',
        suggestion: 'Define "done" to avoid endless tweaking',
        examples: ['Done when: 3 paragraphs written and spell-checked']
      });
    }

    // Check for executive function supports
    const hasEFSupport = todo.executiveFunctionDemands && todo.executiveFunctionDemands.length > 0;
    if (!hasEFSupport && todo.estimatedMinutes > 45) {
      score -= 10;
      validation.suggestions.push({
        type: 'executive_function',
        suggestion: 'Identify executive function demands',
        examples: ['Planning, working memory, attention switching, inhibition']
      });
    }

    return Math.max(0, score);
  }

  /**
   * Determine ADHD friendliness based on score
   */
  determineAdhdFriendliness(score) {
    if (score >= 80) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    if (score >= 30) return 'poor';
    return 'very_poor';
  }

  /**
   * Generate improved version of todo
   */
  generateImprovedTodo(todo, validation) {
    const improved = { ...todo };

    // Improve title with action verb
    if (!this.actionVerbs.some(verb => todo.title.toLowerCase().includes(verb))) {
      // Suggest a better action verb based on context
      const suggestedVerb = this.suggestActionVerb(todo.title, todo.category);
      improved.title = `${suggestedVerb} ${todo.title.toLowerCase()}`;
    }

    // Remove problematic language
    let improvedTitle = improved.title;

    // Replace vague terms
    improvedTitle = improvedTitle.replace(/work on/gi, 'complete');
    improvedTitle = improvedTitle.replace(/deal with/gi, 'handle');
    improvedTitle = improvedTitle.replace(/figure out/gi, 'determine');
    improvedTitle = improvedTitle.replace(/look into/gi, 'research');

    // Remove overwhelming language
    improvedTitle = improvedTitle.replace(/everything/gi, 'specific items');
    improvedTitle = improvedTitle.replace(/\ball\b/gi, 'priority');
    improvedTitle = improvedTitle.replace(/complete/gi, 'draft');

    improved.title = improvedTitle;

    // Improve time estimate if missing or unrealistic
    if (!improved.estimatedMinutes) {
      improved.estimatedMinutes = this.suggestTimeEstimate(improved.title, improved.category);
    } else if (improved.estimatedMinutes > 120) {
      // Suggest breaking down
      improved.estimatedMinutes = 45; // First chunk
      improved.needsBreakdown = true;
    }

    // Add completion criteria if missing
    if (!improved.completionCriteria) {
      improved.completionCriteria = this.generateCompletionCriteria(improved);
    }

    // Add motivation booster
    if (!improved.motivationBooster) {
      improved.motivationBooster = this.generateMotivationBooster(improved);
    }

    return improved;
  }

  /**
   * Generate task breakdown for large tasks
   */
  generateTaskBreakdown(todo) {
    const subtasks = [];
    const totalMinutes = todo.estimatedMinutes || 120;
    const chunkSize = 25; // Pomodoro size
    const numChunks = Math.ceil(totalMinutes / chunkSize);

    for (let i = 1; i <= numChunks; i++) {
      subtasks.push({
        title: `${todo.title} - Part ${i}`,
        description: `Focus session ${i} of ${numChunks}`,
        estimatedMinutes: Math.min(chunkSize, totalMinutes - (i - 1) * chunkSize),
        category: todo.category,
        priority: todo.priority,
        energyRequired: i === 1 ? todo.energyRequired : 'moderate',
        aiGenerated: true
      });
    }

    return {
      originalTask: todo,
      subtasks,
      strategy: 'pomodoro_breakdown',
      totalChunks: numChunks,
      reasoning: 'Large task broken into manageable 25-minute focused work sessions'
    };
  }

  /**
   * Suggest appropriate action verb based on context
   */
  suggestActionVerb(title, category) {
    const categoryVerbs = {
      'writing': ['write', 'draft', 'compose', 'edit'],
      'research': ['research', 'investigate', 'analyze', 'review'],
      'organization': ['organize', 'sort', 'file', 'arrange'],
      'communication': ['call', 'email', 'send', 'schedule'],
      'creative': ['create', 'design', 'brainstorm', 'sketch'],
      'administrative': ['update', 'complete', 'submit', 'process']
    };

    const verbs = categoryVerbs[category] || this.actionVerbs;
    return verbs[Math.floor(Math.random() * verbs.length)];
  }

  /**
   * Suggest realistic time estimate
   */
  suggestTimeEstimate(title, category) {
    const baseEstimates = {
      'writing': 45,
      'research': 60,
      'organization': 30,
      'communication': 15,
      'creative': 60,
      'administrative': 25,
      'analysis': 45
    };

    return baseEstimates[category] || 30;
  }

  /**
   * Generate completion criteria
   */
  generateCompletionCriteria(todo) {
    const category = todo.category || 'general';

    const criteriaTemplates = {
      'writing': 'Done when text is written and reviewed for clarity',
      'research': 'Done when key information is gathered and summarized',
      'organization': 'Done when items are sorted and put in designated places',
      'communication': 'Done when message is sent and confirmation received',
      'creative': 'Done when initial concept is captured and documented',
      'administrative': 'Done when form is completed and submitted'
    };

    return criteriaTemplates[category] || 'Done when objective is met and verified';
  }

  /**
   * Generate motivation booster
   */
  generateMotivationBooster(todo) {
    const motivators = [
      'This gets you one step closer to your goal!',
      'Completing this will reduce mental clutter.',
      'You\'ll feel accomplished after finishing this.',
      'This moves an important project forward.',
      'Getting this done will free up mental space.',
      'You\'ve got this - it\'s totally doable!',
      'Future you will thank present you for doing this.',
      'This is an investment in your success.'
    ];

    return motivators[Math.floor(Math.random() * motivators.length)];
  }

  /**
   * Validate a list of todos and provide overall assessment
   */
  validateTodoList(todos) {
    const validations = todos.map(todo => this.validateTodo(todo));

    const averageScore = validations.reduce((sum, v) => sum + v.qualityScore, 0) / validations.length;

    const issuesByType = {};
    validations.forEach(v => {
      v.issues.forEach(issue => {
        issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
      });
    });

    const commonIssues = Object.entries(issuesByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type, count]) => ({ type, count }));

    return {
      totalTodos: todos.length,
      averageQualityScore: Math.round(averageScore),
      overallFriendliness: this.determineAdhdFriendliness(averageScore),
      validations,
      commonIssues,
      recommendations: this.generateListRecommendations(validations, commonIssues)
    };
  }

  /**
   * Generate recommendations for the entire todo list
   */
  generateListRecommendations(validations, commonIssues) {
    const recommendations = [];

    // Check for planning issues
    const totalEstimatedTime = validations.reduce((sum, v) =>
      sum + (v.originalTodo.estimatedMinutes || 0), 0
    );

    if (totalEstimatedTime > 8 * 60) { // More than 8 hours
      recommendations.push({
        type: 'overplanning',
        priority: 'high',
        message: 'Your todo list may be too ambitious for one day',
        suggestion: 'Consider prioritizing 3-5 key items and moving others to future days'
      });
    }

    // Check for energy management
    const highEnergyTasks = validations.filter(v =>
      v.originalTodo.energyRequired === 'high'
    ).length;

    if (highEnergyTasks > 2) {
      recommendations.push({
        type: 'energy_management',
        priority: 'medium',
        message: 'Too many high-energy tasks for optimal ADHD management',
        suggestion: 'Balance high-energy tasks with moderate and low-energy ones'
      });
    }

    // Address common issues
    commonIssues.forEach(issue => {
      if (issue.count >= validations.length * 0.5) { // If 50%+ have this issue
        recommendations.push({
          type: 'common_issue',
          priority: 'high',
          message: `Common issue: ${issue.type} affects ${issue.count} todos`,
          suggestion: `Focus on improving ${issue.type} across your todo list`
        });
      }
    });

    return recommendations;
  }
}

export default TodoQualityValidationService;