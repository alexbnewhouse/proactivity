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

    this.setupEventListeners();
    this.startMonitoring();
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

    if (tab.active) {
      await this.analyzeTabForProcrastination(tab);
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
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: this.showTabSwitchingOverlay
      });
    }
  }

  async triggerProcrastinationIntervention(tab) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: this.showProcrastinationOverlay,
      args: [this.extractDomain(tab.url)]
    });
  }

  async checkForHyperfocus() {
    const settings = await chrome.storage.sync.get(['hyperfocusProtection']);

    if (settings.hyperfocusProtection !== false) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: this.showHyperfocusReminder
        });
      }
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
}

// Initialize the background service
const proactivityService = new ProactivityBackgroundService();