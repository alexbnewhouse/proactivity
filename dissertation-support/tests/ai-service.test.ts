/**
 * AIService Tests
 * Focus: Graceful error handling, retry logic, and ADHD-friendly behavior
 */

import { AIService, AIProvider } from '../src/ai-service';

// Mock fetch globally
global.fetch = jest.fn();
// Mock Notice from Obsidian
(global as any).Notice = jest.fn();

describe('AIService', () => {
  let aiService: AIService;
  let mockProvider: AIProvider;

  beforeEach(() => {
    mockProvider = {
      name: 'openai',
      apiKey: 'test-key-123',
      maxTokens: 2000,
      temperature: 0.7,
    };

    aiService = new AIService({
      defaultProvider: mockProvider,
      retryAttempts: 2, // Lower for faster tests
      timeoutMs: 1000,
      enableLogging: false,
    });

    // Clear mocks
    (fetch as jest.Mock).mockClear();
    ((global as any).Notice as jest.Mock).mockClear();
  });

  test('generates dissertation plan successfully', async () => {
    // Mock successful OpenAI response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '# Dissertation Plan\n\n## Phase 1: Research\n- Literature review\n- Define methodology',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300,
        },
      }),
    });

    const plan = await aiService.generatePlan('dissertation', 'AI in Education');

    expect(plan).toContain('# Dissertation Plan');
    expect(plan).toContain('Phase 1: Research');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-key-123',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  test('generates prospectus plan with different system prompt', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '# Prospectus Plan\n\n## Scope Definition' } }],
      }),
    });

    await aiService.generatePlan('prospectus', 'Machine Learning Ethics');

    const fetchCall = (fetch as jest.Mock).mock.calls[0][1];
    const requestBody = JSON.parse(fetchCall.body);
    
    expect(requestBody.messages[0].content).toContain('prospectus');
    expect(requestBody.messages[0].content).toContain('scope clarity');
  });

  test('handles API errors gracefully with fallback', async () => {
    // Mock API error
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    const plan = await aiService.generatePlan('dissertation', 'Test Topic');

    // Should return fallback plan
    expect(plan).toContain('⚠️ *This is a fallback template - AI generation failed*');
    expect(plan).toContain('Test Topic');
    
    // Should show error notice
    expect((global as any).Notice).toHaveBeenCalledWith(
      '❌ Failed to generate plan. Check your API key and try again.',
      8000
    );
  });

  test('retries on network errors', async () => {
    // First attempt fails, second succeeds
    (fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Success after retry' } }],
        }),
      });

    const plan = await aiService.generatePlan('dissertation', 'Test Topic');

    expect(plan).toBe('Success after retry');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test('generates delta update with previous plan context', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '# Delta Update\n\n## Changes\n- Timeline adjusted' } }],
      }),
    });

    const previousPlan = {
      file: 'Previous Plan.md',
      created: '2025-09-01',
      daysRemaining: 30,
    };

    const delta = await aiService.generateDeltaUpdate('dissertation', 'Test Topic', previousPlan);

    expect(delta).toContain('# Delta Update');
    expect(delta).toContain('Changes');
    
    const fetchCall = (fetch as jest.Mock).mock.calls[0][1];
    const requestBody = JSON.parse(fetchCall.body);
    
    expect(requestBody.messages[1].content).toContain('Previous Plan.md');
    expect(requestBody.messages[1].content).toContain('DELTA UPDATE');
  });

  test('handles missing API key gracefully', async () => {
    const noKeyService = new AIService({
      defaultProvider: { name: 'openai' }, // No API key
    });

    const plan = await noKeyService.generatePlan('dissertation', 'Test Topic');

    // Should return fallback without making API call
    expect(plan).toContain('⚠️ *This is a fallback template - AI generation failed*');
    expect(fetch).not.toHaveBeenCalled();
  });

  test('updates provider configuration', () => {
    aiService.updateProvider({ apiKey: 'new-key', temperature: 0.5 });
    
    // Verify by checking if new key is used in next request
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Test response' } }],
      }),
    });

    aiService.generatePlan('dissertation', 'Test');
    
    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer new-key',
        }),
      })
    );
  });

  test('respects custom parameters in requests', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Custom response' } }],
      }),
    });

    await aiService.generatePlan('dissertation', 'Test Topic');
    
    const fetchCall = (fetch as jest.Mock).mock.calls[0][1];
    const requestBody = JSON.parse(fetchCall.body);
    
    expect(requestBody.max_tokens).toBe(2500);
    expect(requestBody.temperature).toBe(0.7);
    expect(requestBody.model).toBe('gpt-4');
  });
});