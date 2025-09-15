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

  updateUI() {
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
    // Try to open backend task view first
    const settings = await chrome.storage.sync.get(['backendUrl']);

    if (settings.backendUrl) {
      chrome.tabs.create({
        url: `${settings.backendUrl}/tasks`
      });
    } else {
      // Open local task management page
      chrome.tabs.create({
        url: chrome.runtime.getURL('tasks.html')
      });
    }

    window.close();
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
    const settings = await chrome.storage.sync.get(['backendUrl']);

    if (settings.backendUrl) {
      chrome.tabs.create({
        url: `${settings.backendUrl}/dashboard`
      });
    } else {
      chrome.tabs.create({
        url: chrome.runtime.getURL('dashboard.html')
      });
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
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ProactivityPopup();
});