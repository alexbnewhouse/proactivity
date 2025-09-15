import OpenAI from 'openai';
import { TaskComplexity, EnergyLevel, ExecutiveFunction, TaskCategory } from '../../shared/types.js';

/**
 * AI-powered task breakdown service specifically designed for ADHD users
 * Based on research showing ADHD brains need granular, concrete steps
 */
class TaskBreakdownService {
  constructor(apiKey) {
    // Only initialize OpenAI if API key is provided
    if (apiKey && apiKey.trim()) {
      this.openai = new OpenAI({ apiKey });
    } else {
      console.warn('⚠️  OpenAI API key not provided. Task breakdown will use fallback mode only.');
      this.openai = null;
    }
    this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
  }

  /**
   * Breaks down a large task into ADHD-friendly micro-tasks
   * @param {string} originalTask - The original overwhelming task
   * @param {Object} context - User context and preferences
   * @returns {Array} Array of micro-tasks with ADHD-specific metadata
   */
  async breakdownTask(originalTask, context = {}) {
    const {
      currentEnergyLevel = EnergyLevel.MODERATE,
      availableTime = 60, // minutes
      preferredComplexity = TaskComplexity.SIMPLE,
      executiveFunctionChallenges = [],
      currentProject = 'dissertation'
    } = context;

    const prompt = this.buildBreakdownPrompt(
      originalTask,
      currentEnergyLevel,
      availableTime,
      preferredComplexity,
      executiveFunctionChallenges,
      currentProject
    );

    // Use fallback if OpenAI is not available
    if (!this.openai) {
      console.log('Using fallback task breakdown (no OpenAI API key)');
      return this.fallbackBreakdown(originalTask, context);
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent, structured output
        max_completion_tokens: 2000
      });

