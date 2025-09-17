/**
 * ADHD-Friendly AI Project Initiation Dialogue
 * 
 * Philosophy:
 * - Break overwhelming project planning into guided conversation
 * - Keep dialogue sessions short (5-10 questions max)
 * - Generate immediately actionable micro-tasks
 * - Save progress to prevent losing work
 * - Use plain language, avoid academic jargon
 */

import { AIService } from './ai-service';
import { TaskService } from './task-service';
import { AcademicTemplateService, AcademicTemplate } from './academic-templates';
import { ProjectKanbanService, KanbanBoard } from './kanban-service';

export interface ProjectContext {
  type: 'dissertation' | 'paper' | 'proposal' | 'chapter' | 'other';
  title?: string;
  discipline?: string;
  deadline?: string;
  currentProgress?: string;
  mainConcern?: string;
}

export interface DialogueQuestion {
  id: string;
  text: string;
  type: 'text' | 'choice' | 'date' | 'number';
  choices?: string[];
  placeholder?: string;
  required: boolean;
}

export interface DialogueResponse {
  questionId: string;
  answer: string;
  timestamp: number;
}

export interface DialogueSession {
  id: string;
  projectContext: ProjectContext;
  currentQuestionIndex: number;
  responses: DialogueResponse[];
  isComplete: boolean;
  created: number;
  updated: number;
}

export interface ProjectPlan {
  title: string;
  phases: ProjectPhase[];
  immediateNextSteps: string[];
  potentialRisks: string[];
  estimatedTimeline: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface ProjectPhase {
  name: string;
  description: string;
  estimatedWeeks: number;
  tasks: string[];
  dependencies: string[];
}

export class ProjectDialogueService {
  private aiService: AIService;
  private taskService: TaskService;
  private academicTemplateService: AcademicTemplateService;
  private kanbanService?: ProjectKanbanService;
  private activeSessions: Map<string, DialogueSession> = new Map();

  constructor(
    aiService: AIService, 
    taskService: TaskService, 
    academicTemplateService?: AcademicTemplateService,
    kanbanService?: ProjectKanbanService
  ) {
    this.aiService = aiService;
    this.taskService = taskService;
    this.academicTemplateService = academicTemplateService || new AcademicTemplateService();
    this.kanbanService = kanbanService;
  }

