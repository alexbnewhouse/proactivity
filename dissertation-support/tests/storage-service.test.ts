/**
 * StorageService Tests
 * Focus: Graceful error handling and ADHD-friendly behavior
 */

import { StorageService } from '../src/storage-service';
import { DEFAULT_SETTINGS } from '../src/settings-schema';

describe('StorageService', () => {
  let mockPlugin: any;
  let storageService: StorageService;

  beforeEach(() => {
    mockPlugin = {
      loadData: jest.fn(),
      saveData: jest.fn(),
    };
    storageService = new StorageService(mockPlugin);
  });

  afterEach(() => {
    storageService.cleanup();
  });

  test('loads valid settings successfully', async () => {
    const testSettings = { ...DEFAULT_SETTINGS, showOnboardingTips: false };
    mockPlugin.loadData.mockResolvedValue(testSettings);

    const settings = await storageService.loadSettings();
    
    expect(settings.showOnboardingTips).toBe(false);
    expect(mockPlugin.loadData).toHaveBeenCalledTimes(1);
  });

  test('handles corrupted data gracefully', async () => {
    mockPlugin.loadData.mockResolvedValue({
      maxPlanningDepth: 'not-a-number',
      unknownField: 'should-be-ignored',
    });

    const settings = await storageService.loadSettings();
    
    // Should fall back to defaults for invalid fields
    expect(settings.maxPlanningDepth).toBe(DEFAULT_SETTINGS.maxPlanningDepth);
    expect(settings.showOnboardingTips).toBe(DEFAULT_SETTINGS.showOnboardingTips);
  });

  test('handles load errors gracefully', async () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockPlugin.loadData.mockRejectedValue(new Error('Disk error'));

    const settings = await storageService.loadSettings();
    
    // Should return defaults without throwing
    expect(settings).toEqual(DEFAULT_SETTINGS);
    
    consoleSpy.mockRestore();
  });

  test('saves settings successfully', async () => {
    const testSettings = { ...DEFAULT_SETTINGS, focusMode: true };
    
    await storageService.forceSave(testSettings);
    
    expect(mockPlugin.saveData).toHaveBeenCalledWith(testSettings);
  });

  test('debounces rapid saves', async () => {
    const testSettings = DEFAULT_SETTINGS;
    
    // Make multiple rapid saves
    storageService.saveSettings(testSettings);
    storageService.saveSettings(testSettings);
    storageService.saveSettings(testSettings);
    
    // Should not save immediately due to debouncing
    expect(mockPlugin.saveData).not.toHaveBeenCalled();
    
    // Wait for debounce period
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Should have saved only once
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(1);
  });

  test('force save bypasses debouncing', async () => {
    const testSettings = DEFAULT_SETTINGS;
    
    await storageService.forceSave(testSettings);
    
    // Should save immediately
    expect(mockPlugin.saveData).toHaveBeenCalledTimes(1);
  });

  test('updates individual settings safely', async () => {
    const currentSettings = DEFAULT_SETTINGS;
    
    const { settings, warning } = await storageService.updateSetting(
      currentSettings, 
      'focusMode', 
      true
    );
    
    expect(settings.focusMode).toBe(true);
    expect(warning).toBeUndefined();
  });

  test('handles invalid setting updates gracefully', async () => {
    const currentSettings = DEFAULT_SETTINGS;
    
    const { settings, warning } = await storageService.updateSetting(
      currentSettings,
      'maxPlanningDepth',
      999 // Invalid - exceeds max of 5
    );
    
    // Should keep current value when validation fails
    expect(settings.maxPlanningDepth).toBe(DEFAULT_SETTINGS.maxPlanningDepth);
    expect(warning).toBeDefined();
  });
});