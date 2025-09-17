/**
 * Task Service Tests
 * ADHD-friendly fast feedback with comprehensive coverage
 */

import { TaskService, MicroTask, DailyTasksRecord } from '../src/task-service';

// Mock Obsidian app interface
const mockApp = {
  vault: {
    getAbstractFileByPath: jest.fn(),
    create: jest.fn(),
    modify: jest.fn(),
  },
  workspace: {
    openLinkText: jest.fn(),
  },
};

describe('TaskService', () => {
  let taskService: TaskService;
  let mockTodayKey: string;

  beforeEach(() => {
    taskService = new TaskService(mockApp as any);
    mockTodayKey = '2024-01-15'; // Fixed date for testing
    
    // Mock today's date
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-15T10:30:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(1705311000000); // Fixed timestamp
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Task Creation', () => {
    test('should create a micro-task with proper structure', () => {
      const task = taskService.createTask('Write introduction paragraph');
      
      expect(task).toMatchObject({
        text: 'Write introduction paragraph',
        status: 'todo',
        order: 0,
        created: 1705311000000,
        updated: 1705311000000,
      });
      expect(task.id).toMatch(/^2024-01-15-[a-z0-9]{6}$/);
    });

    test('should trim task text', () => {
      const task = taskService.createTask('  Spaced task  ');
      expect(task.text).toBe('Spaced task');
    });

    test('should throw error for empty task text', () => {
      expect(() => taskService.createTask('')).toThrow('Task text cannot be empty');
      expect(() => taskService.createTask('   ')).toThrow('Task text cannot be empty');
    });

    test('should enforce ADHD-friendly task limits', () => {
      // Create maximum tasks (12 by default)
      for (let i = 0; i < 12; i++) {
        taskService.createTask(`Task ${i + 1}`);
      }
      
      // 13th task should be rejected to prevent overwhelm
      expect(() => taskService.createTask('Overwhelming task')).toThrow('Maximum 12 tasks per day');
    });

    test('should assign sequential order numbers', () => {
      const task1 = taskService.createTask('First task');
      const task2 = taskService.createTask('Second task');
      const task3 = taskService.createTask('Third task');
      
      expect(task1.order).toBe(0);
      expect(task2.order).toBe(1);
      expect(task3.order).toBe(2);
    });
  });

  describe('Task Status Management', () => {
    let testTask: MicroTask;

    beforeEach(() => {
      testTask = taskService.createTask('Test task for status changes');
    });

    test('should update task status', () => {
      const updatedTask = taskService.updateTaskStatus(testTask.id, 'doing');
      
      expect(updatedTask).toBeTruthy();
      expect(updatedTask!.status).toBe('doing');
      expect(updatedTask!.updated).toBe(1705311000000);
    });

    test('should return null for non-existent task', () => {
      const result = taskService.updateTaskStatus('non-existent', 'done');
      expect(result).toBeNull();
    });

    test('should cycle task status in logical progression', () => {
      // todo → doing
      let cycled = taskService.cycleTaskStatus(testTask.id);
      expect(cycled!.status).toBe('doing');
      
      // doing → done
      cycled = taskService.cycleTaskStatus(testTask.id);
      expect(cycled!.status).toBe('done');
      
      // done → todo (cycle back)
      cycled = taskService.cycleTaskStatus(testTask.id);
      expect(cycled!.status).toBe('todo');
    });

    test('should handle task completion callback', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      taskService.updateTaskStatus(testTask.id, 'done');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[TaskService] Task completed: Test task for status changes'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Task Retrieval and Statistics', () => {
    beforeEach(() => {
      taskService.createTask('Todo task 1');
      taskService.createTask('Todo task 2');
      const doingTask = taskService.createTask('Doing task');
      const doneTask = taskService.createTask('Done task');
      
      taskService.updateTaskStatus(doingTask.id, 'doing');
      taskService.updateTaskStatus(doneTask.id, 'done');
    });

    test('should get today\'s tasks sorted by order', () => {
      const tasks = taskService.getTodaysTasks();
      
      expect(tasks).toHaveLength(4);
      expect(tasks[0].order).toBe(0);
      expect(tasks[1].order).toBe(1);
      expect(tasks[2].order).toBe(2);
      expect(tasks[3].order).toBe(3);
    });

    test('should calculate task statistics correctly', () => {
      const stats = taskService.getTaskStats();
      
      expect(stats).toEqual({
        total: 4,
        todo: 2,
        doing: 1,
        done: 1,
        completionRate: 0.25,
        momentum: 'high', // Has both doing and done tasks
      });
    });

    test('should determine momentum levels correctly', () => {
      // Clear tasks and test different scenarios
      taskService.setTasksData({});
      
      // High momentum: >70% done or has doing tasks
      const task1 = taskService.createTask('Task 1');
      const task2 = taskService.createTask('Task 2');
      taskService.updateTaskStatus(task1.id, 'done');
      taskService.updateTaskStatus(task2.id, 'done');
      
      expect(taskService.getTaskStats().momentum).toBe('high');
      
      // Reset and test moderate momentum
      taskService.setTasksData({});
      const task3 = taskService.createTask('Task 3');
      taskService.updateTaskStatus(task3.id, 'done');
      taskService.createTask('Task 4');
      taskService.createTask('Task 5');
      
      expect(taskService.getTaskStats().momentum).toBe('moderate');
    });

    test('should return empty array for non-existent date', () => {
      const tasks = taskService.getTasksForDate('2024-01-01');
      expect(tasks).toEqual([]);
    });
  });

  describe('Task Reordering', () => {
    let task1: MicroTask, task2: MicroTask, task3: MicroTask;

    beforeEach(() => {
      task1 = taskService.createTask('First task');
      task2 = taskService.createTask('Second task');
      task3 = taskService.createTask('Third task');
    });

    test('should reorder tasks successfully', () => {
      const success = taskService.reorderTasks([task3.id, task1.id, task2.id]);
      
      expect(success).toBe(true);
      
      const tasks = taskService.getTodaysTasks();
      expect(tasks[0].text).toBe('Third task');
      expect(tasks[1].text).toBe('First task');
      expect(tasks[2].text).toBe('Second task');
      
      expect(tasks[0].order).toBe(0);
      expect(tasks[1].order).toBe(1);
      expect(tasks[2].order).toBe(2);
    });

    test('should fail reordering with invalid task IDs', () => {
      const success = taskService.reorderTasks([task1.id, 'invalid-id', task2.id]);
      expect(success).toBe(false);
    });

    test('should update task timestamps on reorder', () => {
      taskService.reorderTasks([task2.id, task1.id, task3.id]);
      
      const tasks = taskService.getTodaysTasks();
      tasks.forEach(task => {
        expect(task.updated).toBe(1705311000000);
      });
    });
  });

  describe('Task Extraction from Content', () => {
    const samplePlanContent = `
# Research Plan

## Introduction
- Read 5 research papers on topic
- Take notes on key findings
- Identify research gaps

## Methodology  
- Design experiment protocol
- Create participant recruitment flyer
- Set up data collection tools

## Random long text that should be excluded because it exceeds the maximum length for a micro task
- Write conclusion chapter
`;

    test('should extract appropriate bullet tasks', () => {
      const extracted = taskService.extractTasksFromContent(samplePlanContent);
      
      expect(extracted).toContain('Read 5 research papers on topic');
      expect(extracted).toContain('Take notes on key findings');
      expect(extracted).toContain('Design experiment protocol');
      expect(extracted).not.toContain('Random long text that should be excluded');
      expect(extracted).not.toContain('Introduction'); // Headings excluded
    });

    test('should respect extraction limits', () => {
      const extracted = taskService.extractTasksFromContent(samplePlanContent, {
        maxTasks: 2,
      });
      
      expect(extracted).toHaveLength(2);
    });

    test('should apply length filters', () => {
      const extracted = taskService.extractTasksFromContent(samplePlanContent, {
        minLength: 20,
        maxLength: 50,
      });
      
      // Should exclude short tasks and very long tasks
      const longTasks = extracted.filter(task => task.length > 50);
      const shortTasks = extracted.filter(task => task.length < 20);
      
      expect(longTasks).toHaveLength(0);
      expect(shortTasks).toHaveLength(0);
    });

    test('should handle empty content gracefully', () => {
      const extracted = taskService.extractTasksFromContent('');
      expect(extracted).toEqual([]);
    });
  });

  describe('Plan Integration', () => {
    beforeEach(() => {
      mockApp.vault.getAbstractFileByPath.mockReturnValue({ path: 'plan.md' });
      mockApp.vault.create.mockResolvedValue(`
- Write literature review section
- Analyze data from study 1  
- Create methodology diagram
- Schedule advisor meeting
      `);
    });

    test('should seed tasks from plan file', async () => {
      const result = await taskService.seedTasksFromPlan('research-plan.md');
      
      expect(result.added).toBeGreaterThan(0);
      expect(result.tasks).toHaveLength(result.added);
      expect(result.tasks[0].text).toBe('Write literature review section');
      expect(mockApp.vault.getAbstractFileByPath).toHaveBeenCalledWith('research-plan.md');
    });

    test('should throw error for non-existent plan file', async () => {
      mockApp.vault.getAbstractFileByPath.mockReturnValue(null);
      
      await expect(taskService.seedTasksFromPlan('missing.md')).rejects.toThrow('Plan file not found');
    });

    test('should respect max tasks when seeding', async () => {
      const result = await taskService.seedTasksFromPlan('research-plan.md', 2);
      
      expect(result.added).toBeLessThanOrEqual(2);
      expect(result.tasks).toHaveLength(result.added);
    });
  });

  describe('Task Board HTML Generation', () => {
    test('should generate empty state HTML', () => {
      const html = taskService.generateTaskBoardHTML();
      
      expect(html).toContain('<!-- ds-task-board:start -->');
      expect(html).toContain('<!-- ds-task-board:end -->');
      expect(html).toContain('Add a micro-task (≤ 25 min)');
      expect(html).toContain('ds-task-empty');
    });

    test('should generate task cards with proper status classes', () => {
      const task1 = taskService.createTask('Todo task');
      const task2 = taskService.createTask('Doing task');
      taskService.updateTaskStatus(task2.id, 'doing');
      
      const html = taskService.generateTaskBoardHTML();
      
      expect(html).toContain('status-todo');
      expect(html).toContain('status-doing');
      expect(html).toContain('Todo task');
      expect(html).toContain('Doing task');
      expect(html).toContain('0/2 done'); // Progress indicator
    });

    test('should escape HTML in task text', () => {
      taskService.createTask('Task with <script>alert("xss")</script>');
      
      const html = taskService.generateTaskBoardHTML();
      
      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script>');
    });

    test('should show momentum indicators', () => {
      const task1 = taskService.createTask('Task 1');
      const task2 = taskService.createTask('Task 2');
      taskService.updateTaskStatus(task1.id, 'done');
      taskService.updateTaskStatus(task2.id, 'doing');
      
      const html = taskService.generateTaskBoardHTML();
      
      expect(html).toContain('🔥'); // High momentum icon
    });
  });

  describe('Daily Note Integration', () => {
    beforeEach(() => {
      mockApp.vault.getAbstractFileByPath.mockReturnValue({ path: '2024-01-15.md' });
      mockApp.vault.create.mockResolvedValue('');
    });

    test('should create daily note if it doesn\'t exist', async () => {
      mockApp.vault.getAbstractFileByPath
        .mockReturnValueOnce(null) // First call returns null (file doesn't exist)
        .mockReturnValueOnce({ path: '2024-01-15.md' }); // Second call returns created file
      
      await taskService.upsertTaskBoardInDailyNote();
      
      expect(mockApp.vault.create).toHaveBeenCalledWith('2024-01-15.md', '# 2024-01-15\n\n');
    });

    test('should handle daily note creation gracefully', async () => {
      await expect(taskService.upsertTaskBoardInDailyNote()).resolves.not.toThrow();
    });
  });

  describe('Data Persistence', () => {
    test('should export tasks data', () => {
      taskService.createTask('Persistent task');
      
      const data = taskService.getTasksData();
      
      expect(data).toHaveProperty(mockTodayKey);
      expect(data[mockTodayKey]).toHaveLength(1);
      expect(data[mockTodayKey][0].text).toBe('Persistent task');
    });

    test('should import tasks data', () => {
      const externalData: DailyTasksRecord = {
        '2024-01-10': [
          {
            id: '2024-01-10-abc123',
            text: 'Imported task',
            status: 'done',
            order: 0,
            created: 1705000000000,
            updated: 1705000000000,
          },
        ],
      };
      
      taskService.setTasksData(externalData);
      
      const tasks = taskService.getTasksForDate('2024-01-10');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].text).toBe('Imported task');
    });
  });

  describe('Configuration Options', () => {
    test('should respect custom task limits', () => {
      const customTaskService = new TaskService(mockApp as any, {}, { maxTasksPerDay: 3 });
      
      // Create maximum allowed tasks
      customTaskService.createTask('Task 1');
      customTaskService.createTask('Task 2');
      customTaskService.createTask('Task 3');
      
      // 4th task should be rejected
      expect(() => customTaskService.createTask('Task 4')).toThrow('Maximum 3 tasks per day');
    });

    test('should handle drag-drop configuration', () => {
      const noDragService = new TaskService(mockApp as any, {}, { enableDragDrop: false });
      noDragService.createTask('Test task');
      
      const html = noDragService.generateTaskBoardHTML();
      expect(html).toContain('draggable="false"');
    });
  });
});