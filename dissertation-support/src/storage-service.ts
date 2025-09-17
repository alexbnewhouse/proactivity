/**
 * ADHD-Friendly Storage Service
 * 
 * Philosophy:
 * - Graceful error handling - never crash the plugin
 * - Automatic retries with exponential backoff
 * - Clear logging for debugging without noise
 * - Fast, predictable API
 */

import { Plugin } from 'obsidian';
import { validateSettings, Settings, DEFAULT_SETTINGS } from './settings-schema';

export class StorageService {
  private plugin: Plugin;
  private saveTimeout: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private maxRetries = 3;

  constructor(plugin: Plugin) {
    this.plugin = plugin;
  }

  /**
   * Load settings with graceful degradation
   * Never throws - always returns valid settings
   */
  async loadSettings(): Promise<Settings> {
    try {
      const rawData = await this.plugin.loadData();
      const { settings, warnings } = validateSettings(rawData);
      
      // Log warnings in debug mode only - reduce noise
      if (warnings.length > 0 && this.shouldLog()) {
        console.log('[DissertationSupport] Settings warnings:', warnings);
      }
      
      return settings;
    } catch (error) {
      console.error('[DissertationSupport] Error loading settings, using defaults:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save settings with retry logic and debouncing
   * ADHD-friendly: Batch rapid saves to reduce anxiety
   */
  async saveSettings(settings: Settings): Promise<void> {
    // Clear any pending save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Debounce rapid saves (common in ADHD workflows)
    this.saveTimeout = setTimeout(async () => {
      await this.performSave(settings);
    }, 150); // Short delay to batch rapid changes
  }

  /**
   * Immediate save (bypass debouncing)
   * Use for critical data like context saves
   */
  async forceSave(settings: Settings): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    await this.performSave(settings);
  }

  /**
   * Update a single setting safely
   */
  async updateSetting<K extends keyof Settings>(
    currentSettings: Settings,
    key: K,
    value: Settings[K]
  ): Promise<{ settings: Settings; warning?: string }> {
    const { settings, warning } = this.validateSettingUpdate(currentSettings, key, value);
    
    // Save the updated settings
    await this.saveSettings(settings);
    
    return { settings, warning };
  }

  /**
   * Validate a setting update without saving
   */
  private validateSettingUpdate<K extends keyof Settings>(
    currentSettings: Settings,
    key: K,
    value: unknown
  ): { settings: Settings; warning?: string } {
    const testSettings = {
      ...currentSettings,
      [key]: value,
    };
    
    const { settings, warnings } = validateSettings(testSettings);
    
    // If any warnings, it means validation failed for this setting
    if (warnings.length > 0) {
      return {
        settings: currentSettings,
        warning: `Invalid value for ${key}, keeping current setting`,
      };
    }
    
    return { settings };
  }

  /**
   * Internal save with retry logic
   */
  private async performSave(settings: Settings): Promise<void> {
    try {
      await this.plugin.saveData(settings);
      this.retryCount = 0; // Reset on success
      
      if (this.shouldLog()) {
        console.log('[DissertationSupport] Settings saved successfully');
      }
    } catch (error) {
      console.error('[DissertationSupport] Error saving settings:', error);
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
        
        console.log(`[DissertationSupport] Retrying save in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
        
        setTimeout(() => {
          this.performSave(settings);
        }, delay);
      } else {
        console.error('[DissertationSupport] Failed to save settings after all retries');
        this.retryCount = 0; // Reset for next attempt
      }
    }
  }

  /**
   * Check if we should log (avoid noise)
   */
  private shouldLog(): boolean {
    // Could check debug settings, but for now keep it simple
    return false;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }
}