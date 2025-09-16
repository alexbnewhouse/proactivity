// Proactivity Browser Extension - Background Service Worker
// Monitors browsing patterns and triggers ADHD-friendly interventions

class ProactivityBackgroundService {
  constructor() {
    this.currentSession = {
      startTime: Date.now(),
      tabSwitches: 0,
      procrastinationTime: 0,
      focusTime: 0,
      lastActiveTab: null,
      activeTabStartTime: Date.now()
    };

    this.procrastinationSites = [
      'youtube.com', 'facebook.com', 'twitter.com', 'x.com',
      'reddit.com', 'instagram.com', 'tiktok.com', 'netflix.com',
      'twitch.tv', 'linkedin.com', 'pinterest.com', 'tumblr.com'
    ];

    this.focusThresholds = {
      tabSwitchingWarning: 10, // tabs per 10 minutes
      procrastinationWarning: 5 * 60 * 1000, // 5 minutes
      hyperfocusCheck: 90 * 60 * 1000 // 90 minutes
    };

    // Enforcement state
    this.enforcementActive = false;
    this.allowedDomains = ['chrome://settings', 'chrome://extensions', 'localhost'];
    this.hasCompletedDailyTodo = false;

    this.setupEventListeners();
    this.startMonitoring();
    this.setupMessageHandlers();
    this.initializeEnforcement();
  }

  async initializeEnforcement() {
    // Check if user has completed any task today
    await this.checkDailyTodoCompletion();
    
    // Set up enforcement based on completion status
    if (!this.hasCompletedDailyTodo) {
      this.enableStrictEnforcement();
    }
  }

  async checkDailyTodoCompletion() {
    try {
      const data = await chrome.storage.local.get(['tasks', 'dailyStats']);
      const today = new Date().toDateString();
      
      // Check if any task was completed today
      const tasks = data.tasks || [];
      const completedToday = tasks.some(task => {
        if (!task.completed || !task.completedAt) return false;
        const completedDate = new Date(task.completedAt).toDateString();
        return completedDate === today;
      });
      
      // Also check daily stats
      const dailyStats = data.dailyStats || {};
      const todayStats = dailyStats[today];
      const statsShowCompletion = todayStats && todayStats.completed > 0;
      
      this.hasCompletedDailyTodo = completedToday || statsShowCompletion;
      console.log('Daily todo completion status:', this.hasCompletedDailyTodo);
    } catch (error) {
      console.error('Error checking daily todo completion:', error);
      this.hasCompletedDailyTodo = false;
    }
  }

  enableStrictEnforcement() {
    this.enforcementActive = true;
    console.log('Strict enforcement ENABLED - blocking all websites until daily todo completion');
    
    // Show system notification
    this.showSystemNotification(
      'Proactivity Enforcement Active',
      'Complete at least one task today to unlock web browsing',
      'blocking'
    );
  }

  disableStrictEnforcement() {
    this.enforcementActive = false;
    console.log('Strict enforcement DISABLED - daily todo completed');
    
    // Show system notification
    this.showSystemNotification(
      'Great Job! 🎉',
      'Daily task completed - web browsing unlocked!',
      'success'
    );
  }

