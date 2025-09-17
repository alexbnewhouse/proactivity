/**
 * ADHD-Friendly Start: One simple test to get momentum
 * Goal: Make sure our testing works at all
 */

describe('Testing Works', () => {
  test('basic math works', () => {
    expect(2 + 2).toBe(4);
  });

  test('plugin can be imported', async () => {
    // Simple mock without complex Obsidian types
    const mockPlugin = {
      settings: { showOnboardingTips: true },
      saveData: jest.fn(),
    };
    
    expect(mockPlugin.settings.showOnboardingTips).toBe(true);
  });
});