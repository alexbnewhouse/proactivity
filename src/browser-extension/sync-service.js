/**
 * Comprehensive Sync Service for Browser Extension
 * Handles bidirectional sync between extension, Obsidian plugin, and backend
 */

class ProactivitySyncService {
  constructor() {
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    this.lastSyncTime = null;
    this.syncInterval = null;
    this.conflictResolver = new ConflictResolver();
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Initialize the sync service
   */
  async init() {
    const settings = await chrome.storage.local.get(['syncSettings', 'lastSyncTime']);
    this.lastSyncTime = settings.lastSyncTime || 0;
    
    const syncSettings = settings.syncSettings || {
      enableRealTimeSync: true,
      syncIntervalMinutes: 5,
      conflictResolution: 'manual',
      obsidianEndpoint: 'http://localhost:27123/api/sync',
      backendEndpoint: 'http://localhost:3001/api'
    };
    
    // Start periodic sync
    if (syncSettings.enableRealTimeSync) {
      this.startPeriodicSync(syncSettings.syncIntervalMinutes * 60000);
    }
    
    console.log('Sync service initialized', { lastSyncTime: this.lastSyncTime, isOnline: this.isOnline });
  }

  /**
   * Start periodic synchronization
   */
  startPeriodicSync(intervalMs) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(async () => {
      if (this.isOnline) {
        await this.performFullSync();
      }
    }, intervalMs);
  }

