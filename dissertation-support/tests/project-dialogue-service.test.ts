/**
 * Project Dialogue Service Tests
 * ADHD-friendly fast feedback with comprehensive coverage
 */

import { ProjectDialogueService, DialogueSession, ProjectContext } from '../src/project-dialogue-service';
import { AIService } from '../src/ai-service';
import { TaskService } from '../src/task-service';

// Mock services
const mockAIService = {
  requestAI: jest.fn(),
} as unknown as AIService;

const mockTaskService = {
  createTask: jest.fn(),
} as unknown as TaskService;

describe('ProjectDialogueService', () => {
  let dialogueService: ProjectDialogueService;
  let mockSessionId: string;

  beforeEach(() => {
    dialogueService = new ProjectDialogueService(mockAIService, mockTaskService);
    mockSessionId = 'test-session-123';
    
    jest.clearAllMocks();

    (mockTaskService.createTask as jest.Mock).mockResolvedValue({
      id: 'task-123',
      text: 'Test task',
      status: 'todo',
    });
  });

  describe('Session Management', () => {
    test('should start new project dialogue session', async () => {
      const initialContext: Partial<ProjectContext> = {
        type: 'dissertation',
        title: 'Test Dissertation',
      };

      const session = await dialogueService.startProjectDialogue(initialContext);

      expect(session.id).toMatch(/^dialogue-\d+-[a-z0-9]{6}$/);
      expect(session.projectContext.type).toBe('dissertation');
      expect(session.projectContext.title).toBe('Test Dissertation');
      expect(session.currentQuestionIndex).toBe(0);
      expect(session.responses).toHaveLength(0);
      expect(session.isComplete).toBe(false);
    });

    test('should track session progress correctly', async () => {
      const session = await dialogueService.startProjectDialogue();
      
      const progress = dialogueService.getSessionProgress(session.id);
      
      expect(progress).toEqual({
        current: 0,
        total: expect.any(Number),
        percentage: 0,
        canContinue: true,
      });
    });

    test('should return null for non-existent session progress', () => {
      const progress = dialogueService.getSessionProgress('non-existent');
      expect(progress).toBeNull();
    });
  });

  describe('Question Flow', () => {
    test('should get first question for new session', async () => {
      const session = await dialogueService.startProjectDialogue();
      
      const question = dialogueService.getNextQuestion(session.id);
      
      expect(question).toBeTruthy();
      expect(question!.id).toBe('project_title');
      expect(question!.text).toContain('working title');
      expect(question!.type).toBe('text');
      expect(question!.required).toBe(true);
    });

    test('should return null for completed session', async () => {
      const session = await dialogueService.startProjectDialogue();
      session.isComplete = true;
      
      const question = dialogueService.getNextQuestion(session.id);
      
      expect(question).toBeNull();
    });

    test('should include project-specific questions for dissertation', async () => {
      const session = await dialogueService.startProjectDialogue({ type: 'dissertation' });
      
      // Skip through all questions to find dissertation-specific ones
      let questionCount = 0;
      let foundDissertationQuestion = false;
      
      while (questionCount < 10) { // Safety limit
        const question = dialogueService.getNextQuestion(session.id);
        if (!question) break;
        
        if (question.id === 'dissertation_stage') {
          foundDissertationQuestion = true;
          expect(question.choices).toContain('Proposal');
          expect(question.choices).toContain('Literature review');
          break;
        }
        
        await dialogueService.submitAnswer(session.id, question.id, 'Test answer');
        questionCount++;
      }
      
      expect(foundDissertationQuestion).toBe(true);
    });
  });

  describe('Answer Submission', () => {
    test('should submit answer and advance dialogue', async () => {
      const session = await dialogueService.startProjectDialogue();
      const question = dialogueService.getNextQuestion(session.id)!;
      
      const result = await dialogueService.submitAnswer(
        session.id, 
        question.id, 
        'My Dissertation Title'
      );
      
      expect(result.progress.current).toBe(1);
      expect(result.progress.total).toBeGreaterThan(1);
      expect(result.nextQuestion).toBeTruthy();
      expect(result.isComplete).toBe(false);
    });

    test('should update project context based on answers', async () => {
      const session = await dialogueService.startProjectDialogue();
      
      // Answer title question
      await dialogueService.submitAnswer(session.id, 'project_title', 'Test Project');
      expect(session.projectContext.title).toBe('Test Project');
      
      // Answer deadline question (assuming it exists in the flow)
      const questions = ['project_title', 'main_goal', 'current_status', 'biggest_concern'];
      for (const questionId of questions) {
        const question = dialogueService.getNextQuestion(session.id);
        if (question) {
          await dialogueService.submitAnswer(session.id, question.id, 'Test answer');
        }
      }
      
      // Answer deadline if we get there
      const deadlineQuestion = dialogueService.getNextQuestion(session.id);
      if (deadlineQuestion && deadlineQuestion.id === 'deadline') {
        await dialogueService.submitAnswer(session.id, 'deadline', '2024-12-31');
        expect(session.projectContext.deadline).toBe('2024-12-31');
      }
    });

    test('should complete dialogue when all questions answered', async () => {
      const session = await dialogueService.startProjectDialogue();
      
      // Answer all questions
      let questionCount = 0;
      let result;
      
      do {
        const question = dialogueService.getNextQuestion(session.id);
        if (!question) break;
        
        let answer = 'Test answer';
        if (question.type === 'choice' && question.choices) {
          answer = question.choices[0];
        } else if (question.type === 'date') {
          answer = '2024-12-31';
        }
        
        result = await dialogueService.submitAnswer(session.id, question.id, answer);
        questionCount++;
      } while (!result.isComplete && questionCount < 20); // Safety limit
      
      expect(result!.isComplete).toBe(true);
      expect(result!.nextQuestion).toBeNull();
      expect(session.isComplete).toBe(true);
    });

    test('should throw error for non-existent session', async () => {
      await expect(
        dialogueService.submitAnswer('non-existent', 'question', 'answer')
      ).rejects.toThrow('Dialogue session not found');
    });
  });

  describe('Project Plan Generation', () => {
    test('should generate project plan from completed dialogue', async () => {
      // Mock AI service to return markdown with bullet points that the parser expects
      const mockPlanResponse = `# Research Paper Project Plan

## Immediate Next Steps
- Set up research folder structure
- Begin literature review
- Create reference management system
- Develop research outline
- Schedule writing sessions

## Phase 1: Foundation (4 weeks)
- Literature review and source collection
- Research methodology design
- Initial outline creation`;
      
      // Setup mock to return our structured response
      (mockAIService.requestAI as jest.Mock).mockResolvedValueOnce(mockPlanResponse);
      
      const session = await dialogueService.startProjectDialogue({ 
        type: 'paper',
        title: 'Research Paper' 
      });
      
      // Complete the dialogue by answering all questions
      let questionCount = 0;
      while (questionCount < 10) { // Safety limit
        const question = dialogueService.getNextQuestion(session.id);
        if (!question) break;
        
        let answer = questionCount === 0 ? 'Research Paper' : 'Test answer';
        if (question.type === 'choice' && question.choices) {
          answer = question.choices[0];
        }
        
        const result = await dialogueService.submitAnswer(session.id, question.id, answer);
        if (result.isComplete) break;
        questionCount++;
      }
      
      // Ensure the session is marked as complete
      const updatedSession = dialogueService['activeSessions'].get(session.id);
      expect(updatedSession?.isComplete).toBe(true);
      
      const plan = await dialogueService.generateProjectPlan(session.id);
      
      expect(plan.title).toBe('Research Paper');
      expect(plan.phases).toHaveLength(1);
      expect(plan.immediateNextSteps).toContain('Set up research folder structure');
      expect(plan.confidence).toMatch(/low|medium|high/);
      
      // Verify AI service was called
      expect(mockAIService.requestAI).toHaveBeenCalledWith({
        systemPrompt: expect.stringContaining('academic project planner'),
        userPrompt: expect.stringContaining('Project Planning Dialogue Results'),
        maxTokens: 1500,
      });
    });

    test('should throw error for incomplete dialogue', async () => {
      const session = await dialogueService.startProjectDialogue();
      
      await expect(
        dialogueService.generateProjectPlan(session.id)
      ).rejects.toThrow('Dialogue must be completed');
    });

    test('should create fallback plan when AI fails', async () => {
      const session = await dialogueService.startProjectDialogue({ title: 'Fallback Test' });
      session.isComplete = true;
      
      // Mock AI failure
      (mockAIService.requestAI as jest.Mock).mockRejectedValueOnce(
        new Error('API key invalid')
      );
      
      const plan = await dialogueService.generateProjectPlan(session.id);
      
      expect(plan.title).toBe('Fallback Test');
      expect(plan.immediateNextSteps).toContain('Create a dedicated project folder');
      expect(plan.confidence).toBe('low');
    });
  });

  describe('Task Generation', () => {
    test('should create micro-tasks from project plan', async () => {
      const mockPlan = {
        title: 'Test Project',
        phases: [],
        immediateNextSteps: [
          'Set up project folder',
          'Create outline',
          'Schedule work sessions',
        ],
        potentialRisks: [],
        estimatedTimeline: '2 weeks',
        confidence: 'medium' as const,
      };
      
      const result = await dialogueService.createMicroTasksFromPlan('session-123', mockPlan);
      
      expect(result.tasksCreated).toBe(3);
      expect(result.immediateActions).toHaveLength(3);
      expect(result.immediateActions).toContain('Set up project folder');
      
      // Verify TaskService was called for each task
      expect(mockTaskService.createTask).toHaveBeenCalledTimes(3);
    });

    test('should limit tasks to prevent overwhelm', async () => {
      const mockPlan = {
        title: 'Large Project',
        phases: [],
        immediateNextSteps: Array.from({ length: 10 }, (_, i) => `Task ${i + 1}`),
        potentialRisks: [],
        estimatedTimeline: '1 month',
        confidence: 'high' as const,
      };
      
      const result = await dialogueService.createMicroTasksFromPlan('session-123', mockPlan);
      
      // Should limit to 5 tasks maximum (ADHD-friendly)
      expect(result.tasksCreated).toBe(5);
      expect(result.immediateActions).toHaveLength(5);
    });

    test('should handle task creation failures gracefully', async () => {
      const mockPlan = {
        title: 'Test Project',
        phases: [],
        immediateNextSteps: ['Task 1', 'Task 2', 'Task 3'],
        potentialRisks: [],
        estimatedTimeline: '1 week',
        confidence: 'medium' as const,
      };
      
      // Mock some task creation failures
      (mockTaskService.createTask as jest.Mock)
        .mockResolvedValueOnce({ id: '1' })
        .mockRejectedValueOnce(new Error('Task limit reached'))
        .mockResolvedValueOnce({ id: '3' });
      
      const result = await dialogueService.createMicroTasksFromPlan('session-123', mockPlan);
      
      // Should continue despite failures
      expect(result.tasksCreated).toBe(2);
      expect(result.immediateActions).toHaveLength(2);
    });

    test('should handle complete task creation failure', async () => {
      const mockPlan = {
        title: 'Test Project',
        phases: [],
        immediateNextSteps: ['Task 1'],
        potentialRisks: [],
        estimatedTimeline: '1 week',
        confidence: 'medium' as const,
      };
      
      // Mock task service to throw
      (mockTaskService.createTask as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );
      
      const result = await dialogueService.createMicroTasksFromPlan('session-123', mockPlan);
      
      expect(result.tasksCreated).toBe(0);
      expect(result.immediateActions).toHaveLength(0);
    });
  });

  describe('ADHD-Friendly Features', () => {
    test('should provide clear progress indicators', async () => {
      const session = await dialogueService.startProjectDialogue();
      
      const initialProgress = dialogueService.getSessionProgress(session.id)!;
      expect(initialProgress.percentage).toBe(0);
      expect(initialProgress.canContinue).toBe(true);
      
      // Answer a question
      const question = dialogueService.getNextQuestion(session.id)!;
      await dialogueService.submitAnswer(session.id, question.id, 'Test');
      
      const updatedProgress = dialogueService.getSessionProgress(session.id)!;
      expect(updatedProgress.percentage).toBeGreaterThan(0);
      expect(updatedProgress.current).toBe(1);
    });

    test('should trim whitespace from answers', async () => {
      const session = await dialogueService.startProjectDialogue();
      const question = dialogueService.getNextQuestion(session.id)!;
      
      await dialogueService.submitAnswer(session.id, question.id, '  Trimmed Answer  ');
      
      const response = session.responses.find(r => r.questionId === question.id);
      expect(response!.answer).toBe('Trimmed Answer');
    });

    test('should save timestamps for all interactions', async () => {
      const startTime = Date.now();
      const session = await dialogueService.startProjectDialogue();
      
      expect(session.created).toBeGreaterThanOrEqual(startTime);
      expect(session.updated).toBeGreaterThanOrEqual(startTime);
      
      const question = dialogueService.getNextQuestion(session.id)!;
      await dialogueService.submitAnswer(session.id, question.id, 'Test');
      
      const response = session.responses[0];
      expect(response.timestamp).toBeGreaterThanOrEqual(startTime);
      expect(session.updated).toBeGreaterThanOrEqual(response.timestamp);
    });

    test('should use simple, encouraging language in questions', async () => {
      const session = await dialogueService.startProjectDialogue();
      
      const question = dialogueService.getNextQuestion(session.id);
      
      expect(question!.text).not.toContain('methodology');
      expect(question!.text).not.toContain('epistemological');
      expect(question!.text).toMatch(/simple|working|main|what/i);
    });
  });
});