  setupMessageHandlers() {
    // Handle messages from popup and tasks page
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'energyLevelChanged':
          this.handleEnergyLevelChange(message.energyLevel);
          break;
        case 'updateSettings':
          this.handleSettingsUpdate(message.settings);
          break;
        case 'startFocusSession':
          this.startFocusSession(message.task);
          break;
        case 'taskCompleted':
          this.handleTaskCompletion(message.task);
          break;
        case 'getSessionData':
          sendResponse({
            session: this.currentSession,
            timestamp: Date.now(),
            enforcementActive: this.enforcementActive,
            hasCompletedDailyTodo: this.hasCompletedDailyTodo
          });
          break;
        case 'testFocusMode':
          this.testEnforcementMechanism();
          break;
        case 'getUrgentTasks':
          this.getUrgentTasks().then(sendResponse);
          return true; // Keep channel open for async response
      }
      return true; // Keep message channel open for async response
    });
  }

  setupEventListeners() {
    // Tab activation (switching tabs)
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabSwitch(activeInfo.tabId);
    });

    // Tab updates (navigation within tab)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.handleTabUpdate(tabId, tab.url);
      }
    });

    // Window focus changes
    chrome.windows.onFocusChanged.addListener((windowId) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        this.handleWindowBlur();
      } else {
        this.handleWindowFocus();
      }
    });

    // Alarm for periodic checks
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'proactivity-check') {
        this.performPeriodicCheck();
      }
    });
  }

  startMonitoring() {
    // Set up periodic checks every 2 minutes
    chrome.alarms.create('proactivity-check', {
      delayInMinutes: 2,
      periodInMinutes: 2
    });

    console.log('Proactivity monitoring started');
  }

  async handleTabSwitch(tabId) {
    const now = Date.now();
    const tab = await chrome.tabs.get(tabId);

    // Record time spent on previous tab
    if (this.currentSession.lastActiveTab) {
      const timeSpent = now - this.currentSession.activeTabStartTime;
      await this.recordTabTime(this.currentSession.lastActiveTab, timeSpent);
    }

    // Update session data
    this.currentSession.tabSwitches++;
    this.currentSession.lastActiveTab = tab;
    this.currentSession.activeTabStartTime = now;

    // Check for excessive tab switching
    await this.checkTabSwitchingPattern();

    // Analyze new tab for procrastination
    if (tab.url) {
      await this.analyzeTabForProcrastination(tab);
    }
  }

  async handleTabUpdate(tabId, url) {
    const tab = await chrome.tabs.get(tabId);

    // Check if website should be blocked
    if (this.enforcementActive && this.shouldBlockUrl(url)) {
      await this.blockWebsite(tabId, url);
      return;
    }

    if (tab.active) {
      await this.analyzeTabForProcrastination(tab);
    }
  }

  shouldBlockUrl(url) {
    if (!url) return false;
    
    const domain = this.extractDomain(url);
    
    // Allow chrome:// URLs and extension pages
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
      return false;
    }
    
    // Allow local development
    if (this.allowedDomains.some(allowed => domain.includes(allowed))) {
      return false;
    }
    
    // Block everything else when enforcement is active
    return true;
  }

  async blockWebsite(tabId, url) {
    const blockPageUrl = chrome.runtime.getURL('blocked.html') + '?url=' + encodeURIComponent(url);
    
    try {
      await chrome.tabs.update(tabId, { url: blockPageUrl });
      
      // Show system notification
      this.showSystemNotification(
        'Website Blocked',
        'Complete a daily task to unlock web browsing',
        'warning'
      );
    } catch (error) {
      console.error('Error blocking website:', error);
    }
  }

  async handleTaskCompletion(task) {
    // Re-check daily completion status
    await this.checkDailyTodoCompletion();
    
    if (this.hasCompletedDailyTodo && this.enforcementActive) {
      this.disableStrictEnforcement();
    }
  }

  handleWindowBlur() {
    // User switched away from browser
    this.recordWindowEvent('blur');
  }

  handleWindowFocus() {
    // User returned to browser
    this.recordWindowEvent('focus');
  }

  async recordTabTime(tab, timeSpent) {
    if (!tab.url) return;

    const domain = this.extractDomain(tab.url);
    const isProcrastination = this.isProcrastinationSite(domain);

    if (isProcrastination) {
      this.currentSession.procrastinationTime += timeSpent;
    } else {
      this.currentSession.focusTime += timeSpent;
    }

    // Store in chrome.storage for persistence
    const storage = await chrome.storage.local.get(['tabTimeData']);
    const tabTimeData = storage.tabTimeData || {};

    if (!tabTimeData[domain]) {
      tabTimeData[domain] = { totalTime: 0, visits: 0 };
    }

    tabTimeData[domain].totalTime += timeSpent;
    tabTimeData[domain].visits++;

    await chrome.storage.local.set({ tabTimeData });
  }

  async checkTabSwitchingPattern() {
    const now = Date.now();
    const sessionDuration = now - this.currentSession.startTime;
    const switchRate = this.currentSession.tabSwitches / (sessionDuration / (10 * 60 * 1000));

    if (switchRate > this.focusThresholds.tabSwitchingWarning) {
      await this.triggerTabSwitchingIntervention();
    }
  }

  async analyzeTabForProcrastination(tab) {
    if (!tab.url) return;

    const domain = this.extractDomain(tab.url);

    if (this.isProcrastinationSite(domain)) {
      // Start timer for this procrastination session
      setTimeout(async () => {
        // Check if still on the same tab after threshold time
        const currentTab = await chrome.tabs.query({ active: true, currentWindow: true });
        if (currentTab[0] && currentTab[0].id === tab.id) {
          await this.triggerProcrastinationIntervention(tab);
        }
      }, this.focusThresholds.procrastinationWarning);
    }
  }

  async performPeriodicCheck() {
    const now = Date.now();
    const sessionDuration = now - this.currentSession.startTime;

    // Check for hyperfocus (extended work session)
    if (sessionDuration > this.focusThresholds.hyperfocusCheck) {
      await this.checkForHyperfocus();
    }

    // Update session stats
    await this.updateSessionStats();

    // Sync with backend if available
    await this.syncWithBackend();
  }

  async triggerTabSwitchingIntervention() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && await this.isTabReady(tabs[0])) {
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: this.showTabSwitchingOverlay
        });
      }
    } catch (error) {
      console.log('Tab switching intervention failed:', error);
    }
  }

  async triggerProcrastinationIntervention(tab) {
    try {
      if (await this.isTabReady(tab)) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: this.showProcrastinationOverlay,
          args: [this.extractDomain(tab.url)]
        });
      }
    } catch (error) {
      console.log('Procrastination intervention failed:', error);
    }
  }

  async checkForHyperfocus() {
    try {
      const settings = await chrome.storage.sync.get(['hyperfocusProtection']);

      if (settings.hyperfocusProtection !== false) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0] && await this.isTabReady(tabs[0])) {
          await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: this.showHyperfocusReminder
          });
        }
      }
    } catch (error) {
      console.log('Hyperfocus check failed:', error);
    }
  }

  // Content script functions (injected into pages)
  showTabSwitchingOverlay() {
    if (document.querySelector('#proactivity-tab-switching-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'proactivity-tab-switching-overlay';
    overlay.innerHTML = `
      <div class="proactivity-overlay">
        <div class="proactivity-modal">
          <h3>🧠 Hey there, ADHD brain!</h3>
          <p>I noticed you're switching between tasks frequently. This is totally normal!</p>
          <p>Want to pick one thing to focus on for the next 15 minutes?</p>
          <div class="proactivity-actions">
            <button id="proactivity-focus-btn">Yes, help me focus</button>
            <button id="proactivity-break-btn">I need a quick break</button>
            <button id="proactivity-dismiss-btn">Dismiss</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners
    document.getElementById('proactivity-focus-btn').onclick = () => {
      window.open('chrome-extension://' + chrome.runtime.id + '/focus.html', '_blank');
      overlay.remove();
    };

    document.getElementById('proactivity-break-btn').onclick = () => {
      window.open('chrome-extension://' + chrome.runtime.id + '/break.html', '_blank');
      overlay.remove();
    };

    document.getElementById('proactivity-dismiss-btn').onclick = () => {
      overlay.remove();
    };

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (overlay.parentNode) overlay.remove();
    }, 10000);
  }

  showProcrastinationOverlay(domain) {
    if (document.querySelector('#proactivity-procrastination-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'proactivity-procrastination-overlay';
    overlay.innerHTML = `
      <div class="proactivity-overlay">
        <div class="proactivity-modal procrastination-modal">
          <h3>✨ Gentle reminder</h3>
          <p>You've been on ${domain} for a few minutes now.</p>
          <p>No judgment! Want to check what you were planning to work on?</p>
          <div class="proactivity-actions">
            <button id="proactivity-return-btn">Show my tasks</button>
            <button id="proactivity-timer-btn">5 more minutes, then remind me</button>
            <button id="proactivity-break-btn">This is my scheduled break</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners
    document.getElementById('proactivity-return-btn').onclick = () => {
      window.open('chrome-extension://' + chrome.runtime.id + '/tasks.html', '_blank');
      overlay.remove();
    };

    document.getElementById('proactivity-timer-btn').onclick = () => {
      // Set a 5-minute timer
      setTimeout(() => {
        if (window.location.hostname === domain) {
          // Still on the same site, show more urgent reminder
          showUrgentProcrastinationReminder();
        }
      }, 5 * 60 * 1000);
      overlay.remove();
    };

    document.getElementById('proactivity-break-btn').onclick = () => {
      // Mark as scheduled break, don't bother for next hour
      chrome.storage.local.set({
        scheduledBreak: {
          domain: domain,
          until: Date.now() + 60 * 60 * 1000
        }
      });
      overlay.remove();
    };
  }

  showHyperfocusReminder() {
    if (document.querySelector('#proactivity-hyperfocus-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'proactivity-hyperfocus-overlay';
    overlay.innerHTML = `
      <div class="proactivity-overlay">
        <div class="proactivity-modal hyperfocus-modal">
          <h3>🌟 Amazing focus session!</h3>
          <p>You've been working for over 90 minutes. Your brain deserves a break!</p>
          <p>Just 5-10 minutes to recharge will help you maintain this great momentum.</p>
          <div class="proactivity-actions">
            <button id="proactivity-break-now-btn">Take a break now</button>
            <button id="proactivity-break-soon-btn">15 more minutes, then break</button>
            <button id="proactivity-zone-btn">I'm in the zone, check in 30 minutes</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners
    document.getElementById('proactivity-break-now-btn').onclick = () => {
      window.open('chrome-extension://' + chrome.runtime.id + '/break.html', '_blank');
      overlay.remove();
    };

    document.getElementById('proactivity-break-soon-btn').onclick = () => {
      chrome.alarms.create('hyperfocus-break-reminder', { delayInMinutes: 15 });
      overlay.remove();
    };

    document.getElementById('proactivity-zone-btn').onclick = () => {
      chrome.alarms.create('hyperfocus-zone-check', { delayInMinutes: 30 });
      overlay.remove();
    };
  }

  // Helper methods
  async isTabReady(tab) {
    try {
      // Check if tab is ready for script injection
      if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('moz-extension://') || tab.url.startsWith('vivaldi://') ||
          tab.url.startsWith('about:') || tab.url.startsWith('file://')) {
        return false;
      }

      // Check if tab status is complete
      if (tab.status && tab.status !== 'complete') {
        return false;
      }

      // Additional check for Vivaldi and other Chromium browsers
      if (tab.discarded) {
        return false;
      }

      return true;
    } catch (error) {
      console.log('Tab readiness check failed:', error);
      return false;
    }
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  isProcrastinationSite(domain) {
    return this.procrastinationSites.some(site => domain.includes(site));
  }

  async handleEnergyLevelChange(energyLevel) {
    // Store energy level change
    await chrome.storage.local.set({ 
      currentEnergyLevel: energyLevel,
      energyLevelChangedAt: Date.now()
    });

    // Sync with backend
    this.syncWithBackend();
    
    console.log(`Energy level changed to: ${energyLevel}`);
  }

  async handleSettingsUpdate(settings) {
    // Settings are already stored by the calling component
    // Just trigger a sync
    this.syncWithBackend();
    
    console.log('Settings updated:', settings);
  }

  async startFocusSession(task) {
    // Reset session stats for new focus session
    this.currentSession = {
      startTime: Date.now(),
      tabSwitches: 0,
      procrastinationTime: 0,
      focusTime: 0,
      lastActiveTab: null,
      activeTabStartTime: Date.now(),
      currentTask: task
    };

    // Store current task
    await chrome.storage.local.set({
      currentSession: this.currentSession,
      currentTask: task,
      focusSessionStarted: Date.now()
    });

    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Focus Session Started',
      message: task ? `Working on: ${task}` : 'Focus session is active'
    });

    console.log('Focus session started:', task);
  }

  recordWindowEvent(event) {
    // Track window focus/blur for attention analysis
    chrome.storage.local.get(['windowEvents']).then(storage => {
      const events = storage.windowEvents || [];
      events.push({ event, timestamp: Date.now() });

      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }

      chrome.storage.local.set({ windowEvents: events });
    });
  }

  async updateSessionStats() {
    await chrome.storage.local.set({
      currentSession: this.currentSession,
      lastUpdate: Date.now()
    });
  }

  async syncWithBackend() {
    try {
      const settings = await chrome.storage.sync.get(['backendUrl', 'apiKey']);

      if (settings.backendUrl && settings.apiKey) {
        const response = await fetch(`${settings.backendUrl}/api/browser-activity`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
          },
          body: JSON.stringify({
            session: this.currentSession,
            timestamp: Date.now()
          })
        });

        if (response.ok) {
          console.log('Successfully synced with Proactivity backend');
        }
      }
    } catch (error) {
      console.log('Backend sync failed (this is ok for offline use):', error);
    }
  }

  // System-level notifications
  async showSystemNotification(title, message, type = 'info') {
    const options = {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: title,
      message: message,
      priority: type === 'warning' || type === 'blocking' ? 2 : 1,
      requireInteraction: type === 'blocking'
    };

    // Add action buttons for certain types
    if (type === 'blocking') {
      options.buttons = [
        { title: 'View Tasks' },
        { title: 'Settings' }
      ];
    }

    try {
      const notificationId = `proactivity-${type}-${Date.now()}`;
      await chrome.notifications.create(notificationId, options);
      
      // Handle button clicks
      if (options.buttons) {
        chrome.notifications.onButtonClicked.addListener((notifId, buttonIndex) => {
          if (notifId === notificationId) {
            if (buttonIndex === 0) {
              // View Tasks
              chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
            } else if (buttonIndex === 1) {
              // Settings
              chrome.runtime.openOptionsPage();
            }
          }
        });
      }

      // Auto-clear notification after delay
      if (type !== 'blocking') {
        setTimeout(() => {
          chrome.notifications.clear(notificationId);
        }, 8000);
      }

    } catch (error) {
      console.error('Error showing system notification:', error);
    }
  }

  // Get urgent tasks for popup display
  async getUrgentTasks() {
    try {
      const data = await chrome.storage.local.get(['tasks']);
      const tasks = data.tasks || [];
      
      // Filter and sort tasks by urgency
      const urgentTasks = tasks
        .filter(task => !task.completed)
        .map(task => ({
          ...task,
          urgencyScore: this.calculateUrgencyScore(task)
        }))
        .sort((a, b) => b.urgencyScore - a.urgencyScore)
        .slice(0, 5);

      return urgentTasks;
    } catch (error) {
      console.error('Error getting urgent tasks:', error);
      return [];
    }
  }

  calculateUrgencyScore(task) {
    let score = 0;
    
    // Priority weight
    const priorityWeights = { high: 50, medium: 30, low: 10 };
    score += priorityWeights[task.priority] || 20;
    
    // Age weight (older tasks get higher score)
    const daysSinceCreated = (Date.now() - new Date(task.createdAt)) / (1000 * 60 * 60 * 24);
    score += Math.min(daysSinceCreated * 5, 30); // Max 30 points for age
    
    // Energy level match (tasks matching current energy get bonus)
    if (task.energyLevel === this.currentEnergyLevel) {
      score += 15;
    }
    
    // Estimated time bonus (shorter tasks get slight preference)
    if (task.estimatedMinutes && task.estimatedMinutes <= 30) {
      score += 10;
    }
    
    return score;
  }

  testEnforcementMechanism() {
    this.showSystemNotification(
      'Enforcement Test',
      'This is a test of the system-level notification system',
      'warning'
    );
  }
}

// Initialize the background service
const proactivityService = new ProactivityBackgroundService();