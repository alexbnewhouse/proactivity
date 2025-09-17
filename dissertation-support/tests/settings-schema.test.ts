/**
 * Settings Schema Tests
 * Focus: Graceful degradation and ADHD-friendly defaults
 */

import { validateSettings, updateSetting, DEFAULT_SETTINGS } from '../src/settings-schema';

describe('Settings Schema', () => {
  test('provides sensible defaults', () => {
    const { settings, warnings } = validateSettings({});
    
    expect(settings.showOnboardingTips).toBe(true); // ADHD-friendly default
    expect(settings.maxPlanningDepth).toBe(3); // Not overwhelming
    expect(settings.autoSaveInterval).toBe(5); // Reduce loss anxiety
    expect(warnings).toHaveLength(0); // Empty object is valid
  });

  test('gracefully handles invalid settings', () => {
    const { settings, warnings } = validateSettings({
      maxPlanningDepth: 'not-a-number',
      invalidField: 'should-be-ignored',
    });
    
    expect(settings.maxPlanningDepth).toBe(DEFAULT_SETTINGS.maxPlanningDepth);
    expect(warnings.length).toBeGreaterThan(0);
  });

  test('preserves valid settings while fixing invalid ones', () => {
    const { settings } = validateSettings({
      showOnboardingTips: false, // Valid
      maxPlanningDepth: 999,     // Invalid (too high)
      apiKey: 'test-key',        // Valid
    });
    
    expect(settings.showOnboardingTips).toBe(false);
    expect(settings.maxPlanningDepth).toBe(DEFAULT_SETTINGS.maxPlanningDepth);
    expect(settings.apiKey).toBe('test-key');
  });

  test('individual setting updates work safely', () => {
    const currentSettings = DEFAULT_SETTINGS;
    
    const { settings: updated } = updateSetting(currentSettings, 'focusMode', true);
    expect(updated.focusMode).toBe(true);
    
    const { settings: unchanged, warning } = updateSetting(currentSettings, 'maxPlanningDepth', 'invalid');
    expect(unchanged.maxPlanningDepth).toBe(DEFAULT_SETTINGS.maxPlanningDepth);
    expect(warning).toBeDefined();
  });
});