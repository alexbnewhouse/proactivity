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
  private activeSessions: Map<string, DialogueSession> = new Map();

  constructor(aiService: AIService, taskService: TaskService) {
    this.aiService = aiService;
    this.taskService = taskService;
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
}