// Shared Storage Service for Proactivity Cross-Platform Sync
// Uses local file system as shared storage between browser extension and Obsidian

class SharedStorageService {
  constructor(storagePath = null) {
    // Default to user's home directory for cross-platform access
    this.storagePath = storagePath || this.getDefaultStoragePath();
    this.tasksFile = `${this.storagePath}/proactivity-tasks.json`;
    this.syncFile = `${this.storagePath}/proactivity-sync.json`;
    this.lockFile = `${this.storagePath}/proactivity.lock`;
    
    // Ensure storage directory exists
    this.ensureStorageDirectory();
  }

  getDefaultStoragePath() {
    // Try to use a location both platforms can access
    const os = require('os');
    const path = require('path');
    return path.join(os.homedir(), '.proactivity');
  }

  ensureStorageDirectory() {
    const fs = require('fs');
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
    
    // Initialize files if they don't exist
    if (!fs.existsSync(this.tasksFile)) {
      this.writeTasks([]);
    }
    
    if (!fs.existsSync(this.syncFile)) {
      this.writeSyncMetadata({
        lastSync: new Date().toISOString(),
        syncCount: 0,
        conflicts: []
      });
    }
  }

  async acquireLock(timeout = 5000) {
    const fs = require('fs');
    const startTime = Date.now();
    
    while (fs.existsSync(this.lockFile)) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Could not acquire lock: timeout');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    fs.writeFileSync(this.lockFile, process.pid.toString());
  }

  releaseLock() {
    const fs = require('fs');
    if (fs.existsSync(this.lockFile)) {
      fs.unlinkSync(this.lockFile);
    }
  }

  async readTasks() {
    try {
      await this.acquireLock();
      const fs = require('fs');
      
      if (!fs.existsSync(this.tasksFile)) {
        this.releaseLock();
        return [];
      }
      
      const data = fs.readFileSync(this.tasksFile, 'utf8');
      const tasks = JSON.parse(data);
      this.releaseLock();
      return tasks;
    } catch (error) {
      this.releaseLock();
      console.error('Error reading tasks:', error);
      return [];
    }
  }

  async writeTasks(tasks) {
    try {
      await this.acquireLock();
      const fs = require('fs');
      fs.writeFileSync(this.tasksFile, JSON.stringify(tasks, null, 2));
      this.releaseLock();
      return true;
    } catch (error) {
      this.releaseLock();
      console.error('Error writing tasks:', error);
      return false;
    }
  }

  async addTask(task) {
    const tasks = await this.readTasks();
    
    // Ensure task has required fields
    const newTask = {
      id: task.id || Date.now().toString(),
      title: task.title,
      description: task.description || '',
      completed: task.completed || false,
      priority: task.priority || 'medium',
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: task.source || 'unknown',
      syncStatus: 'synced',
      ...task
    };
    
    // Check for existing task with same ID
    const existingIndex = tasks.findIndex(t => t.id === newTask.id);
    if (existingIndex >= 0) {
      tasks[existingIndex] = newTask;
    } else {
      tasks.unshift(newTask);
    }
    
    const success = await this.writeTasks(tasks);
    if (success) {
      await this.updateSyncMetadata();
    }
    return success;
  }

  async updateTask(taskId, updates) {
    const tasks = await this.readTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex < 0) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    const success = await this.writeTasks(tasks);
    if (success) {
      await this.updateSyncMetadata();
    }
    return success;
  }

  async deleteTask(taskId) {
    const tasks = await this.readTasks();
    const filteredTasks = tasks.filter(t => t.id !== taskId);
    
    if (filteredTasks.length === tasks.length) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    const success = await this.writeTasks(filteredTasks);
    if (success) {
      await this.updateSyncMetadata();
    }
    return success;
  }

  async getSyncMetadata() {
    try {
      const fs = require('fs');
      if (!fs.existsSync(this.syncFile)) {
        return { lastSync: null, syncCount: 0, conflicts: [] };
      }
      
      const data = fs.readFileSync(this.syncFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading sync metadata:', error);
      return { lastSync: null, syncCount: 0, conflicts: [] };
    }
  }

  async writeSyncMetadata(metadata) {
    try {
      const fs = require('fs');
      fs.writeFileSync(this.syncFile, JSON.stringify(metadata, null, 2));
      return true;
    } catch (error) {
      console.error('Error writing sync metadata:', error);
      return false;
    }
  }

  async updateSyncMetadata() {
    const metadata = await this.getSyncMetadata();
    metadata.lastSync = new Date().toISOString();
    metadata.syncCount = (metadata.syncCount || 0) + 1;
    return this.writeSyncMetadata(metadata);
  }

  async syncFromSource(sourceTasks, sourceName) {
    const currentTasks = await this.readTasks();
    const conflicts = [];
    const merged = [];
    const sourceTaskIds = new Set(sourceTasks.map(t => t.id));
    
    // Process source tasks
    for (const sourceTask of sourceTasks) {
      const existingTask = currentTasks.find(t => t.id === sourceTask.id);
      
      if (!existingTask) {
        // New task from source
        merged.push({
          ...sourceTask,
          syncStatus: 'synced',
          syncedFrom: sourceName
        });
      } else {
        // Conflict resolution - latest timestamp wins
        const sourceTime = new Date(sourceTask.updatedAt || sourceTask.createdAt);
        const existingTime = new Date(existingTask.updatedAt || existingTask.createdAt);
        
        if (sourceTime > existingTime) {
          merged.push({
            ...sourceTask,
            syncStatus: 'synced',
            syncedFrom: sourceName
          });
          conflicts.push({
            taskId: sourceTask.id,
            resolution: 'source_wins',
            conflictTime: new Date().toISOString(),
            sourceTask,
            existingTask
          });
        } else {
          merged.push(existingTask);
        }
      }
    }
    
    // Add remaining current tasks that aren't from source
    for (const currentTask of currentTasks) {
      if (!sourceTaskIds.has(currentTask.id)) {
        merged.push(currentTask);
      }
    }
    
    // Sort by created date (newest first)
    merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const success = await this.writeTasks(merged);
    
    if (conflicts.length > 0) {
      const metadata = await this.getSyncMetadata();
      metadata.conflicts = metadata.conflicts || [];
      metadata.conflicts.push(...conflicts);
      metadata.lastSync = new Date().toISOString();
      metadata.syncCount = (metadata.syncCount || 0) + 1;
      await this.writeSyncMetadata(metadata);
    } else {
      await this.updateSyncMetadata();
    }
    
    return {
      success,
      synced: sourceTasks.length,
      conflicts: conflicts.length,
      total: merged.length
    };
  }

  async getStorageStats() {
    const tasks = await this.readTasks();
    const metadata = await this.getSyncMetadata();
    
    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.completed).length,
      lastSync: metadata.lastSync,
      syncCount: metadata.syncCount || 0,
      conflicts: metadata.conflicts ? metadata.conflicts.length : 0,
      storageLocation: this.storagePath
    };
  }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SharedStorageService;
} else {
  window.SharedStorageService = SharedStorageService;
}