import { Notice } from 'obsidian';
import { ProactivitySettings } from './main';
import { ProactivityApiClient } from './api-client';

/**
 * Handles bidirectional sync between Obsidian plugin and browser extension
 * Ensures data consistency across all Proactivity platforms
 */
export class ObsidianSyncService {
  private settings: ProactivitySettings;
  private apiClient: ProactivityApiClient;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTimestamp: number = 0;
  private syncQueue: any[] = [];
  private isOnline: boolean = true;

  constructor(settings: ProactivitySettings) {
    this.settings = settings;
    this.apiClient = new ProactivityApiClient(settings);
    this.setupPeriodicSync();
    this.setupOnlineStatusMonitoring();
  }

  updateSettings(settings: ProactivitySettings) {
    this.settings = settings;
    this.apiClient.updateSettings(settings);
    this.restartPeriodicSync();
  }

  /**
   * Perform full bidirectional sync
   */
  async performFullSync(): Promise<{ success: boolean; syncedItems: number; conflicts: any[] }> {
    if (!this.settings.browserExtensionSync.enableSync) {
      return { success: false, syncedItems: 0, conflicts: [] };
    }

    try {
      const syncResult = {
        success: true,
        syncedItems: 0,
        conflicts: []
      };

      // 1. Push local changes to backend
      if (this.syncQueue.length > 0) {
        const pushResult = await this.pushLocalChanges();
        syncResult.syncedItems += pushResult.synced;
        syncResult.conflicts.push(...pushResult.conflicts);
      }

      // 2. Pull remote changes from backend
      const pullResult = await this.pullRemoteChanges();
      syncResult.syncedItems += pullResult.synced;
      syncResult.conflicts.push(...pullResult.conflicts);

      // 3. Sync with browser extension directly if available
      if (this.settings.browserExtensionSync.syncTasks) {
        const extensionSyncResult = await this.syncWithBrowserExtension();
        syncResult.syncedItems += extensionSyncResult.synced;
        syncResult.conflicts.push(...extensionSyncResult.conflicts);
      }

      this.lastSyncTimestamp = Date.now();
      this.settings.browserExtensionSync.lastSyncTimestamp = this.lastSyncTimestamp;

      if (syncResult.conflicts.length > 0) {
        new Notice(`Sync completed with ${syncResult.conflicts.length} conflicts to resolve`);
      } else {
        console.log(`Sync completed: ${syncResult.syncedItems} items synced`);
      }

      return syncResult;
    } catch (error) {
      console.error('Sync failed:', error);
      new Notice('Sync failed - will retry automatically');
      return { success: false, syncedItems: 0, conflicts: [] };
    }
  }

  /**
   * Add item to sync queue for next sync
   */
  queueForSync(item: { type: string; action: 'create' | 'update' | 'delete'; data: any; timestamp: number }) {
    this.syncQueue.push({
      ...item,
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      retries: 0
    });

    // Trigger immediate sync if queue gets large or for critical items
    if (this.syncQueue.length >= 10 || item.type === 'task' && item.action === 'create') {
      this.performFullSync();
    }
  }

