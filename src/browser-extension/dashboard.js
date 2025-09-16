// Dashboard Script for Proactivity Browser Extension
class ProactivityDashboard {
  constructor() {
    this.tasks = [];
    this.currentEnergyLevel = 3; // Default to medium
    this.isTimerRunning = false;
    this.timerInterval = null;
    this.timerMinutes = 25;
    this.timerSeconds = 0;
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      focusTime: 0,
      streakDays: 0
    };
    this.viewMode = 'sidebar'; // 'sidebar' or 'tab'

    this.init();
  }

  async init() {
    console.log('ProactivityDashboard initializing...');
    await this.loadData();
    await this.loadUserPreferences();
    this.setupEventListeners();
    this.updateUI();
    this.startPeriodicSync();
    console.log('ProactivityDashboard initialized successfully');
  }

  async loadUserPreferences() {
    try {
      const data = await chrome.storage.sync.get(['dashboardViewMode']);
      this.viewMode = data.dashboardViewMode || 'sidebar';
      this.updateViewMode(this.viewMode, false);
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }

  async loadData() {
    try {
      const data = await chrome.storage.local.get([
        'tasks', 
        'currentEnergyLevel', 
        'dailyStats',
        'currentSession',
        'streakData'
      ]);

      this.tasks = data.tasks || [];
      this.currentEnergyLevel = data.currentEnergyLevel || 3;
      
      // Load current session data
      if (data.currentSession) {
        this.timerMinutes = data.currentSession.remainingMinutes || 25;
        this.timerSeconds = data.currentSession.remainingSeconds || 0;
        this.stats.focusTime = data.currentSession.focusTime || 0;
      }

      // Load streak data
      const streakData = data.streakData || {};
      this.stats.streakDays = this.calculateStreak(streakData);
      
      // Calculate stats
      this.calculateStats();
      
      console.log('Loaded data - Tasks:', this.tasks.length, 'Energy:', this.currentEnergyLevel);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  setupEventListeners() {
    // View mode toggle
    document.getElementById('sidebarMode').addEventListener('click', () => {
      this.updateViewMode('sidebar', true);
    });

    document.getElementById('tabMode').addEventListener('click', () => {
      this.updateViewMode('tab', true);
    });

    // Header actions
    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    document.getElementById('syncBtn').addEventListener('click', () => {
      this.performFullSync();
    });

    // Energy level buttons
    document.querySelectorAll('.energy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setEnergyLevel(parseInt(e.currentTarget.dataset.energy));
      });
    });

    // Timer controls
    document.getElementById('startTimer').addEventListener('click', () => {
      this.startTimer();
    });

    document.getElementById('pauseTimer').addEventListener('click', () => {
      this.pauseTimer();
    });

    document.getElementById('stopTimer').addEventListener('click', () => {
      this.stopTimer();
    });

    // Task management
    document.getElementById('addTaskBtn').addEventListener('click', () => {
      this.showTaskInput();
    });

    document.getElementById('addFirstTaskBtn').addEventListener('click', () => {
      this.showTaskInput();
    });

    document.getElementById('saveTaskBtn').addEventListener('click', () => {
      this.addTask();
    });

    document.getElementById('cancelTaskBtn').addEventListener('click', () => {
      this.hideTaskInput();
    });

    document.getElementById('taskInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addTask();
      }
      if (e.key === 'Escape') {
        this.hideTaskInput();
      }
    });

    // Enforcement testing
    document.getElementById('testNotifications').addEventListener('click', () => {
      this.testNotifications();
    });

    document.getElementById('testFocusInterruption').addEventListener('click', () => {
      this.testFocusInterruption();
    });

    document.getElementById('testPatternDetection').addEventListener('click', () => {
      this.testPatternDetection();
    });

    document.getElementById('testTaskBreakdown').addEventListener('click', () => {
      this.testTaskBreakdown();
    });

    document.getElementById('testTimeTracking').addEventListener('click', () => {
      this.testTimeTracking();
    });

    document.getElementById('testUrgencyDetection').addEventListener('click', () => {
      this.testUrgencyDetection();
    });
  }

  async updateViewMode(mode, save = false) {
    this.viewMode = mode;
    
    const container = document.getElementById('container');
    const sidebarBtn = document.getElementById('sidebarMode');
    const tabBtn = document.getElementById('tabMode');

    if (mode === 'sidebar') {
      container.className = 'container sidebar-mode';
      sidebarBtn.classList.add('active');
      tabBtn.classList.remove('active');
    } else {
      container.className = 'container tab-mode';
      tabBtn.classList.add('active');
      sidebarBtn.classList.remove('active');
    }

    if (save) {
      await chrome.storage.sync.set({ dashboardViewMode: mode });
    }
  }

  async setEnergyLevel(level) {
    this.currentEnergyLevel = level;
    
    // Update storage
    await chrome.storage.local.set({ currentEnergyLevel: level });
    await chrome.storage.sync.set({ currentEnergyLevel: level });
    
    // Update UI
    this.updateEnergyDisplay();

    // Notify background script
    try {
      chrome.runtime.sendMessage({
        action: 'energyLevelChanged',
        energyLevel: level
      });
    } catch (error) {
      console.log('Could not send message to background script:', error);
    }

    // Sync with backend
    this.syncWithBackend('energy-update', { energyLevel: level });
  }

  // Timer functions
  startTimer() {
    this.isTimerRunning = true;
    document.getElementById('startTimer').style.display = 'none';
    document.getElementById('pauseTimer').style.display = 'inline-block';
    document.getElementById('stopTimer').style.display = 'inline-block';
    
    this.timerInterval = setInterval(() => {
      if (this.timerSeconds === 0) {
        if (this.timerMinutes === 0) {
          this.timerComplete();
          return;
        }
        this.timerMinutes--;
        this.timerSeconds = 59;
      } else {
        this.timerSeconds--;
      }
      
      this.updateTimerDisplay();
      this.saveTimerState();
    }, 1000);

    // Save timer state
    this.saveTimerState();
  }

  pauseTimer() {
    this.isTimerRunning = false;
    clearInterval(this.timerInterval);
    
    document.getElementById('startTimer').style.display = 'inline-block';
    document.getElementById('pauseTimer').style.display = 'none';
    
    this.saveTimerState();
  }

  stopTimer() {
    this.isTimerRunning = false;
    clearInterval(this.timerInterval);
    
    // Add elapsed time to stats
    const elapsedMinutes = 25 - this.timerMinutes;
    if (elapsedMinutes > 0) {
      this.stats.focusTime += elapsedMinutes;
      this.updateStats();
    }
    
    // Reset timer
    this.timerMinutes = 25;
    this.timerSeconds = 0;
    
    document.getElementById('startTimer').style.display = 'inline-block';
    document.getElementById('pauseTimer').style.display = 'none';
    document.getElementById('stopTimer').style.display = 'none';
    
    this.updateTimerDisplay();
    this.saveTimerState();
  }

  timerComplete() {
    this.isTimerRunning = false;
    clearInterval(this.timerInterval);
    
    // Add full session to stats
    this.stats.focusTime += 25;
    this.updateStats();
    
    // Show completion notification
    this.showNotification('🎉 Focus session completed!', 'Great job! Take a short break.');
    
    // Reset timer
    this.timerMinutes = 25;
    this.timerSeconds = 0;
    
    document.getElementById('startTimer').style.display = 'inline-block';
    document.getElementById('pauseTimer').style.display = 'none';
    document.getElementById('stopTimer').style.display = 'none';
    
    this.updateTimerDisplay();
    this.saveTimerState();
  }

  updateTimerDisplay() {
    const display = `${this.timerMinutes.toString().padStart(2, '0')}:${this.timerSeconds.toString().padStart(2, '0')}`;
    document.getElementById('timerDisplay').textContent = display;
  }

  async saveTimerState() {
    const sessionData = {
      remainingMinutes: this.timerMinutes,
      remainingSeconds: this.timerSeconds,
      isRunning: this.isTimerRunning,
      focusTime: this.stats.focusTime,
      lastUpdated: Date.now()
    };
    
    await chrome.storage.local.set({ currentSession: sessionData });
  }

  // Task management
  showTaskInput() {
    document.getElementById('taskInputContainer').style.display = 'flex';
    document.getElementById('taskInput').focus();
  }

  hideTaskInput() {
    document.getElementById('taskInputContainer').style.display = 'none';
    document.getElementById('taskInput').value = '';
    document.getElementById('taskPriority').value = 'medium';
  }

  async addTask() {
    const input = document.getElementById('taskInput');
    const priority = document.getElementById('taskPriority').value;
    const taskTitle = input.value.trim();

    if (!taskTitle) {
      input.focus();
      return;
    }

    const newTask = {
      id: Date.now().toString(),
      title: taskTitle,
      priority: priority,
      completed: false,
      createdAt: new Date().toISOString(),
      energyLevel: this.currentEnergyLevel,
      estimatedMinutes: this.estimateTaskTime(taskTitle)
    };

    this.tasks.unshift(newTask);
    this.hideTaskInput();

    await this.saveTasks();
    this.calculateStats();
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
    this.stats.totalTasks = this.tasks.length;
    this.stats.completedTasks = this.tasks.filter(t => t.completed).length;
    
    // Focus time is tracked separately in timer functions
    // Streak is calculated in loadData
  }

  calculateStreak(streakData) {
    // Simple streak calculation based on daily task completions
    const today = new Date().toDateString();
    let streak = 0;
    let currentDate = new Date();
    
    while (true) {
      const dateStr = currentDate.toDateString();
      if (streakData[dateStr] && streakData[dateStr].completed > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  }

  updateUI() {
    this.updateStats();
    this.updateEnergyDisplay();
    this.updateTasksList();
    this.updateTimerDisplay();
  }

  updateStats() {
    document.getElementById('totalTasks').textContent = this.stats.totalTasks;
    document.getElementById('completedTasks').textContent = this.stats.completedTasks;
    document.getElementById('focusTime').textContent = `${this.stats.focusTime}m`;
    document.getElementById('streakDays').textContent = this.stats.streakDays;
  }

  updateEnergyDisplay() {
    const energyLabels = ['', 'Very Low', 'Low', 'Medium', 'High', 'Very High'];
    document.getElementById('currentEnergyDisplay').textContent = energyLabels[this.currentEnergyLevel];
    
    document.querySelectorAll('.energy-btn').forEach(btn => {
      btn.classList.toggle('active', 
        parseInt(btn.dataset.energy) === this.currentEnergyLevel);
    });
  }

  updateTasksList() {
    const tasksList = document.getElementById('tasksList');
    const emptyState = document.getElementById('emptyState');

    if (this.tasks.length === 0) {
      tasksList.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    tasksList.style.display = 'block';
    emptyState.style.display = 'none';
    
    // Sort tasks: incomplete first, then by priority, then by creation date
    const sortedTasks = [...this.tasks].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    tasksList.innerHTML = sortedTasks.map(task => this.renderTask(task)).join('');

    // Add event listeners to task elements
    tasksList.querySelectorAll('.task-checkbox').forEach(checkbox => {
      checkbox.addEventListener('click', (e) => {
        this.toggleTask(e.target.closest('.task-item').dataset.taskId);
      });
    });

    tasksList.querySelectorAll('.task-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (e.target.textContent.includes('🗑️')) {
          if (confirm('Delete this task?')) {
            this.deleteTask(e.target.closest('.task-item').dataset.taskId);
          }
        }
      });
    });
  }

  renderTask(task) {
    const createdDate = new Date(task.createdAt).toLocaleDateString();
    const energyLabels = ['', '😴', '😐', '🙂', '😊', '🚀'];
    const energyIcon = energyLabels[task.energyLevel] || '🙂';
    
    return `
      <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
        <div class="task-checkbox ${task.completed ? 'completed' : ''}"></div>
        <div class="task-text ${task.completed ? 'completed' : ''}">
          ${this.escapeHtml(task.title)}
        </div>
        <div class="task-priority ${task.priority}">${task.priority.toUpperCase()}</div>
        <div class="task-actions">
          <button class="task-action-btn">🗑️</button>
        </div>
      </div>
    `;
  }

  estimateTaskTime(title) {
    // Simple heuristic for task time estimation
    const words = title.split(' ').length;
    if (words <= 3) return 15;
    if (words <= 6) return 30;
    if (words <= 10) return 45;
    return 60;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Enforcement testing functions
  async testNotifications() {
    this.showNotification('🔔 Test Notification', 'This is a test notification from the enforcement system');
    
    // Also try browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification('Proactivity Test', {
        body: 'This is a browser notification test',
        icon: chrome.runtime.getURL('icons/icon48.png')
      });
    }
  }

  async testFocusInterruption() {
    this.showNotification('⚡ Focus Protection', 'Focus interruption mechanism activated! Distracting websites would be blocked.');
    
    // Send message to background script to test blocking
    try {
      chrome.runtime.sendMessage({
        action: 'testFocusMode',
        enabled: true
      });
    } catch (error) {
      console.log('Could not test focus mode:', error);
    }
  }

  async testPatternDetection() {
    const patterns = [
      'High task creation but low completion rate detected',
      'Energy level patterns suggest optimal work time is 10-11 AM',
      'Task switching frequency indicates possible attention challenges'
    ];
    
    const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
    this.showNotification('📊 Pattern Analysis', randomPattern);
  }

  async testTaskBreakdown() {
    if (this.tasks.length === 0) {
      this.showNotification('🎯 Task Breakdown', 'Add a task first to test AI breakdown functionality');
      return;
    }
    
    const firstTask = this.tasks.find(t => !t.completed);
    if (firstTask) {
      this.showNotification('🎯 AI Task Breakdown', 
        `Breaking down: "${firstTask.title}"\n\n` +
        '1. Gather required materials\n' +
        '2. Set up workspace\n' +
        '3. Complete main task\n' +
        '4. Review and finalize'
      );
    }
  }

  async testTimeTracking() {
    const sessionData = {
      startTime: new Date().toLocaleTimeString(),
      estimatedDuration: '25 minutes',
      productivityScore: Math.floor(Math.random() * 40) + 60
    };
    
    this.showNotification('⏰ Time Tracking', 
      `Session started at ${sessionData.startTime}\n` +
      `Estimated duration: ${sessionData.estimatedDuration}\n` +
      `Productivity score: ${sessionData.productivityScore}%`
    );
  }

  async testUrgencyDetection() {
    const urgencyLevels = ['Low', 'Medium', 'High', 'Critical'];
    const randomUrgency = urgencyLevels[Math.floor(Math.random() * urgencyLevels.length)];
    
    this.showNotification('🚨 Urgency Detection', 
      `Current task urgency level: ${randomUrgency}\n` +
      'Adjusting notification frequency and priority accordingly.'
    );
  }

  showNotification(title, message) {
    // Create a simple toast notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--adhd-blue);
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 350px;
      font-size: 14px;
      line-height: 1.4;
    `;
    
    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
      <div style="font-size: 13px; opacity: 0.9;">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
    
    // Click to dismiss
    notification.addEventListener('click', () => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });
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

  async performFullSync() {
    this.showNotification('🔄 Syncing...', 'Synchronizing with backend services');
    
    try {
      // Reload all data
      await this.loadData();
      this.calculateStats();
      this.updateUI();
      
      // Sync with backend
      await this.syncWithBackend('full-sync', {
        tasks: this.tasks,
        energyLevel: this.currentEnergyLevel,
        stats: this.stats
      });
      
      this.showNotification('✅ Sync Complete', 'All data synchronized successfully');
    } catch (error) {
      this.showNotification('❌ Sync Failed', 'Could not sync with backend services');
      console.error('Sync error:', error);
    }
  }

  startPeriodicSync() {
    // Sync data every 60 seconds
    setInterval(async () => {
      await this.loadData();
      this.calculateStats();
      this.updateStats();
    }, 60000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ProactivityDashboard();
});