      const response = completion.choices[0].message.content;
      return this.parseTaskBreakdown(response, originalTask);
    } catch (error) {
      console.error('Error in task breakdown:', error);
      // Fallback to rule-based breakdown
      return this.fallbackBreakdown(originalTask, context);
    }
  }

  /**
   * System prompt incorporating ADHD research and best practices
   */
  getSystemPrompt() {
    return `You are an AI assistant specializing in ADHD-friendly task breakdown for academic work, particularly dissertation writing. Your role is to help PhD students with ADHD overcome executive function challenges.

ADHD-SPECIFIC PRINCIPLES:
1. Task Initiation: Break tasks into concrete, actionable steps that remove decision fatigue
2. Working Memory: Limit cognitive load by keeping steps simple and sequential
3. Time Blindness: Provide realistic time estimates for each micro-task
4. Procrastination: Create low-friction entry points that feel achievable
5. Hyperfocus: Design tasks that can scale up if momentum builds

TASK BREAKDOWN RULES:
- Each micro-task should take 5-25 minutes maximum
- Start with the easiest/most concrete step to build momentum
- Include specific tools, files, or resources needed
- Provide clear completion criteria
- Consider executive function demands for each step
- Include optional "momentum builders" for hyperfocus states

OUTPUT FORMAT:
Return a JSON array of tasks with this structure:
{
  "originalTask": "string",
  "microTasks": [
    {
      "id": "unique_id",
      "title": "Clear, action-oriented title",
      "description": "Specific steps to take",
      "estimatedMinutes": number,
      "complexity": "micro|simple|moderate",
      "category": "research|writing|analysis|organization|administrative|creative|revision",
      "executiveFunctionDemands": ["working_memory", "task_initiation", etc.],
      "prerequisites": ["previous_task_id"],
      "tools": ["specific tools or resources needed"],
      "completionCriteria": "How to know when done",
      "motivationBooster": "ADHD-friendly encouragement",
      "energyRequired": "low|moderate|high",
      "procrastinationRisk": "low|medium|high",
      "hyperfocusScale": "How this task can expand if momentum builds"
    }
  ]
}

Focus on reducing cognitive load and making each step feel achievable while maintaining academic rigor.`;
  }

  /**
   * Builds a context-aware prompt for task breakdown
   */
  buildBreakdownPrompt(task, energyLevel, availableTime, complexity, challenges, project) {
    return `Please break down this ${project} task for someone with ADHD:

TASK: "${task}"

CURRENT CONTEXT:
- Energy Level: ${energyLevel}
- Available Time: ${availableTime} minutes
- Preferred Complexity: ${complexity}
- Executive Function Challenges: ${challenges.join(', ') || 'None specified'}
- Project Type: ${project}

Please create 3-7 micro-tasks that:
1. Start with the lowest friction step to build momentum
2. Account for the current energy level and time constraints
3. Address the specified executive function challenges
4. Feel achievable and concrete
5. Build naturally toward the larger goal

Focus on creating steps that someone with ADHD would actually want to start, not just technically correct breakdowns.`;
  }

  /**
   * Parses AI response into structured task objects
   */
  parseTaskBreakdown(response, originalTask) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validate and enhance the parsed response
        return this.validateAndEnhanceBreakdown(parsed, originalTask);
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }

    // If JSON parsing fails, try to extract tasks from text
    return this.extractTasksFromText(response, originalTask);
  }

  /**
   * Validates and enhances AI-generated breakdown
   */
  validateAndEnhanceBreakdown(breakdown, originalTask) {
    if (!breakdown.microTasks || !Array.isArray(breakdown.microTasks)) {
      throw new Error('Invalid breakdown structure');
    }

    // Ensure each task has required fields
    const enhancedTasks = breakdown.microTasks.map((task, index) => ({
      id: task.id || `task_${Date.now()}_${index}`,
      title: task.title || `Step ${index + 1}`,
      description: task.description || '',
      estimatedMinutes: this.validateTimeEstimate(task.estimatedMinutes),
      complexity: this.validateComplexity(task.complexity),
      category: this.validateCategory(task.category),
      executiveFunctionDemands: task.executiveFunctionDemands || [ExecutiveFunction.TASK_INITIATION],
      prerequisites: task.prerequisites || [],
      tools: task.tools || [],
      completionCriteria: task.completionCriteria || 'Task completed',
      motivationBooster: task.motivationBooster || this.getDefaultMotivation(),
      energyRequired: task.energyRequired || EnergyLevel.MODERATE,
      procrastinationRisk: task.procrastinationRisk || 'medium',
      hyperfocusScale: task.hyperfocusScale || 'Standard task',
      createdAt: new Date().toISOString(),
      status: 'pending'
    }));

    return {
      originalTask,
      microTasks: enhancedTasks,
      breakdownStrategy: this.identifyBreakdownStrategy(enhancedTasks),
      totalEstimatedTime: enhancedTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0),
      adhdOptimizations: this.identifyADHDOptimizations(enhancedTasks)
    };
  }

  /**
   * Fallback breakdown using rule-based approach
   */
  fallbackBreakdown(originalTask, context) {
    const { availableTime = 60 } = context;

    // Simple rule-based breakdown
    const basicSteps = [
      {
        id: `fallback_${Date.now()}_1`,
        title: 'Clarify the specific goal',
        description: `Write down exactly what needs to be accomplished for: ${originalTask}`,
        estimatedMinutes: 5,
        complexity: TaskComplexity.MICRO,
        category: TaskCategory.ORGANIZATION,
        motivationBooster: 'Starting with clarity makes everything easier!'
      },
      {
        id: `fallback_${Date.now()}_2`,
        title: 'Gather necessary materials',
        description: 'Collect all documents, tools, or resources needed',
        estimatedMinutes: 10,
        complexity: TaskComplexity.SIMPLE,
        category: TaskCategory.ORGANIZATION,
        motivationBooster: 'Having everything ready removes friction!'
      },
      {
        id: `fallback_${Date.now()}_3`,
        title: 'Take the first concrete action',
        description: 'Begin with the most straightforward part of the task',
        estimatedMinutes: Math.min(availableTime - 15, 30),
        complexity: TaskComplexity.SIMPLE,
        category: TaskCategory.WRITING,
        motivationBooster: 'Momentum builds with action!'
      }
    ];

    return {
      originalTask,
      microTasks: basicSteps.map(step => ({
        ...step,
        executiveFunctionDemands: [ExecutiveFunction.TASK_INITIATION],
        prerequisites: [],
        tools: [],
        completionCriteria: 'Step completed',
        energyRequired: EnergyLevel.LOW,
        procrastinationRisk: 'low',
        hyperfocusScale: 'Can continue if motivated',
        createdAt: new Date().toISOString(),
        status: 'pending'
      })),
      breakdownStrategy: 'rule-based-fallback',
      totalEstimatedTime: basicSteps.reduce((sum, step) => sum + step.estimatedMinutes, 0),
      adhdOptimizations: ['low-friction-start', 'clear-completion-criteria']
    };
  }

  // Utility methods for validation and enhancement
  validateTimeEstimate(time) {
    if (typeof time !== 'number' || time < 1) return 15;
    if (time > 120) return 120; // Cap at 2 hours
    return time;
  }

  validateComplexity(complexity) {
    return Object.values(TaskComplexity).includes(complexity)
      ? complexity
      : TaskComplexity.SIMPLE;
  }

  validateCategory(category) {
    return Object.values(TaskCategory).includes(category)
      ? category
      : TaskCategory.ORGANIZATION;
  }

  getDefaultMotivation() {
    const motivations = [
      'You\'ve got this! One step at a time.',
      'Progress over perfection!',
      'Small steps lead to big wins!',
      'Your future self will thank you!',
      'Every expert was once a beginner.'
    ];
    return motivations[Math.floor(Math.random() * motivations.length)];
  }

  identifyBreakdownStrategy(tasks) {
    const complexityLevels = tasks.map(t => t.complexity);
    const hasProgression = complexityLevels[0] === TaskComplexity.MICRO;
    const hasParallelTasks = tasks.some(t => t.prerequisites.length === 0);

    if (hasProgression) return 'momentum-building';
    if (hasParallelTasks) return 'parallel-processing';
    return 'sequential';
  }

  identifyADHDOptimizations(tasks) {
    const optimizations = [];

    if (tasks[0].complexity === TaskComplexity.MICRO) {
      optimizations.push('low-friction-start');
    }

    if (tasks.every(t => t.estimatedMinutes <= 25)) {
      optimizations.push('pomodoro-friendly');
    }

    if (tasks.some(t => t.hyperfocusScale && t.hyperfocusScale !== 'Standard task')) {
      optimizations.push('hyperfocus-scalable');
    }

    return optimizations;
  }

  extractTasksFromText(text, originalTask) {
    // Fallback text parsing if JSON extraction fails
    const lines = text.split('\n').filter(line => line.trim());
    const taskLines = lines.filter(line =>
      line.match(/^\d+\./) ||
      line.match(/^-/) ||
      line.match(/^\*/)
    );

    const tasks = taskLines.map((line, index) => {
      const cleanLine = line.replace(/^\d+\.|\*|-/, '').trim();
      return {
        id: `extracted_${Date.now()}_${index}`,
        title: cleanLine.split(':')[0] || cleanLine.substring(0, 50),
        description: cleanLine,
        estimatedMinutes: 20,
        complexity: TaskComplexity.SIMPLE,
        category: TaskCategory.ORGANIZATION,
        executiveFunctionDemands: [ExecutiveFunction.TASK_INITIATION],
        prerequisites: [],
        tools: [],
        completionCriteria: 'Step completed',
        motivationBooster: this.getDefaultMotivation(),
        energyRequired: EnergyLevel.MODERATE,
        procrastinationRisk: 'medium',
        hyperfocusScale: 'Standard task',
        createdAt: new Date().toISOString(),
        status: 'pending'
      };
    });

    return {
      originalTask,
      microTasks: tasks,
      breakdownStrategy: 'text-extraction',
      totalEstimatedTime: tasks.length * 20,
      adhdOptimizations: ['basic-structure']
    };
  }
}

export default TaskBreakdownService;