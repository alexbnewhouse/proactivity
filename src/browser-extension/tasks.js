// Tasks Dashboard Script for Browser Extension
class TasksDashboard {
  constructor() {
    this.tasks = [];
    this.currentEnergyLevel = 'moderate';
    this.stats = {
      pending: 0,
      completed: 0,
      focusTime: 0
    };

    this.init();
  }

  async init() {
    console.log('TasksDashboard initializing...');
    await this.loadData();
    this.setupEventListeners();
    this.updateUI();
    this.startPeriodicSync();
    console.log('TasksDashboard initialized successfully');
  }

  async loadData() {
    try {
      // Load tasks from storage
      const data = await chrome.storage.local.get([
        'tasks', 
        'currentEnergyLevel', 
        'dailyStats',
        'currentSession'
      ]);

      this.tasks = data.tasks || [];
      this.currentEnergyLevel = data.currentEnergyLevel || 'moderate';
      
      // If no tasks exist, add a welcome task for first-time users
      if (this.tasks.length === 0) {
        this.tasks = [{
          id: 'welcome-task',
          title: 'Welcome to Proactivity! Try adding your first task below.',
          completed: false,
          createdAt: new Date().toISOString(),
          energyLevel: 'moderate',
          estimatedMinutes: 15
        }];
      }
      
      // Load daily stats
      const today = new Date().toDateString();
      const dailyStats = data.dailyStats || {};
      this.stats = dailyStats[today] || { pending: 0, completed: 0, focusTime: 0 };
      
      // Add focus time from current session
      if (data.currentSession && data.currentSession.focusTime) {
        this.stats.focusTime += data.currentSession.focusTime;
      }

      this.calculateStats();
      console.log('Loaded tasks:', this.tasks.length, 'Energy:', this.currentEnergyLevel);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  setupEventListeners() {
    // Back button
    document.getElementById('back-btn').addEventListener('click', () => {
      window.close();
    });

    // Energy level buttons
    document.querySelectorAll('.energy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setEnergyLevel(e.target.dataset.energy);
      });
    });

    // Add task
    document.getElementById('add-task-btn').addEventListener('click', () => {
      this.addTask();
    });

