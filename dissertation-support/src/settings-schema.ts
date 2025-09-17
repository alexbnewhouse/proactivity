/**
 * ADHD-Friendly Settings Schema
 * 
 * Philosophy:
 * - Graceful degradation - never crash, always provide sensible defaults
 * - Clear validation errors that help rather than overwhelm
 * - Minimal cognitive load for configuration
 */

import { z } from 'zod';

// ADHD-friendly defaults - designed to reduce overwhelm
export const DEFAULT_SETTINGS = {
  showOnboardingTips: true,
  onboardingTipFrequency: 'daily' as const,
  aiProvider: 'openai' as const,
  apiKey: '',
  maxPlanningDepth: 3, // Prevent overwhelming nested structures
  taskReminderInterval: 30, // Minutes - frequent enough to help, not annoy
  autoSaveInterval: 5, // Minutes - frequent saves reduce loss anxiety
  enableQuickCapture: true,
  focusMode: false, // Start with full features, let users discover
  theme: 'auto' as const,
  debugMode: false,
  lastUsedFeatures: {} as Record<string, number>, // For tip frequency logic
  lastOpenedBoardId: '', // Remember last Kanban board
} as const;

// Zod schemas with graceful defaults
const OnboardingTipFrequencySchema = z.enum(['daily', 'launch', 'manual']).default('daily');
const AIProviderSchema = z.enum(['openai', 'anthropic', 'local']).default('openai');
const ThemeSchema = z.enum(['light', 'dark', 'auto']).default('auto');

export const SettingsSchema = z.object({
  showOnboardingTips: z.boolean().default(DEFAULT_SETTINGS.showOnboardingTips),
  onboardingTipFrequency: OnboardingTipFrequencySchema,
  aiProvider: AIProviderSchema,
  apiKey: z.string().default(DEFAULT_SETTINGS.apiKey),
  maxPlanningDepth: z.number().min(1).max(5).default(DEFAULT_SETTINGS.maxPlanningDepth),
  taskReminderInterval: z.number().min(5).max(120).default(DEFAULT_SETTINGS.taskReminderInterval),
  autoSaveInterval: z.number().min(1).max(30).default(DEFAULT_SETTINGS.autoSaveInterval),
  enableQuickCapture: z.boolean().default(DEFAULT_SETTINGS.enableQuickCapture),
  focusMode: z.boolean().default(DEFAULT_SETTINGS.focusMode),
  theme: ThemeSchema,
  debugMode: z.boolean().default(DEFAULT_SETTINGS.debugMode),
  lastUsedFeatures: z.record(z.string(), z.number()).default(DEFAULT_SETTINGS.lastUsedFeatures),
  lastOpenedBoardId: z.string().default(DEFAULT_SETTINGS.lastOpenedBoardId),
});

export type Settings = z.infer<typeof SettingsSchema>;

/**
 * ADHD-Friendly Settings Validation
 * 
 * Never throws - always returns valid settings with helpful warnings
 */
export function validateSettings(rawSettings: unknown): {
  settings: Settings;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  try {
    // Primary validation attempt
    const settings = SettingsSchema.parse(rawSettings);
    return { settings, warnings };
  } catch (error) {
    // Graceful degradation - merge valid fields with defaults
    if (error instanceof z.ZodError) {
      const result = SettingsSchema.safeParse(rawSettings);
      
      if (!result.success) {
        // Extract any valid fields and merge with defaults
        const validFields: Partial<Settings> = {};
        
        if (rawSettings && typeof rawSettings === 'object') {
          const raw = rawSettings as Record<string, unknown>;
          
          // Try to save what we can
          Object.entries(raw).forEach(([key, value]) => {
            try {
              const fieldSchema = SettingsSchema.shape[key as keyof Settings];
              if (fieldSchema) {
                const parsed = fieldSchema.parse(value);
                (validFields as any)[key] = parsed;
              }
            } catch {
              warnings.push(`Invalid value for ${key}, using default`);
            }
          });
        }
        
        // Merge with defaults
        const settings = { ...DEFAULT_SETTINGS, ...validFields };
        warnings.push('Some settings were invalid and have been reset to defaults');
        
        return { settings, warnings };
      }
    }
    
    // Ultimate fallback
    warnings.push('Settings could not be parsed, using all defaults');
    return { settings: DEFAULT_SETTINGS, warnings };
  }
}

/**
 * ADHD-Friendly Settings Update
 * 
 * Validates individual setting changes without affecting the whole config
 */
export function updateSetting<K extends keyof Settings>(
  currentSettings: Settings,
  key: K,
  value: unknown
): { settings: Settings; warning?: string } {
  try {
    const fieldSchema = SettingsSchema.shape[key];
    const validValue = fieldSchema.parse(value);
    
    return {
      settings: { ...currentSettings, [key]: validValue },
    };
  } catch {
    return {
      settings: currentSettings,
      warning: `Invalid value for ${key}, keeping current setting`,
    };
  }
}