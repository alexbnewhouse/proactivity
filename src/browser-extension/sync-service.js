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
      
      // Push local task changes to backend then pull latest
      const backendPushResult = await this.pushTasks(localData.tasks);
      const backendPullResult = await this.pullTasks();
      
      // Resolve conflicts and merge data
      const mergedData = await this.resolveConflictsAndMerge(
        localData,
        obsidianSyncResult,
        backendPullResult
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
    console.warn('syncWithBackend deprecated - use pushTasks/pullTasks');
    return { source: 'backend', data: {}, timestamp: Date.now() };
  }

  /**
   * Push tasks to backend /api/sync/push
   */
  async pushTasks(tasks) {
    try {
      if (!tasks || tasks.length === 0) return { source: 'backend', data: {}, timestamp: Date.now() };
      
      // Filter to only push tasks that need syncing (optimization)
      const tasksNeedingSync = tasks.filter(t => {
        if (!t.lastPushTime) return true; // Never pushed
        const taskUpdated = new Date(t.updatedAt || t.createdAt);
        const lastPush = new Date(t.lastPushTime);
        return taskUpdated > lastPush; // Task changed since last push
      });
      
      if (tasksNeedingSync.length === 0) {
        console.log('No tasks need pushing - all up to date');
        return { source: 'backend', data: {}, timestamp: Date.now() };
      }
      
      const settings = await chrome.storage.local.get(['syncSettings']);
      const endpoint = settings.syncSettings?.backendEndpoint || 'http://localhost:3001/api';
      
      // Normalize tasks for backend (status & id)
      const normalized = tasksNeedingSync.map(t => ({
        id: this.ensureNumericId(t.id),
        title: t.title,
        description: t.description || '',
        priority: t.priority || 'medium',
        completed: this.isTaskCompleted(t),
        estimatedMinutes: t.estimatedMinutes || 30,
        actualMinutes: t.actualMinutes || 0,
        createdAt: t.createdAt || new Date().toISOString(),
        updatedAt: t.updatedAt || t.createdAt || new Date().toISOString()
      }));
      
      const response = await fetch(`${endpoint}/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'extension', tasks: normalized, timestamp: Date.now() })
      });
      
      if (!response.ok) throw new Error(`Push failed: ${response.status} ${response.statusText}`);
      
      const result = await response.json();
      console.log('Backend push result:', result);
      
      // Mark tasks as pushed
      const now = new Date().toISOString();
      await this.updateTasksPushTime(tasksNeedingSync.map(t => t.id), now);
      
      return { source: 'backend', data: result.data || {}, timestamp: Date.now() };
    } catch (e) {
      console.error('pushTasks error', e);
      return { source: 'backend', data: {}, error: e.message, timestamp: Date.now() };
    }
  }

  /**
   * Pull tasks from backend /api/sync/pull
   */
  async pullTasks() {
    try {
      const settings = await chrome.storage.local.get(['syncSettings', 'lastBackendPull']);
      const endpoint = settings.syncSettings?.backendEndpoint || 'http://localhost:3001/api';
      const since = settings.lastBackendPull || null;
      const url = new URL(`${endpoint}/sync/pull`);
      url.searchParams.set('source', 'extension');
      if (since) url.searchParams.set('since', since);
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error(`Pull failed: ${response.status} ${response.statusText}`);
      const result = await response.json();
      const tasks = (result.data || []).map(t => this.mapBackendTaskToLocal(t));
      await chrome.storage.local.set({ lastBackendPull: new Date().toISOString() });
      return { source: 'backend', data: { tasks }, timestamp: Date.now() };
    } catch (e) {
      console.error('pullTasks error', e);
      return { source: 'backend', data: {}, error: e.message, timestamp: Date.now() };
    }
  }

  /** Ensure task id is numeric for backend */
  ensureNumericId(id) {
    if (typeof id === 'number') return id;
    if (/^\d+$/.test(id)) {
      // fits in safe integer range? fallback to hash if too long
      const asNum = Number(id);
      if (asNum <= Number.MAX_SAFE_INTEGER) return asNum;
    }
    // derive deterministic numeric hash
    let hash = 0;
    const s = String(id);
    for (let i = 0; i < s.length; i++) {
      hash = (hash * 31 + s.charCodeAt(i)) >>> 0; // unsigned 32-bit
    }
    return hash;
  }

  isTaskCompleted(task) {
    if (typeof task.completed === 'boolean') return task.completed;
    if (task.status) return ['done', 'completed', 'complete'].includes(task.status.toLowerCase());
    return false;
  }

  mapBackendTaskToLocal(task) {
    return {
      id: String(task.id),
      title: task.title,
      description: task.description,
      priority: task.priority || 'medium',
      status: task.completed ? 'done' : 'todo',
      completed: task.completed,
      estimatedMinutes: task.estimatedMinutes,
      actualMinutes: task.actualMinutes,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      source: task.source || 'backend',
      syncStatus: task.syncStatus || 'synced'
    };
  }

  /**
   * Update lastPushTime for tasks to optimize future syncs
   */
  async updateTasksPushTime(taskIds, timestamp) {
    try {
      const { tasks } = await chrome.storage.local.get(['tasks']);
      const updatedTasks = (tasks || []).map(task => {
        if (taskIds.includes(task.id)) {
          return { ...task, lastPushTime: timestamp };
        }
        return task;
      });
      await chrome.storage.local.set({ tasks: updatedTasks });
    } catch (error) {
      console.error('Error updating task push times:', error);
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
    // Accept either single task or array
    const tasks = Array.isArray(taskData) ? taskData : [taskData];
    await this.pushTasks(tasks);
    // After push, pull to reconcile latest server state (lightweight)
    await this.pullTasks();
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