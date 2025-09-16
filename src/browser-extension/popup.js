// Proactivity Browser Extension - Popup Script
// Interface for the browser extension popup

class ProactivityPopup {
  constructor() {
    this.currentSession = null;
    this.currentTask = '';
    this.settings = {};

    this.init();
  }

  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.updateUI();
    this.startPeriodicUpdates();
  }

  async loadData() {
    // Load current session data
    const sessionData = await chrome.storage.local.get(['currentSession', 'currentTask']);
    this.currentSession = sessionData.currentSession || {
      focusTime: 0,
      tabSwitches: 0,
      procrastinationTime: 0
    };
    this.currentTask = sessionData.currentTask || '';

    // Load settings
    const settingsData = await chrome.storage.sync.get([
      'enableProcrastinationAlerts',
      'enableHyperfocusProtection',
      'enableTabSwitchingAlerts',
      'currentEnergyLevel'
    ]);
    this.settings = {
      enableProcrastinationAlerts: settingsData.enableProcrastinationAlerts !== false,
      enableHyperfocusProtection: settingsData.enableHyperfocusProtection !== false,
      enableTabSwitchingAlerts: settingsData.enableTabSwitchingAlerts !== false,
      currentEnergyLevel: settingsData.currentEnergyLevel || 'moderate'
    };
  }

  setupEventListeners() {
    // Energy level buttons
    document.querySelectorAll('.energy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setEnergyLevel(e.target.dataset.energy);
      });
    });

    // Action buttons
    document.getElementById('start-focus').addEventListener('click', () => {
      this.startFocusSession();
    });

    document.getElementById('show-tasks').addEventListener('click', () => {
      this.openTaskView();
    });

    document.getElementById('take-break').addEventListener('click', () => {
      this.startBreak();
    });

    // Task actions
    document.getElementById('add-quick-task').addEventListener('click', () => {
      this.addQuickTask();
    });

    document.getElementById('view-all-tasks').addEventListener('click', () => {
      this.openUnifiedDashboard();
    });

    // Task input
    document.getElementById('task-input').addEventListener('input', (e) => {
      this.currentTask = e.target.value;
    });

    document.getElementById('save-task').addEventListener('click', () => {
      this.saveCurrentTask();
    });

    // Settings checkboxes
    document.getElementById('enable-procrastination-alerts').addEventListener('change', (e) => {
      this.updateSetting('enableProcrastinationAlerts', e.target.checked);
    });

    document.getElementById('enable-hyperfocus-protection').addEventListener('change', (e) => {
      this.updateSetting('enableHyperfocusProtection', e.target.checked);
    });

    document.getElementById('enable-tab-switching-alerts').addEventListener('change', (e) => {
      this.updateSetting('enableTabSwitchingAlerts', e.target.checked);
    });

    // Footer buttons
    document.getElementById('open-dashboard').addEventListener('click', () => {
      this.openDashboard();
    });

    document.getElementById('open-settings').addEventListener('click', () => {
      this.openSettings();
    });
  }

  async updateUI() {
    // Get session data from background script
    try {
      const sessionData = await chrome.runtime.sendMessage({ action: 'getSessionData' });
      if (sessionData) {
        this.currentSession = sessionData.session;
        
        // Update enforcement status
        const enforcementStatus = document.getElementById('enforcement-status');
        if (sessionData.enforcementActive && !sessionData.hasCompletedDailyTodo) {
          enforcementStatus.style.display = 'block';
        } else {
          enforcementStatus.style.display = 'none';
        }
      }
    } catch (error) {
      console.log('Could not get session data:', error);
    }

    // Update session stats
    document.getElementById('focus-time').textContent = this.formatTime(this.currentSession.focusTime);
    document.getElementById('tab-switches').textContent = this.currentSession.tabSwitches || 0;
    document.getElementById('procrastination-time').textContent = this.formatTime(this.currentSession.procrastinationTime);

    // Update current task
    document.getElementById('task-input').value = this.currentTask;

    // Update energy level buttons
    document.querySelectorAll('.energy-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.energy === this.settings.currentEnergyLevel);
    });

    // Update settings checkboxes
    document.getElementById('enable-procrastination-alerts').checked = this.settings.enableProcrastinationAlerts;
    document.getElementById('enable-hyperfocus-protection').checked = this.settings.enableHyperfocusProtection;
    document.getElementById('enable-tab-switching-alerts').checked = this.settings.enableTabSwitchingAlerts;

    // Load and display urgent tasks
    await this.loadUrgentTasks();
  }

  async setEnergyLevel(level) {
    this.settings.currentEnergyLevel = level;
    await chrome.storage.sync.set({ currentEnergyLevel: level });

    // Send to background script
    chrome.runtime.sendMessage({
      action: 'updateEnergyLevel',
      energyLevel: level
    });

    // Send to backend if configured
    await this.syncWithBackend('energy-update', { energyLevel: level });

    this.updateUI();
  }

  async startFocusSession() {
    const duration = 25; // 25 minutes default

    // Send to background script
    chrome.runtime.sendMessage({
      action: 'startFocusSession',
      duration: duration,
      task: this.currentTask
    });

    // Open focus page
    chrome.tabs.create({
      url: chrome.runtime.getURL('focus.html')
    });

    window.close();
  }

  async openTaskView() {
    // Use unified dashboard for both tasks and dashboard functionality
    await this.openUnifiedDashboard();
  }

  async startBreak() {
    const duration = 5; // 5 minutes default

    // Send to background script
    chrome.runtime.sendMessage({
      action: 'startBreak',
      duration: duration
    });

    // Open break page
    chrome.tabs.create({
      url: chrome.runtime.getURL('break.html')
    });

    window.close();
  }

  async saveCurrentTask() {
    await chrome.storage.local.set({ currentTask: this.currentTask });

    // Send to background script
    chrome.runtime.sendMessage({
      action: 'updateCurrentTask',
      task: this.currentTask
    });

    // Send to backend
    await this.syncWithBackend('task-update', { currentTask: this.currentTask });

    // Visual feedback
    const saveBtn = document.getElementById('save-task');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saved!';
    saveBtn.style.background = '#48bb78';

    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.style.background = '';
    }, 1500);
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    await chrome.storage.sync.set({ [key]: value });

    // Send to background script
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: { [key]: value }
    });
  }

  async openDashboard() {
    // Use unified dashboard for both tasks and dashboard functionality  
    await this.openUnifiedDashboard();
  }

  async openUnifiedDashboard() {
    const settings = await chrome.storage.sync.get(['backendUrl', 'dashboardViewMode']);

    if (settings.backendUrl) {
      // If backend is available, use it
      chrome.tabs.create({
        url: `${settings.backendUrl}/dashboard`
      });
    } else {
      // Use local dashboard
      const viewMode = settings.dashboardViewMode || 'tab';
      
      if (viewMode === 'sidebar') {
        // Open as sidebar popup window
        chrome.windows.create({
          url: chrome.runtime.getURL('dashboard.html'),
          type: 'popup',
          width: 380,
          height: 600,
          left: screen.width - 400,
          top: 100
        });
      } else {
        // Open as full tab
        chrome.tabs.create({
          url: chrome.runtime.getURL('dashboard.html')
        });
      }
    }

    window.close();
  }

  async openSettings() {
    chrome.runtime.openOptionsPage();
    window.close();
  }

  startPeriodicUpdates() {
    // Update UI every 5 seconds
    setInterval(async () => {
      await this.loadData();
      this.updateUI();
    }, 5000);
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

  async syncWithBackend(action, data) {
    try {
      const settings = await chrome.storage.sync.get(['backendUrl', 'apiKey']);

      if (settings.backendUrl && settings.apiKey) {
        const response = await fetch(`${settings.backendUrl}/api/browser-extension/${action}`, {
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

  async loadUrgentTasks() {
    try {
      const urgentTasks = await chrome.runtime.sendMessage({ action: 'getUrgentTasks' });
      this.displayUrgentTasks(urgentTasks || []);
    } catch (error) {
      console.error('Error loading urgent tasks:', error);
      this.displayUrgentTasks([]);
    }
  }

  displayUrgentTasks(tasks) {
    const urgentTasksList = document.getElementById('urgent-tasks-list');
    
    if (tasks.length === 0) {
      urgentTasksList.innerHTML = `
        <div class="no-urgent-tasks">
          <div class="no-urgent-tasks-icon">✅</div>
          <div>No urgent tasks - great job!</div>
        </div>
      `;
      return;
    }

    urgentTasksList.innerHTML = tasks.map(task => `
      <div class="urgent-task-item" data-task-id="${task.id}">
        <div class="urgent-task-checkbox ${task.completed ? 'completed' : ''}" 
             data-task-id="${task.id}"></div>
        <div class="urgent-task-content">
          <div class="urgent-task-title">${this.escapeHtml(task.title)}</div>
          <div class="urgent-task-meta">
            <span class="urgent-task-priority ${task.priority}">${task.priority}</span>
            <span>Score: ${Math.round(task.urgencyScore)}</span>
            ${task.estimatedMinutes ? `<span>${task.estimatedMinutes}m</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');

    // Add event listeners for task completion
    urgentTasksList.querySelectorAll('.urgent-task-checkbox').forEach(checkbox => {
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleTask(e.target.dataset.taskId);
      });
    });

    // Add event listeners for task items (open in dashboard)
    urgentTasksList.querySelectorAll('.urgent-task-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('urgent-task-checkbox')) {
          this.openUnifiedDashboard();
        }
      });
    });
  }

  async toggleTask(taskId) {
    try {
      // Get current tasks
      const data = await chrome.storage.local.get(['tasks']);
      const tasks = data.tasks || [];
      
      // Find and toggle the task
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;
        
        // Save tasks
        await chrome.storage.local.set({ tasks });
        
        // Notify background script
        chrome.runtime.sendMessage({
          action: 'taskCompleted',
          task: task
        });
        
        // Refresh UI
        await this.loadUrgentTasks();
        await this.updateUI();
      }
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  }

  async addQuickTask() {
    const taskTitle = prompt('What task would you like to add?');
    if (taskTitle && taskTitle.trim()) {
      try {
        const data = await chrome.storage.local.get(['tasks']);
        const tasks = data.tasks || [];
        
        const newTask = {
          id: Date.now().toString(),
          title: taskTitle.trim(),
          priority: 'medium',
          completed: false,
          createdAt: new Date().toISOString(),
          energyLevel: 3,
          estimatedMinutes: 30
        };
        
        tasks.unshift(newTask);
        await chrome.storage.local.set({ tasks });
        
        // Refresh urgent tasks
        await this.loadUrgentTasks();
        
      } catch (error) {
        console.error('Error adding task:', error);
        alert('Error adding task. Please try again.');
      }
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ProactivityPopup();
});