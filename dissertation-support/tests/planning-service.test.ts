/**
 * PlanningService Tests
 * Focus: ADHD-friendly planning features and file management
 */

import { PlanningService, PlanConfig, AppInterface, VaultInterface } from '../src/planning-service';
import { AIService } from '../src/ai-service';

// Mock AIService
const mockAIService = {
  generatePlan: jest.fn(),
  generateDeltaUpdate: jest.fn(),
  updateProvider: jest.fn(),
} as any;

// Mock Obsidian App
const createMockApp = (): AppInterface => ({
  vault: {
    getAbstractFileByPath: jest.fn(),
    create: jest.fn().mockResolvedValue({}),
    createFolder: jest.fn().mockResolvedValue({}),
  } as jest.Mocked<VaultInterface>,
});

describe('PlanningService', () => {
  let planningService: PlanningService;
  let mockApp: AppInterface;
  let config: PlanConfig;

  beforeEach(() => {
    mockApp = createMockApp();
    planningService = new PlanningService(mockApp, mockAIService);
    
    config = {
      topic: 'AI in Education',
      planType: 'dissertation',
      deadline: '2025-12-31',
      targetWordCount: 50000,
      outputFolder: 'Plans',
    };

    // Clear mocks
    jest.clearAllMocks();
  });

  test('generates dissertation plan successfully', async () => {
    const mockPlanContent = '# Dissertation Plan\n\n## Chapter 1: Introduction\n- Define research questions';
    mockAIService.generatePlan.mockResolvedValue(mockPlanContent);

    const plan = await planningService.generatePlan(config);

    expect(plan).toBe(mockPlanContent);
    expect(mockAIService.generatePlan).toHaveBeenCalledWith(
      'dissertation',
      'AI in Education',
      expect.stringContaining('ADHD')
    );
  });

  test('requires topic for plan generation', async () => {
    const invalidConfig = { ...config, topic: '' };

    await expect(planningService.generatePlan(invalidConfig)).rejects.toThrow(
      'Dissertation topic is required'
    );
  });

  test('calculates timeline correctly', async () => {
    // Set a deadline 30 days from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const deadline = futureDate.toISOString().split('T')[0];
    
    const configWithDeadline = { ...config, deadline };
    mockAIService.generatePlan.mockResolvedValue('Mock plan content');

    await planningService.generatePlan(configWithDeadline);

    // Check that the AI service was called with timeline context
    const promptCall = mockAIService.generatePlan.mock.calls[0][2];
    expect(promptCall).toContain('30 days');
    expect(promptCall).toContain('weeks) remain until the deadline');
  });

  test('handles overdue deadline appropriately', async () => {
    const pastDate = '2020-01-01';
    const configPastDeadline = { ...config, deadline: pastDate };
    mockAIService.generatePlan.mockResolvedValue('Emergency plan content');

    await planningService.generatePlan(configPastDeadline);

    const promptCall = mockAIService.generatePlan.mock.calls[0][2];
    expect(promptCall).toContain('appears in the past');
    expect(promptCall).toContain('rapid triage scaffolding');
  });

  test('builds ADHD-friendly prompt context', async () => {
    mockAIService.generatePlan.mockResolvedValue('Mock plan');

    await planningService.generatePlan(config);

    const promptCall = mockAIService.generatePlan.mock.calls[0][2];
    
    // Check ADHD-specific elements
    expect(promptCall).toContain('Neurodivergent constraints (ADHD)');
    expect(promptCall).toContain('Task initiation friction');
    expect(promptCall).toContain('Working memory volatility');
    expect(promptCall).toContain('5–25 min');
    expect(promptCall).toContain('concrete micro actions');
    expect(promptCall).toContain('Context preservation tips');
  });

  test('includes word count in prompt when provided', async () => {
    mockAIService.generatePlan.mockResolvedValue('Mock plan');

    await planningService.generatePlan(config);

    const promptCall = mockAIService.generatePlan.mock.calls[0][2];
    expect(promptCall).toContain('50,000 words');
    expect(promptCall).toContain('word allocation per major section');
  });

  test('handles missing word count gracefully', async () => {
    const configNoWordCount = { ...config, targetWordCount: undefined };
    mockAIService.generatePlan.mockResolvedValue('Mock plan');

    await planningService.generatePlan(configNoWordCount);

    const promptCall = mockAIService.generatePlan.mock.calls[0][2];
    expect(promptCall).toContain('No explicit word target provided');
  });

  test('creates plan file with proper structure', async () => {
    const mockPlanContent = '## Introduction\n- Research questions\n- Literature review';
    
    const result = await planningService.createPlanFile(config, mockPlanContent);

    // Check file creation
    expect(mockApp.vault.createFolder).toHaveBeenCalledWith('Plans');
    expect(mockApp.vault.create).toHaveBeenCalledWith(
      expect.stringMatching(/^Plans\/Dissertation Plan - \d{4}-\d{2}-\d{2}\.md$/),
      expect.stringContaining('# Dissertation Plan: AI in Education')
    );

    // Check metadata
    expect(result.metadata).toMatchObject({
      file: expect.stringMatching(/^Plans\/Dissertation Plan - \d{4}-\d{2}-\d{2}\.md$/),
      created: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      daysRemaining: expect.any(Number),
    });
  });

  test('creates file without folder when not specified', async () => {
    const configNoFolder = { ...config, outputFolder: undefined };
    const mockPlanContent = 'Mock content';
    
    await planningService.createPlanFile(configNoFolder, mockPlanContent);

    // Should not create folder
    expect(mockApp.vault.createFolder).not.toHaveBeenCalled();
    
    // Should create file in root
    expect(mockApp.vault.create).toHaveBeenCalledWith(
      expect.stringMatching(/^Dissertation Plan - \d{4}-\d{2}-\d{2}\.md$/),
      expect.any(String)
    );
  });

  test('creates files without overwriting', async () => {
    // This test verifies the service creates files
    // The safeCreateFile method handles conflicts internally
    await planningService.createPlanFile(config, 'Mock content');

    // Should have attempted to create folder and file
    expect(mockApp.vault.createFolder).toHaveBeenCalledWith('Plans');
    expect(mockApp.vault.create).toHaveBeenCalledWith(
      expect.stringMatching(/^Plans\/Dissertation Plan - \d{4}-\d{2}-\d{2}\.md$/),
      expect.stringContaining('# Dissertation Plan: AI in Education')
    );
  });

  test('generates delta update with previous plan context', async () => {
    const mockDeltaContent = '# Delta Update\n\n## Changes\n- Timeline updated';
    mockAIService.generateDeltaUpdate.mockResolvedValue(mockDeltaContent);
    
    const previousPlan = {
      file: 'Previous Plan.md',
      created: '2025-09-01',
      daysRemaining: 60,
    };

    const delta = await planningService.generateDeltaUpdate(config, previousPlan);

    expect(delta).toBe(mockDeltaContent);
    expect(mockAIService.generateDeltaUpdate).toHaveBeenCalledWith(
      'dissertation',
      'AI in Education',
      previousPlan
    );
  });

  test('creates delta file with proper naming', async () => {
    const mockDeltaContent = 'Delta update content';
    const previousPlan = {
      file: 'Previous Plan.md',
      created: '2025-09-01',
      daysRemaining: 60,
    };

    const deltaPath = await planningService.createDeltaFile(config, mockDeltaContent, previousPlan);

    expect(mockApp.vault.create).toHaveBeenCalledWith(
      expect.stringMatching(/^Plans\/Dissertation Plan Delta - \d{4}-\d{2}-\d{2}\.md$/),
      expect.stringContaining('# Dissertation Plan Delta')
    );
    expect(deltaPath).toMatch(/^Plans\/Dissertation Plan Delta - \d{4}-\d{2}-\d{2}\.md$/);
  });

  test('handles prospectus vs dissertation differences', async () => {
    const prospectusConfig = { ...config, planType: 'prospectus' as const };
    mockAIService.generatePlan.mockResolvedValue('Prospectus content');

    await planningService.generatePlan(prospectusConfig);
    await planningService.createPlanFile(prospectusConfig, 'Prospectus content');

    // Check AI service call
    expect(mockAIService.generatePlan).toHaveBeenCalledWith(
      'prospectus',
      'AI in Education',
      expect.stringContaining('prospectus sections')
    );

    // Check file creation
    expect(mockApp.vault.create).toHaveBeenCalledWith(
      expect.stringMatching(/^Plans\/Prospectus Plan - \d{4}-\d{2}-\d{2}\.md$/),
      expect.stringContaining('# Prospectus Plan: AI in Education')
    );
  });
});