  /**
   * Start a new project planning dialogue
   * ADHD-friendly: Clear entry point, immediate progress feedback
   */
  async startProjectDialogue(initialContext: Partial<ProjectContext> = {}): Promise<DialogueSession> {
    const sessionId = `dialogue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    const session: DialogueSession = {
      id: sessionId,
      projectContext: {
        type: 'other',
        ...initialContext,
      },
      currentQuestionIndex: 0,
      responses: [],
      isComplete: false,
      created: Date.now(),
      updated: Date.now(),
    };

    this.activeSessions.set(sessionId, session);
    console.log(`[ProjectDialogue] Started session: ${sessionId}`);
    
    return session;
  }

  /**
   * Get the next question in the dialogue
   * ADHD-friendly: One question at a time, clear progress indication
   */
  getNextQuestion(sessionId: string): DialogueQuestion | null {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.isComplete) return null;

    const questions = this.getQuestionsForProject(session.projectContext.type);
    
    if (session.currentQuestionIndex >= questions.length) {
      return null;
    }

    return questions[session.currentQuestionIndex];
  }

  /**
   * Submit an answer and advance the dialogue
   * ADHD-friendly: Immediate feedback, save progress frequently
   */
  async submitAnswer(sessionId: string, questionId: string, answer: string): Promise<{
    nextQuestion: DialogueQuestion | null;
    isComplete: boolean;
    progress: { current: number; total: number };
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Dialogue session not found');
    }

    // Save the response
    session.responses.push({
      questionId,
      answer: answer.trim(),
      timestamp: Date.now(),
    });

    // Update project context based on response
    this.updateProjectContext(session, questionId, answer);

    // Move to next question
    session.currentQuestionIndex++;
    session.updated = Date.now();

    const questions = this.getQuestionsForProject(session.projectContext.type);
    const isComplete = session.currentQuestionIndex >= questions.length;
    
    if (isComplete) {
      session.isComplete = true;
    }

    const nextQuestion = isComplete ? null : this.getNextQuestion(sessionId);

    return {
      nextQuestion,
      isComplete,
      progress: {
        current: session.currentQuestionIndex,
        total: questions.length,
      },
    };
  }

  /**
   * Generate project plan from completed dialogue
   * ADHD-friendly: Convert conversation into actionable structure
   */
  async generateProjectPlan(sessionId: string): Promise<ProjectPlan> {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isComplete) {
      throw new Error('Dialogue must be completed before generating plan');
    }

    try {
      // Build context from dialogue responses
      const dialogueContext = this.buildDialogueContext(session);
      
      // Use AI service to generate structured plan
      const systemPrompt = `You are an expert academic project planner specializing in ADHD-friendly workflows.
      
Based on the dialogue responses, create a practical project plan with:
1. 3-5 clear phases (avoid overwhelming detail)
2. Specific, actionable tasks (5-25 minutes each)
3. Realistic timeline estimates
4. Potential risks with simple mitigation strategies

Keep language simple and encouraging. Focus on immediate next steps.`;

      const userPrompt = `Project Planning Dialogue Results:
${dialogueContext}

Please create a structured project plan that breaks this work into manageable phases with specific micro-tasks.`;

      const aiResponse = await this.aiService.requestAI({
        systemPrompt,
        userPrompt,
        maxTokens: 1500,
      });

      // Parse AI response into structured plan
      const plan = this.parseProjectPlan(aiResponse, session);
      
      return plan;

    } catch (error) {
      console.error('[ProjectDialogue] Plan generation failed:', error);
      
      // Fallback: create basic plan from dialogue context
      return this.createFallbackPlan(session);
    }
  }

  /**
   * Auto-generate micro-tasks from project plan
   * ADHD-friendly: Immediate actionable outcomes
   */
  async createMicroTasksFromPlan(sessionId: string, plan: ProjectPlan): Promise<{
    tasksCreated: number;
    immediateActions: string[];
  }> {
    try {
      let tasksCreated = 0;
      const immediateActions: string[] = [];

      // Create micro-tasks for immediate next steps
      for (const nextStep of plan.immediateNextSteps.slice(0, 5)) { // Max 5 to avoid overwhelm
        try {
          await this.taskService.createTask(nextStep);
          tasksCreated++;
          immediateActions.push(nextStep);
        } catch (error) {
          console.warn('[ProjectDialogue] Failed to create task:', nextStep, error);
          // Continue with other tasks
        }
      }

      console.log(`[ProjectDialogue] Created ${tasksCreated} micro-tasks from plan`);
      
      return { tasksCreated, immediateActions };

    } catch (error) {
      console.error('[ProjectDialogue] Task creation failed:', error);
      return { tasksCreated: 0, immediateActions: [] };
    }
  }

  /**
   * Create Kanban board from generated project plan
   * ADHD-friendly: Visual project management from dialogue
   */
  async createKanbanFromPlan(sessionId: string, plan: ProjectPlan): Promise<KanbanBoard | null> {
    if (!this.kanbanService) {
      console.warn('[ProjectDialogue] No Kanban service available');
      return null;
    }

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    try {
      // Convert dialogue context to pseudo-template for board creation
      const pseudoTemplate = this.convertPlanToTemplate(plan, session.projectContext);
      
      // Create board using the Kanban service
      const board = this.kanbanService.createBoardFromTemplate(
        pseudoTemplate,
        plan.title,
        {
          sessionId,
          dialogueResponses: session.responses,
          generatedAt: Date.now()
        }
      );

      console.log(`[ProjectDialogue] Created Kanban board: ${board.title}`);
      return board;

    } catch (error) {
      console.error('[ProjectDialogue] Kanban creation failed:', error);
      return null;
    }
  }

  /**
   * Convert project plan to template format for Kanban creation
   */
  private convertPlanToTemplate(plan: ProjectPlan, context: ProjectContext): AcademicTemplate {
    // Create template phases from project phases
    const templatePhases = plan.phases.map(phase => ({
      name: phase.name,
      description: phase.description,
      estimatedDays: phase.estimatedWeeks * 7, // Convert weeks to days
      tasks: phase.tasks.map(task => ({
        title: task,
        description: `Part of ${phase.name} phase`,
        energyLevel: this.estimateEnergyLevel(task),
        estimatedMinutes: this.estimateTaskTime(task),
        adhdFriendly: true,
        tips: []
      })),
      checkpoints: [`Complete ${phase.name} phase`]
    }));

    // Add immediate action phase at the beginning
    if (plan.immediateNextSteps.length > 0) {
      templatePhases.unshift({
        name: 'Quick Start',
        description: 'Immediate actions to build momentum',
        estimatedDays: 3,
        tasks: plan.immediateNextSteps.map(step => ({
          title: step,
          description: 'Immediate next step from project planning dialogue',
          energyLevel: 'moderate' as const,
          estimatedMinutes: 25,
          adhdFriendly: true,
          tips: ['Start with this to build momentum', 'Keep it small and achievable']
        })),
        checkpoints: ['Build initial momentum', 'Complete first tasks']
      });
    }

    return {
      id: `dialogue-generated-${Date.now()}`,
      name: `${plan.title} Project`,
      description: `Project plan generated from AI dialogue on ${new Date().toLocaleDateString()}`,
      category: this.mapContextTypeToCategory(context.type),
      estimatedWeeks: plan.phases.reduce((total, phase) => total + phase.estimatedWeeks, 0),
      phases: templatePhases,
      energyProfile: 'moderate' as const,
      adhdTips: [
        'This plan was created from your dialogue responses',
        'Start with the Quick Start phase to build momentum',
        'Break larger tasks into 5-25 minute chunks',
        'Remember: progress over perfection'
      ]
    };
  }

  /**
   * Map dialogue context type to template category
   */
  private mapContextTypeToCategory(type: string): AcademicTemplate['category'] {
    switch (type) {
      case 'dissertation': return 'dissertation';
      case 'paper': return 'paper';
      case 'proposal': return 'proposal';
      case 'chapter': return 'chapter';
      default: return 'paper'; // Default fallback
    }
  }

  /**
   * Estimate energy level required for a task based on keywords
   */
  private estimateEnergyLevel(taskTitle: string): 'low' | 'moderate' | 'high' {
    const lowEnergyWords = ['review', 'organize', 'format', 'edit', 'proofread', 'collect'];
    const highEnergyWords = ['write', 'create', 'design', 'analyze', 'synthesize', 'plan'];
    
    const title = taskTitle.toLowerCase();
    
    if (lowEnergyWords.some(word => title.includes(word))) {
      return 'low';
    } else if (highEnergyWords.some(word => title.includes(word))) {
      return 'high';
    }
    
    return 'moderate';
  }

  /**
   * Estimate task time based on task complexity
   */
  private estimateTaskTime(taskTitle: string): number {
    const complexWords = ['write', 'create', 'develop', 'design', 'analyze'];
    const simpleWords = ['review', 'organize', 'format', 'collect'];
    
    const title = taskTitle.toLowerCase();
    
    if (complexWords.some(word => title.includes(word))) {
      return 45; // 45 minutes for complex tasks
    } else if (simpleWords.some(word => title.includes(word))) {
      return 15; // 15 minutes for simple tasks
    }
    
    return 25; // 25 minutes default (one pomodoro)
  }

  /**
   * Get progress summary for UI display
   * ADHD-friendly: Clear visual progress tracking
   */
  getSessionProgress(sessionId: string): {
    current: number;
    total: number;
    percentage: number;
    canContinue: boolean;
  } | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    const questions = this.getQuestionsForProject(session.projectContext.type);
    const total = questions.length;
    const current = session.currentQuestionIndex;
    
    return {
      current,
      total,
      percentage: Math.round((current / total) * 100),
      canContinue: current < total,
    };
  }

  /**
   * Private helper methods
   */
  private getQuestionsForProject(projectType: string): DialogueQuestion[] {
    const baseQuestions: DialogueQuestion[] = [
      {
        id: 'project_title',
        text: 'What\'s the working title of your project?',
        type: 'text',
        placeholder: 'e.g., "Analysis of social media impact on academic performance"',
        required: true,
      },
      {
        id: 'main_goal',
        text: 'In simple terms, what are you trying to achieve?',
        type: 'text',
        placeholder: 'Describe your main goal in 1-2 sentences',
        required: true,
      },
      {
        id: 'current_status',
        text: 'Where are you right now in this project?',
        type: 'choice',
        choices: [
          'Just starting - have the idea',
          'Some research done',
          'Have an outline',
          'Partially written',
          'Need to revise/finish',
        ],
        required: true,
      },
      {
        id: 'biggest_concern',
        text: 'What\'s your biggest worry about completing this project?',
        type: 'choice',
        choices: [
          'Don\'t know where to start',
          'Too much information to organize',
          'Running out of time',
          'Quality/perfectionism concerns',
          'Staying motivated/focused',
          'Technical/methodology issues',
        ],
        required: true,
      },
      {
        id: 'deadline',
        text: 'When do you need this completed?',
        type: 'date',
        placeholder: 'Select target completion date',
        required: false,
      },
      {
        id: 'daily_capacity',
        text: 'Realistically, how much time can you work on this per day?',
        type: 'choice',
        choices: [
          '30 minutes or less',
          '1 hour',
          '2-3 hours',
          '4+ hours',
          'Varies day to day',
        ],
        required: true,
      },
    ];

    // Add project-specific questions
    if (projectType === 'dissertation') {
      baseQuestions.push({
        id: 'dissertation_stage',
        text: 'Which stage of your dissertation is this?',
        type: 'choice',
        choices: [
          'Proposal',
          'Literature review',
          'Methodology',
          'Data collection/analysis',
          'Writing chapters',
          'Final revisions',
        ],
        required: true,
      });
    }

    return baseQuestions;
  }

  private updateProjectContext(session: DialogueSession, questionId: string, answer: string): void {
    switch (questionId) {
      case 'project_title':
        session.projectContext.title = answer;
        break;
      case 'deadline':
        session.projectContext.deadline = answer;
        break;
      case 'biggest_concern':
        session.projectContext.mainConcern = answer;
        break;
      case 'current_status':
        session.projectContext.currentProgress = answer;
        break;
    }
  }

  private buildDialogueContext(session: DialogueSession): string {
    const responses = session.responses.map(r => {
      const question = this.getQuestionsForProject(session.projectContext.type)
        .find(q => q.id === r.questionId);
      return `Q: ${question?.text}\nA: ${r.answer}`;
    }).join('\n\n');

    return `Project Type: ${session.projectContext.type}
    
Dialogue Responses:
${responses}`;
  }

  private parseProjectPlan(aiResponse: string, session: DialogueSession): ProjectPlan {
    // Simple parsing - in real implementation, would use more sophisticated extraction
    const lines = aiResponse.split('\n').filter(line => line.trim());
    
    // Extract immediate next steps (look for bullet points)
    const immediateNextSteps = lines
      .filter(line => /^[-*•]\s/.test(line.trim()))
      .map(line => line.replace(/^[-*•]\s/, '').trim())
      .slice(0, 5); // Limit to 5 for ADHD-friendly approach

    return {
      title: session.projectContext.title || 'Academic Project',
      phases: [
        {
          name: 'Phase 1: Foundation',
          description: 'Initial setup and research',
          estimatedWeeks: 2,
          tasks: immediateNextSteps.slice(0, 3),
          dependencies: [],
        },
      ],
      immediateNextSteps,
      potentialRisks: ['Time management', 'Scope creep'],
      estimatedTimeline: 'To be refined based on progress',
      confidence: 'medium',
    };
  }

  private createFallbackPlan(session: DialogueSession): ProjectPlan {
    const title = session.projectContext.title || 'Academic Project';
    const concern = session.projectContext.mainConcern || 'Getting started';

    // Create basic immediate actions based on common concerns
    const immediateNextSteps = [
      'Create a dedicated project folder',
      'Set up a simple outline or structure',
      'Identify 3 key resources or sources',
      'Schedule first 25-minute work session',
      'Define success criteria for first week',
    ];

    return {
      title,
      phases: [
        {
          name: 'Getting Started',
          description: 'Essential first steps to build momentum',
          estimatedWeeks: 1,
          tasks: immediateNextSteps,
          dependencies: [],
        },
      ],
      immediateNextSteps,
      potentialRisks: [concern],
      estimatedTimeline: 'Will refine as we progress',
      confidence: 'low',
    };
  }

  /**
   * Get suggested academic templates based on project context
   * ADHD-friendly: Templates provide structure when planning feels overwhelming
   */
  getSuggestedTemplates(sessionId: string): AcademicTemplate[] {
    const session = this.activeSessions.get(sessionId);
    if (!session) return [];

    const { type } = session.projectContext;
    
    // Map dialogue project types to template types
    const templateTypeMap: Record<string, string> = {
      'dissertation': 'dissertation',
      'paper': 'research-paper',
      'proposal': 'research-proposal',
      'chapter': 'dissertation-chapter',
      'other': 'research-paper', // Default fallback
    };

    const templateType = templateTypeMap[type] || 'research-paper';
    const template = this.academicTemplateService.getTemplate(templateType);
    
    return template ? [template] : [];
  }

  /**
   * Apply a template to create an enhanced project plan
   * ADHD-friendly: Structured breakdown with time estimates and energy levels
   */
  async applyTemplateToProject(sessionId: string, templateType: string): Promise<ProjectPlan> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Dialogue session not found');
    }

    const template = this.academicTemplateService.getTemplate(templateType);
    if (!template) {
      throw new Error(`Template ${templateType} not found`);
    }

    // Convert template to micro-tasks using the academic template service
    const microTasks = this.academicTemplateService.templateToMicroTasks(template);
    
    // Create project plan from template
    const projectPlan: ProjectPlan = {
      title: session.projectContext.title || template.name,
      phases: template.phases.map(phase => ({
        name: phase.name,
        description: phase.description,
        estimatedWeeks: Math.ceil(phase.estimatedDays / 7), // Convert days to weeks
        tasks: phase.tasks.map(task => task.title),
        dependencies: [], // ProjectPhase dependencies (different from task dependencies)
      })),
      immediateNextSteps: microTasks.slice(0, 5).map(task => task.text),
      potentialRisks: [
        'Perfectionism leading to delays',
        'Losing momentum between phases',
        'Underestimating time requirements',
        ...(template.adhdTips.slice(0, 2))
      ],
      estimatedTimeline: `${template.phases.length} phases over ${template.estimatedWeeks} weeks`,
      confidence: 'medium' as const,
    };

    return projectPlan;
  }

  /**
   * Get template-based micro-tasks for immediate action
   * ADHD-friendly: Break overwhelming template into today's actionable steps
   */
  getTemplateStarterTasks(templateType: string, limit: number = 3): Array<{
    title: string;
    description: string;
    estimatedMinutes: number;
    energyLevel: 'low' | 'medium' | 'high';
  }> {
    const template = this.academicTemplateService.getTemplate(templateType);
    if (!template) return [];

    const microTasks = this.academicTemplateService.templateToMicroTasks(template);
    
    return microTasks.slice(0, limit).map(task => ({
      title: task.text || 'Task', // MicroTask uses 'text' property
      description: task.text || '',
      estimatedMinutes: (task as any).estimatedMinutes || 25, // Added as metadata by template
      energyLevel: ((task as any).energyLevel === 'moderate' ? 'medium' : (task as any).energyLevel) || 'medium',
    }));
  }

  /**
   * Get the project context from the most recent session
   * Used to determine project type for additional AI planning
   */
  getProjectContext(sessionId?: string): ProjectContext | null {
    if (sessionId) {
      const session = this.activeSessions.get(sessionId);
      return session ? session.projectContext : null;
    }
    
    // If no sessionId provided, get the most recent session
    const sessions = Array.from(this.activeSessions.values());
    if (sessions.length === 0) return null;
    
    const mostRecent = sessions.reduce((latest, current) => 
      current.updated > latest.updated ? current : latest
    );
    
    return mostRecent.projectContext;
  }
}