  /**
   * Stop periodic synchronization
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Perform full bidirectional sync
   */
  async performFullSync() {
    try {
      console.log('Starting full sync...');
      
      // Get local data
      const localData = await this.getLocalData();
      
      // Sync with Obsidian plugin
      const obsidianSyncResult = await this.syncWithObsidian(localData);
      
      // Sync with backend
      const backendSyncResult = await this.syncWithBackend(localData);
      
      // Resolve conflicts and merge data
      const mergedData = await this.resolveConflictsAndMerge(
        localData,
        obsidianSyncResult,
        backendSyncResult
      );
      
      // Update local storage
      await this.updateLocalData(mergedData);
      
      // Update sync timestamp
      this.lastSyncTime = Date.now();
      await chrome.storage.local.set({ lastSyncTime: this.lastSyncTime });
      
      // Notify dashboard of sync completion
      chrome.runtime.sendMessage({
        action: 'syncComplete',
        timestamp: this.lastSyncTime,
        conflicts: mergedData.conflicts || []
      });
      
      console.log('Full sync completed successfully');
      return { success: true, timestamp: this.lastSyncTime };
      
    } catch (error) {
      console.error('Full sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all local data for syncing
   */
  async getLocalData() {
    const data = await chrome.storage.local.get([
      'tasks',
      'currentEnergyLevel',
      'dailyStats',
      'streakData',
      'focusSessions',
      'enforcementSettings',
      'adhdPatterns'
    ]);

    return {
      tasks: data.tasks || [],
      currentEnergyLevel: data.currentEnergyLevel || 3,
      dailyStats: data.dailyStats || {},
      streakData: data.streakData || {},
      focusSessions: data.focusSessions || [],
      enforcementSettings: data.enforcementSettings || {},
      adhdPatterns: data.adhdPatterns || [],
      timestamp: Date.now()
    };
  }

  /**
   * Sync with Obsidian plugin via local API
   */
  async syncWithObsidian(localData) {
    try {
      const settings = await chrome.storage.local.get(['syncSettings']);
      const endpoint = settings.syncSettings?.obsidianEndpoint || 'http://localhost:27123/api/sync';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'bidirectional_sync',
          data: localData,
          timestamp: this.lastSyncTime
        })
      });

      if (!response.ok) {
        throw new Error(`Obsidian sync failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Obsidian sync result:', result);
      
      return {
        source: 'obsidian',
        data: result.data || {},
        conflicts: result.conflicts || [],
        timestamp: result.timestamp || Date.now()
      };
      
    } catch (error) {
      console.error('Obsidian sync error:', error);
      return {
        source: 'obsidian',
        data: {},
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Sync with backend service
   */
  async syncWithBackend(localData) {
    try {
      const settings = await chrome.storage.local.get(['syncSettings']);
      const endpoint = settings.syncSettings?.backendEndpoint || 'http://localhost:3001/api';
      
      const response = await fetch(`${endpoint}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: localData,
          lastSyncTime: this.lastSyncTime
        })
      });

      if (!response.ok) {
        throw new Error(`Backend sync failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Backend sync result:', result);
      
      return {
        source: 'backend',
        data: result.data || {},
        conflicts: result.conflicts || [],
        timestamp: result.timestamp || Date.now()
      };
      
    } catch (error) {
      console.error('Backend sync error:', error);
      return {
        source: 'backend',
        data: {},
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Resolve conflicts and merge data from all sources
   */
  async resolveConflictsAndMerge(localData, obsidianResult, backendResult) {
    const conflicts = [];
    const mergedData = { ...localData };
    
    // Merge tasks with conflict resolution
    const allTasks = [
      ...localData.tasks,
      ...(obsidianResult.data.tasks || []),
      ...(backendResult.data.tasks || [])
    ];
    
    const taskMap = new Map();
    const taskConflicts = [];
    
    // Process tasks and detect conflicts
    allTasks.forEach(task => {
      if (taskMap.has(task.id)) {
        const existing = taskMap.get(task.id);
        const conflict = this.conflictResolver.detectTaskConflict(existing, task);
        
        if (conflict) {
          taskConflicts.push(conflict);
          // Use latest timestamp as default resolution
          if (task.updatedAt > existing.updatedAt) {
            taskMap.set(task.id, task);
          }
        }
      } else {
        taskMap.set(task.id, task);
      }
    });
    
    mergedData.tasks = Array.from(taskMap.values());
    
    // Merge energy level (use most recent)
    const energyUpdates = [
      { value: localData.currentEnergyLevel, source: 'local', timestamp: localData.timestamp },
      { value: obsidianResult.data.currentEnergyLevel, source: 'obsidian', timestamp: obsidianResult.timestamp },
      { value: backendResult.data.currentEnergyLevel, source: 'backend', timestamp: backendResult.timestamp }
    ].filter(e => e.value !== undefined).sort((a, b) => b.timestamp - a.timestamp);
    
    if (energyUpdates.length > 0) {
      mergedData.currentEnergyLevel = energyUpdates[0].value;
    }
    
    // Merge other data structures
    mergedData.focusSessions = this.mergeFocusSessions([
      ...(localData.focusSessions || []),
      ...(obsidianResult.data.focusSessions || []),
      ...(backendResult.data.focusSessions || [])
    ]);
    
    // Store conflicts for user resolution
    mergedData.conflicts = [...taskConflicts, ...conflicts];
    
    return mergedData;
  }

  /**
   * Merge focus sessions, removing duplicates
   */
  mergeFocusSessions(sessions) {
    const sessionMap = new Map();
    
    sessions.forEach(session => {
      const key = `${session.startTime}-${session.duration}`;
      if (!sessionMap.has(key) || session.updatedAt > sessionMap.get(key).updatedAt) {
        sessionMap.set(key, session);
      }
    });
    
    return Array.from(sessionMap.values());
  }

  /**
   * Update local storage with merged data
   */
  async updateLocalData(mergedData) {
    await chrome.storage.local.set({
      tasks: mergedData.tasks,
      currentEnergyLevel: mergedData.currentEnergyLevel,
      dailyStats: mergedData.dailyStats,
      streakData: mergedData.streakData,
      focusSessions: mergedData.focusSessions,
      enforcementSettings: mergedData.enforcementSettings,
      adhdPatterns: mergedData.adhdPatterns
    });
    
    // Store conflicts separately for user resolution
    if (mergedData.conflicts?.length > 0) {
      await chrome.storage.local.set({ syncConflicts: mergedData.conflicts });
    }
  }

  /**
   * Add item to sync queue for offline processing
   */
  queueForSync(item) {
    this.syncQueue.push({
      ...item,
      timestamp: Date.now(),
      id: Math.random().toString(36).substring(7)
    });
    
    // Try to process immediately if online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  /**
   * Process queued sync items
   */
  async processSyncQueue() {
    if (this.syncQueue.length === 0) return;
    
    console.log(`Processing ${this.syncQueue.length} queued sync items`);
    
    const processedItems = [];
    
    for (const item of this.syncQueue) {
      try {
        await this.syncSingleItem(item);
        processedItems.push(item);
      } catch (error) {
        console.error('Failed to sync queued item:', error);
        // Keep item in queue for retry
      }
    }
    
    // Remove successfully processed items
    this.syncQueue = this.syncQueue.filter(item => 
      !processedItems.some(processed => processed.id === item.id)
    );
  }

  /**
   * Sync a single item
   */
  async syncSingleItem(item) {
    switch (item.type) {
      case 'task_update':
        return await this.syncTaskUpdate(item.data);
      case 'energy_update':
        return await this.syncEnergyUpdate(item.data);
      case 'focus_session':
        return await this.syncFocusSession(item.data);
      default:
        console.warn('Unknown sync item type:', item.type);
    }
  }

  /**
   * Sync a task update
   */
  async syncTaskUpdate(taskData) {
    const localData = await this.getLocalData();
    const updatedData = { ...localData, tasks: [taskData] };
    
    // Send to Obsidian
    await this.syncWithObsidian(updatedData);
    
    // Send to Backend
    await this.syncWithBackend(updatedData);
  }

  /**
   * Sync energy level update
   */
  async syncEnergyUpdate(energyData) {
    const localData = await this.getLocalData();
    const updatedData = { ...localData, currentEnergyLevel: energyData.level };
    
    await this.syncWithObsidian(updatedData);
    await this.syncWithBackend(updatedData);
  }

  /**
   * Sync focus session
   */
  async syncFocusSession(sessionData) {
    const localData = await this.getLocalData();
    localData.focusSessions = localData.focusSessions || [];
    localData.focusSessions.push(sessionData);
    
    await this.syncWithObsidian(localData);
    await this.syncWithBackend(localData);
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    const conflicts = await chrome.storage.local.get(['syncConflicts']);
    
    return {
      isOnline: this.isOnline,
      lastSyncTime: this.lastSyncTime,
      queueLength: this.syncQueue.length,
      conflictsCount: (conflicts.syncConflicts || []).length,
      syncEnabled: this.syncInterval !== null
    };
  }

  /**
   * Manual conflict resolution
   */
  async resolveConflict(conflictId, resolution) {
    const { syncConflicts } = await chrome.storage.local.get(['syncConflicts']);
    const conflicts = syncConflicts || [];
    
    const conflictIndex = conflicts.findIndex(c => c.id === conflictId);
    if (conflictIndex === -1) return;
    
    const conflict = conflicts[conflictIndex];
    
    // Apply resolution
    switch (resolution.action) {
      case 'use_local':
        await this.applyResolution(conflict.local);
        break;
      case 'use_remote':
        await this.applyResolution(conflict.remote);
        break;
      case 'merge':
        await this.applyResolution(resolution.merged);
        break;
    }
    
    // Remove resolved conflict
    conflicts.splice(conflictIndex, 1);
    await chrome.storage.local.set({ syncConflicts: conflicts });
    
    // Trigger sync to propagate resolution
    this.queueForSync({
      type: 'conflict_resolution',
      data: resolution
    });
  }

  /**
   * Apply conflict resolution
   */
  async applyResolution(data) {
    if (data.type === 'task') {
      const { tasks } = await chrome.storage.local.get(['tasks']);
      const updatedTasks = tasks || [];
      const taskIndex = updatedTasks.findIndex(t => t.id === data.id);
      
      if (taskIndex >= 0) {
        updatedTasks[taskIndex] = data;
      } else {
        updatedTasks.push(data);
      }
      
      await chrome.storage.local.set({ tasks: updatedTasks });
    }
  }
}

/**
 * Conflict Resolution Helper
 */
class ConflictResolver {
  detectTaskConflict(task1, task2) {
    if (task1.id !== task2.id) return null;
    
    const conflicts = [];
    
    // Check for field conflicts
    const fields = ['title', 'status', 'priority', 'startTime', 'endTime', 'completed'];
    fields.forEach(field => {
      if (task1[field] !== task2[field]) {
        conflicts.push({
          field,
          local: task1[field],
          remote: task2[field]
        });
      }
    });
    
    if (conflicts.length === 0) return null;
    
    return {
      id: `conflict_${task1.id}_${Date.now()}`,
      type: 'task_conflict',
      taskId: task1.id,
      conflicts,
      local: task1,
      remote: task2,
      timestamp: Date.now()
    };
  }
}

// Export for use in background script and dashboard
window.ProactivitySyncService = ProactivitySyncService;