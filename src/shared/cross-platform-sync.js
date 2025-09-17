// Simple Cross-Platform Sync for Proactivity
// Uses browser's chrome.storage.local as shared storage

class ProactivityCrossPlatformSync {
  constructor() {
    this.SHARED_TASKS_KEY = 'proactivity_shared_tasks';
    this.SYNC_META_KEY = 'proactivity_sync_meta';
  }

  // Read all tasks from shared storage
  async getAllTasks() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // Browser extension environment
        const result = await chrome.storage.local.get([this.SHARED_TASKS_KEY]);
        return result[this.SHARED_TASKS_KEY] || [];
      } else {
        // Fallback to localStorage for testing
        const stored = localStorage.getItem(this.SHARED_TASKS_KEY);
        return stored ? JSON.parse(stored) : [];
      }
    } catch (error) {
      console.error('Error reading shared tasks:', error);
      return [];
    }
  }

  // Write all tasks to shared storage
  async setAllTasks(tasks) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // Browser extension environment
        await chrome.storage.local.set({ [this.SHARED_TASKS_KEY]: tasks });
        await this.updateSyncMeta();
        return true;
      } else {
        // Fallback to localStorage for testing
        localStorage.setItem(this.SHARED_TASKS_KEY, JSON.stringify(tasks));
        await this.updateSyncMeta();
        return true;
      }
    } catch (error) {
      console.error('Error writing shared tasks:', error);
      return false;
    }
  }

  // Add a single task from any platform
  async addTask(newTask) {
    const tasks = await this.getAllTasks();
    
    // Ensure task has proper structure
    const task = {
      id: newTask.id || `${newTask.source || 'unknown'}_${Date.now()}`,
      title: newTask.title,
      description: newTask.description || '',
      completed: newTask.completed || false,
      priority: newTask.priority || 'medium',
      estimatedMinutes: newTask.estimatedMinutes || 30,
      createdAt: newTask.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: newTask.source,
      syncStatus: 'synced',
      ...newTask
    };

    // Check for duplicate
    const existingIndex = tasks.findIndex(t => t.id === task.id);
    if (existingIndex >= 0) {
      // Update existing
      tasks[existingIndex] = task;
    } else {
      // Add new
      tasks.unshift(task);
    }

    const success = await this.setAllTasks(tasks);
    if (success) {
      console.log(`Task synced: ${task.title} (from ${task.source})`);
    }
    return success;
  }

  // Sync tasks from a specific source (obsidian or extension)
  async syncFromSource(sourceTasks, sourceName) {
    const currentTasks = await this.getAllTasks();
    const merged = [];
    const conflicts = [];
    
    // Create lookup for current tasks
    const currentById = new Map(currentTasks.map(t => [t.id, t]));
    const processedIds = new Set();

    // Process source tasks
    for (const sourceTask of sourceTasks) {
      processedIds.add(sourceTask.id);
      const existing = currentById.get(sourceTask.id);
      
      if (!existing) {
        // New task
        merged.push({
          ...sourceTask,
          syncStatus: 'synced',
          syncedFrom: sourceName,
          syncedAt: new Date().toISOString()
        });
      } else {
        // Conflict resolution - latest timestamp wins
        const sourceTime = new Date(sourceTask.updatedAt || sourceTask.createdAt);
        const existingTime = new Date(existing.updatedAt || existing.createdAt);
        
        if (sourceTime >= existingTime) {
          merged.push({
            ...sourceTask,
            syncStatus: 'synced',
            syncedFrom: sourceName,
            syncedAt: new Date().toISOString()
          });
          if (sourceTime > existingTime) {
            conflicts.push({
              id: sourceTask.id,
              resolution: `${sourceName}_wins`,
              sourceTime: sourceTime.toISOString(),
              existingTime: existingTime.toISOString()
            });
          }
        } else {
          merged.push(existing);
        }
      }
    }

    // Add remaining current tasks that weren't in source
    for (const currentTask of currentTasks) {
      if (!processedIds.has(currentTask.id)) {
        merged.push(currentTask);
      }
    }

    // Sort by creation date
    merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const success = await this.setAllTasks(merged);
    
    return {
      success,
      synced: sourceTasks.length,
      conflicts: conflicts.length,
      total: merged.length,
      conflictDetails: conflicts
    };
  }

  // Get sync metadata
  async getSyncMeta() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get([this.SYNC_META_KEY]);
        return result[this.SYNC_META_KEY] || { lastSync: null, syncCount: 0 };
      } else {
        const stored = localStorage.getItem(this.SYNC_META_KEY);
        return stored ? JSON.parse(stored) : { lastSync: null, syncCount: 0 };
      }
    } catch (error) {
      return { lastSync: null, syncCount: 0 };
    }
  }

  // Update sync metadata
  async updateSyncMeta() {
    const meta = await this.getSyncMeta();
    meta.lastSync = new Date().toISOString();
    meta.syncCount = (meta.syncCount || 0) + 1;
    
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ [this.SYNC_META_KEY]: meta });
      } else {
        localStorage.setItem(this.SYNC_META_KEY, JSON.stringify(meta));
      }
    } catch (error) {
      console.error('Error updating sync metadata:', error);
    }
  }

  // Get sync status for UI display
  async getSyncStatus() {
    const tasks = await this.getAllTasks();
    const meta = await this.getSyncMeta();
    
    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.completed).length,
      obsidianTasks: tasks.filter(t => t.source === 'obsidian').length,
      extensionTasks: tasks.filter(t => t.source === 'extension').length,
      lastSync: meta.lastSync,
      syncCount: meta.syncCount
    };
  }
}

// Create global instance
const crossPlatformSync = new ProactivityCrossPlatformSync();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ProactivityCrossPlatformSync, crossPlatformSync };
} else if (typeof window !== 'undefined') {
  window.ProactivityCrossPlatformSync = ProactivityCrossPlatformSync;
  window.crossPlatformSync = crossPlatformSync;
}