    // Enter key for add task
    document.getElementById('new-task-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addTask();
      }
    });
  }

  async setEnergyLevel(level) {
    this.currentEnergyLevel = level;
    
    // Update storage
    await chrome.storage.local.set({ currentEnergyLevel: level });
    await chrome.storage.sync.set({ currentEnergyLevel: level });
    
    // Update UI
    document.querySelectorAll('.energy-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.energy === level);
    });

    // Notify background script
    chrome.runtime.sendMessage({
      action: 'energyLevelChanged',
      energyLevel: level
    });

    // Sync with backend
    this.syncWithBackend('energy-update', { energyLevel: level });
  }

  async addTask() {
    const input = document.getElementById('new-task-input');
    const taskTitle = input.value.trim();

    if (!taskTitle) {
      input.focus();
      return;
    }

    const newTask = {
      id: Date.now().toString(),
      title: taskTitle,
      completed: false,
      createdAt: new Date().toISOString(),
      energyLevel: this.currentEnergyLevel,
      estimatedMinutes: this.estimateTaskTime(taskTitle)
    };

    this.tasks.unshift(newTask);
    input.value = '';

    await this.saveTasks();
    this.updateUI();

    // Sync with backend
    this.syncWithBackend('task-created', newTask);
  }

  async toggleTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;

    await this.saveTasks();
    this.calculateStats();
    this.updateUI();

    // Sync with backend
    this.syncWithBackend('task-updated', task);
  }

  async deleteTask(taskId) {
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    await this.saveTasks();
    this.calculateStats();
    this.updateUI();

    // Sync with backend
    this.syncWithBackend('task-deleted', { taskId });
  }

  async saveTasks() {
    await chrome.storage.local.set({ tasks: this.tasks });
    
    // Also save daily stats
    const today = new Date().toDateString();
    const dailyStats = await chrome.storage.local.get('dailyStats');
    const stats = dailyStats.dailyStats || {};
    stats[today] = this.stats;
    
    await chrome.storage.local.set({ dailyStats: stats });
  }

  calculateStats() {
    const today = new Date().toDateString();
    const todaysTasks = this.tasks.filter(task => {
      const taskDate = new Date(task.createdAt).toDateString();
      return taskDate === today;
    });

    this.stats.pending = todaysTasks.filter(t => !t.completed).length;
    this.stats.completed = todaysTasks.filter(t => t.completed).length;
  }

  updateUI() {
    this.updateStats();
    this.updateEnergyButtons();
    this.updateTasksList();
  }

  updateStats() {
    document.getElementById('pending-count').textContent = this.stats.pending;
    document.getElementById('completed-count').textContent = this.stats.completed;
    document.getElementById('focus-time-stat').textContent = this.formatTime(this.stats.focusTime);
  }

  updateEnergyButtons() {
    document.querySelectorAll('.energy-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.energy === this.currentEnergyLevel);
    });
  }

  updateTasksList() {
    const tasksList = document.getElementById('tasks-list');
    const emptyState = document.getElementById('empty-state');

    if (this.tasks.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    
    // Sort tasks: incomplete first, then by creation date
    const sortedTasks = [...this.tasks].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    tasksList.innerHTML = sortedTasks.map(task => this.renderTask(task)).join('');

    // Add event listeners to task elements
    tasksList.querySelectorAll('.task-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        this.toggleTask(e.target.dataset.taskId);
      });
    });

    tasksList.querySelectorAll('.delete-task-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (confirm('Delete this task?')) {
          this.deleteTask(e.target.dataset.taskId);
        }
      });
    });
  }

  renderTask(task) {
    const createdDate = new Date(task.createdAt).toLocaleDateString();
    const energyIcon = this.getEnergyIcon(task.energyLevel);
    
    return `
      <div class="task-item ${task.completed ? 'completed' : ''}">
        <input 
          type="checkbox" 
          class="task-checkbox" 
          ${task.completed ? 'checked' : ''}
          data-task-id="${task.id}"
        >
        <div class="task-content">
          <div class="task-title">${this.escapeHtml(task.title)}</div>
          <div class="task-meta">
            <span>${energyIcon} ${task.energyLevel}</span>
            <span>📅 ${createdDate}</span>
            ${task.estimatedMinutes ? `<span>⏱️ ${task.estimatedMinutes}m</span>` : ''}
            ${task.completed && task.completedAt ? 
              `<span>✅ Completed ${new Date(task.completedAt).toLocaleTimeString()}</span>` : ''
            }
          </div>
        </div>
        <div class="task-actions">
          <button class="task-action-btn delete-task-btn" data-task-id="${task.id}">
            🗑️ Delete
          </button>
        </div>
      </div>
    `;
  }

  getEnergyIcon(energyLevel) {
    const icons = {
      high: '⚡',
      moderate: '🔋',
      low: '🪫',
      depleted: '😴'
    };
    return icons[energyLevel] || '🔋';
  }

  estimateTaskTime(title) {
    // Simple heuristic for task time estimation
    const words = title.split(' ').length;
    if (words <= 3) return 15;
    if (words <= 6) return 30;
    if (words <= 10) return 45;
    return 60;
  }

  formatTime(milliseconds) {
    if (!milliseconds || milliseconds === 0) return '0m';

    const minutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async syncWithBackend(action, data) {
    try {
      const settings = await chrome.storage.sync.get(['backendUrl', 'apiKey']);

      if (settings.backendUrl && settings.apiKey) {
        const response = await fetch(`${settings.backendUrl}/api/browser-extension/tasks/${action}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
          },
          body: JSON.stringify({
            ...data,
            timestamp: Date.now(),
            userAgent: navigator.userAgent
          })
        });

        if (!response.ok) {
          console.warn('Backend sync failed:', response.status);
        }
      }
    } catch (error) {
      console.log('Backend sync error (this is ok for offline use):', error);
    }
  }

  startPeriodicSync() {
    // Sync data every 30 seconds
    setInterval(async () => {
      await this.loadData();
      this.calculateStats();
      this.updateStats();
    }, 30000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TasksDashboard();
});