  /**
   * Push local changes to backend server
   */
  private async pushLocalChanges(): Promise<{ synced: number; conflicts: any[] }> {
    const result = { synced: 0, conflicts: [] };
    const itemsToSync = [...this.syncQueue];
    
    for (const item of itemsToSync) {
      try {
        const endpoint = this.getEndpointForItem(item);
        const method = item.action === 'delete' ? 'DELETE' : 'POST';
        const response = await fetch(`${this.settings.serverUrl}${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.settings.apiKey || ''
          },
          body: JSON.stringify({
            ...item.data,
            source: 'obsidian-plugin',
            timestamp: item.timestamp
          })
        });

        if (response.ok) {
          // Remove from queue on successful sync
          this.syncQueue = this.syncQueue.filter(queuedItem => queuedItem.id !== item.id);
          result.synced++;
        } else if (response.status === 409) {
          // Conflict - needs manual resolution
          const conflictData = await response.json();
          result.conflicts.push({
            type: 'push_conflict',
            item,
            serverData: conflictData,
            resolution: 'manual'
          });
        }
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        item.retries++;
        
        // Remove items that have failed too many times
        if (item.retries >= 3) {
          this.syncQueue = this.syncQueue.filter(queuedItem => queuedItem.id !== item.id);
          console.warn(`Dropped item after 3 failed sync attempts:`, item);
        }
      }
    }

    return result;
  }

  /**
   * Pull remote changes from backend server
   */
  private async pullRemoteChanges(): Promise<{ synced: number; conflicts: any[] }> {
    const result = { synced: 0, conflicts: [] };

    try {
      // Get changes since last sync
      const response = await fetch(`${this.settings.serverUrl}/api/sync/changes?since=${this.lastSyncTimestamp}&source=exclude-obsidian`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.settings.apiKey || ''
        }
      });

      if (!response.ok) return result;

      const { changes } = await response.json();

      for (const change of changes) {
        try {
          const applied = await this.applyRemoteChange(change);
          if (applied.success) {
            result.synced++;
          } else if (applied.conflict) {
            result.conflicts.push(applied.conflict);
          }
        } catch (error) {
          console.error('Failed to apply remote change:', error);
        }
      }
    } catch (error) {
      console.error('Failed to pull remote changes:', error);
    }

    return result;
  }

  /**
   * Sync directly with browser extension using shared backend
   */
  private async syncWithBrowserExtension(): Promise<{ synced: number; conflicts: any[] }> {
    const result = { synced: 0, conflicts: [] };

    try {
      // Check if browser extension has recent activity
      const response = await fetch(`${this.settings.serverUrl}/api/sync/extension-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.settings.apiKey || ''
        }
      });

      if (!response.ok) return result;

      const { lastActivity, hasChanges } = await response.json();

      if (hasChanges && lastActivity > this.lastSyncTimestamp) {
        // Get extension-specific changes
        const changesResponse = await fetch(`${this.settings.serverUrl}/api/sync/extension-changes?since=${this.lastSyncTimestamp}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.settings.apiKey || ''
          }
        });

        if (changesResponse.ok) {
          const { changes } = await changesResponse.json();
          
          for (const change of changes) {
            const applied = await this.applyRemoteChange(change);
            if (applied.success) {
              result.synced++;
            } else if (applied.conflict) {
              result.conflicts.push(applied.conflict);
            }
          }
        }
      }
    } catch (error) {
      console.error('Browser extension sync failed:', error);
    }

    return result;
  }

  /**
   * Apply a remote change to local Obsidian data
   */
  private async applyRemoteChange(change: any): Promise<{ success: boolean; conflict?: any }> {
    try {
      switch (change.type) {
        case 'task':
          return await this.applyTaskChange(change);
        case 'energy_level':
          return await this.applyEnergyLevelChange(change);
        case 'focus_session':
          return await this.applyFocusSessionChange(change);
        case 'enforcement_settings':
          return await this.applyEnforcementSettingsChange(change);
        default:
          console.warn('Unknown change type:', change.type);
          return { success: false };
      }
    } catch (error) {
      console.error('Error applying remote change:', error);
      return { success: false };
    }
  }

  /**
   * Apply task changes to Obsidian vault
   */
  private async applyTaskChange(change: any): Promise<{ success: boolean; conflict?: any }> {
    // TODO: Integrate with ObsidianIntegrationService to modify tasks in daily notes
    // For now, just log the change
    console.log('Applying task change:', change);
    
    // Check for conflicts with local tasks
    const existingTask = await this.findLocalTask(change.data.id);
    if (existingTask && existingTask.timestamp > change.timestamp) {
      return {
        success: false,
        conflict: {
          type: 'task_conflict',
          local: existingTask,
          remote: change.data,
          resolution: 'latest_wins'
        }
      };
    }

    // Apply the change (in a real implementation, this would modify the vault)
    return { success: true };
  }

  /**
   * Apply energy level changes
   */
  private async applyEnergyLevelChange(change: any): Promise<{ success: boolean; conflict?: any }> {
    // Update energy level in daily note if it's more recent
    console.log('Applying energy level change:', change);
    return { success: true };
  }

  /**
   * Apply focus session changes
   */
  private async applyFocusSessionChange(change: any): Promise<{ success: boolean; conflict?: any }> {
    // Log focus session data
    console.log('Applying focus session change:', change);
    return { success: true };
  }

  /**
   * Apply enforcement settings changes
   */
  private async applyEnforcementSettingsChange(change: any): Promise<{ success: boolean; conflict?: any }> {
    // Sync enforcement settings if enabled
    if (this.settings.browserExtensionSync.syncEnforcementSettings) {
      console.log('Applying enforcement settings change:', change);
      return { success: true };
    }
    return { success: false };
  }

  /**
   * Find local task by ID
   */
  private async findLocalTask(taskId: string): Promise<any | null> {
    // TODO: Implement actual task lookup in vault
    // This would search through daily notes for the task
    return null;
  }

  /**
   * Get appropriate API endpoint for sync item
   */
  private getEndpointForItem(item: any): string {
    switch (item.type) {
      case 'task':
        return item.action === 'delete' ? `/api/tasks/${item.data.id}` : '/api/tasks';
      case 'energy_level':
        return '/api/user/energy-level';
      case 'focus_session':
        return '/api/focus/sessions';
      case 'enforcement_settings':
        return '/api/user/enforcement-settings';
      default:
        return '/api/sync/generic';
    }
  }

  /**
   * Setup periodic background sync
   */
  private setupPeriodicSync() {
    if (!this.settings.browserExtensionSync.enableSync) return;

    const intervalMs = this.settings.browserExtensionSync.syncInterval * 60 * 1000;
    
    this.syncInterval = setInterval(async () => {
      if (this.isOnline && this.syncQueue.length > 0) {
        await this.performFullSync();
      }
    }, intervalMs);
  }

  /**
   * Restart periodic sync with new settings
   */
  private restartPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.setupPeriodicSync();
  }

  /**
   * Monitor online status for sync scheduling
   */
  private setupOnlineStatusMonitoring() {
    // Basic online check - in a real implementation this would be more sophisticated
    setInterval(() => {
      this.checkOnlineStatus();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check if we're online and can sync
   */
  private async checkOnlineStatus() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.settings.serverUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      this.isOnline = response.ok;
    } catch {
      this.isOnline = false;
    }
  }

  /**
   * Manual sync trigger for user-initiated syncs
   */
  async triggerManualSync(): Promise<void> {
    new Notice('Starting manual sync...');
    const result = await this.performFullSync();
    
    if (result.success) {
      new Notice(`Sync completed: ${result.syncedItems} items synced`);
    } else {
      new Notice('Sync failed - check your connection');
    }
  }

  /**
   * Get sync status for UI display
   */
  getSyncStatus(): {
    isOnline: boolean;
    lastSync: number;
    queuedItems: number;
    syncEnabled: boolean;
  } {
    return {
      isOnline: this.isOnline,
      lastSync: this.lastSyncTimestamp,
      queuedItems: this.syncQueue.length,
      syncEnabled: this.settings.browserExtensionSync.enableSync
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}