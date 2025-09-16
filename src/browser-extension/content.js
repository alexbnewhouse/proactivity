// Proactivity Content Script - Injected into all web pages
// Provides gentle interventions and task reminders

class ProactivityContentScript {
  constructor() {
    this.isProactivityPage = window.location.hostname.includes('proactivity');
    this.interventionActive = false;
    this.pageLoadTime = Date.now();
    this.morningPlanningRequired = false;
    this.spectrumLevel = 1;
    this.hijackActive = false;
    this.morningPlanningStartTime = null;

    this.init();
  }

  init() {
    // Check if we're in a valid frame for script execution
    if (window.top !== window.self) {
      // We're in an iframe, skip initialization
      return;
    }

    // Check if document is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
      return;
    }

    this.setupMessageListener();
    this.checkMorningPlanningStatus();

    // Don't interfere with Proactivity's own pages unless morning planning is required
    if (this.isProactivityPage && !this.morningPlanningRequired) return;

    // Don't interfere with special browser pages
    if (this.isSpecialPage()) return;

    this.detectPageContent();
    this.startTimeTracking();
  }

  setupMessageListener() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'showIntervention':
          this.showIntervention(request.type, request.data);
          break;
        case 'hideIntervention':
          this.hideIntervention();
          break;
        case 'getPageContext':
          sendResponse(this.getPageContext());
          break;
        case 'activateMorningPlanning':
          this.activateMorningPlanningMode(request.spectrumLevel);
          break;
        case 'deactivateMorningPlanning':
          this.deactivateMorningPlanningMode();
          break;
        case 'escalateSpectrum':
          this.escalateSpectrumLevel(request.level);
          break;
      }
    });
  }

  isSpecialPage() {
    const url = window.location.href;
    const specialPages = [
      'chrome://', 'chrome-extension://', 'moz-extension://', 'vivaldi://',
      'about:', 'file://', 'data:', 'javascript:', 'blob:'
    ];

    return specialPages.some(prefix => url.startsWith(prefix));
  }

  async checkMorningPlanningStatus() {
    try {
      // Don't check status on special pages
      if (this.isSpecialPage()) return;

      // Check with backend if morning planning is required
      const response = await fetch('http://localhost:3001/api/morning-planning/status', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.required) {
          this.morningPlanningRequired = true;
          this.spectrumLevel = data.spectrumLevel || 1;
          this.activateMorningPlanningMode(this.spectrumLevel);
        }
      }
    } catch (error) {
      console.log('Could not check morning planning status:', error);
    }
  }

  activateMorningPlanningMode(spectrumLevel) {
    this.morningPlanningRequired = true;
    this.spectrumLevel = spectrumLevel;
    this.morningPlanningStartTime = this.morningPlanningStartTime || Date.now();

    // Apply hijacking based on spectrum level
    if (spectrumLevel >= 5) {
      this.applyHijackMeasures();
    } else {
      this.showMorningPlanningReminder();
    }
  }

  applyHijackMeasures() {
    if (this.hijackActive) return;
    this.hijackActive = true;

    // Create overlay based on spectrum level
    if (this.spectrumLevel >= 10) {
      this.createFullScreenOverlay();
    } else if (this.spectrumLevel >= 8) {
      this.createPartialOverlay();
    } else if (this.spectrumLevel >= 5) {
      this.createBannerOverlay();
    }

    // Block certain interactions
    this.blockScrolling();
    this.blockClicks();
    this.blockKeyboardShortcuts();
  }

  createFullScreenOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'proactivity-morning-hijack';
    overlay.className = 'proactivity-hijack-fullscreen';
    overlay.innerHTML = `
      <div class="hijack-content spectrum-${this.spectrumLevel}">
        <div class="hijack-icon">☠️</div>
        <h1>COMPUTER HIJACKED</h1>
        <h2>Morning Planning Required</h2>
        <p>Your computer is completely locked until you complete your daily planning.</p>
        <p>This is necessary to break the procrastination cycle and build productive habits.</p>
        <div class="hijack-timer">
          Time locked: <span id="hijack-timer">${this.getElapsedTime()}</span>
        </div>
        <button class="hijack-btn primary" onclick="window.openMorningPlanning()">
          🌅 Complete Morning Planning
        </button>
        <div class="hijack-explanation">
          <h3>Why is this happening?</h3>
          <ul>
            <li>You've delayed planning for ${Math.floor((Date.now() - this.morningPlanningStartTime) / 60000)} minutes</li>
            <li>ADHD brains need structure to avoid overwhelm</li>
            <li>Planning prevents decision paralysis and task-switching</li>
            <li>This enforcement helps build the planning habit</li>
          </ul>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.startHijackTimer();
  }

  createPartialOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'proactivity-morning-hijack';
    overlay.className = 'proactivity-hijack-partial';
    overlay.innerHTML = `
      <div class="hijack-content spectrum-${this.spectrumLevel}">
        <div class="hijack-icon">🚨</div>
        <h2>SERIOUS: Morning Planning Required</h2>
        <p>Your browsing is now restricted. Complete planning to restore full access.</p>
        <div class="hijack-actions">
          <button class="hijack-btn primary" onclick="window.openMorningPlanning()">
            🌅 Complete Planning
          </button>
          <button class="hijack-btn secondary" onclick="window.requestBypass()">
            Request Emergency Bypass
          </button>
        </div>
        <div class="blocked-content-notice">
          Most website interactions are blocked until planning is complete.
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.dimPageContent();
  }

  createBannerOverlay() {
    const banner = document.createElement('div');
    banner.id = 'proactivity-morning-hijack';
    banner.className = 'proactivity-hijack-banner';
    banner.innerHTML = `
      <div class="hijack-content spectrum-${this.spectrumLevel}">
        <div class="hijack-icon">⚠️</div>
        <div class="hijack-message">
          <strong>Morning Planning Required</strong> - Complete your daily plan to remove restrictions
        </div>
        <button class="hijack-btn" onclick="window.openMorningPlanning()">
          🌅 Plan Now
        </button>
      </div>
    `;

    document.body.appendChild(banner);
    this.addBannerPulse();
  }

  blockScrolling() {
    if (this.spectrumLevel >= 7) {
      document.body.style.overflow = 'hidden';
    }
  }

  blockClicks() {
    if (this.spectrumLevel >= 6) {
      this.clickBlocker = (e) => {
        if (!e.target.closest('#proactivity-morning-hijack')) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };
      document.addEventListener('click', this.clickBlocker, true);
    }
  }

  blockKeyboardShortcuts() {
    if (this.spectrumLevel >= 8) {
      this.keyBlocker = (e) => {
        // Block common shortcuts except morning planning related
        const blockedKeys = ['t', 'n', 'w', 'l', 'r', 'f', 'i'];
        if ((e.ctrlKey || e.metaKey) && blockedKeys.includes(e.key.toLowerCase())) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };
      document.addEventListener('keydown', this.keyBlocker, true);
    }
  }

  showMorningPlanningReminder() {
    this.showIntervention('morning-planning', {
      spectrumLevel: this.spectrumLevel,
      elapsedTime: this.getElapsedTime()
    });
  }

  deactivateMorningPlanningMode() {
    this.morningPlanningRequired = false;
    this.hijackActive = false;
    this.spectrumLevel = 1;

    // Remove overlay
    const hijack = document.getElementById('proactivity-morning-hijack');
    if (hijack) hijack.remove();

    // Restore page functionality
    document.body.style.overflow = '';
    if (this.clickBlocker) {
      document.removeEventListener('click', this.clickBlocker, true);
    }
    if (this.keyBlocker) {
      document.removeEventListener('keydown', this.keyBlocker, true);
    }

    this.hideIntervention();
  }

  escalateSpectrumLevel(newLevel) {
    const oldLevel = this.spectrumLevel;
    this.spectrumLevel = newLevel;

    if (newLevel > oldLevel && this.morningPlanningRequired) {
      // Remove old overlay
      const hijack = document.getElementById('proactivity-morning-hijack');
      if (hijack) hijack.remove();

      // Apply new level
      this.activateMorningPlanningMode(newLevel);
    }
  }

  getElapsedTime() {
    if (!this.morningPlanningStartTime) return '0m';
    const elapsed = Math.floor((Date.now() - this.morningPlanningStartTime) / 60000);
    return elapsed < 60 ? `${elapsed}m` : `${Math.floor(elapsed / 60)}h ${elapsed % 60}m`;
  }

  startHijackTimer() {
    const timerElement = document.getElementById('hijack-timer');
    if (timerElement) {
      setInterval(() => {
        timerElement.textContent = this.getElapsedTime();
      }, 60000);
    }
  }

  dimPageContent() {
    const style = document.createElement('style');
    style.id = 'proactivity-dim-style';
    style.textContent = `
      body > *:not(#proactivity-morning-hijack) {
        filter: blur(3px) brightness(0.3);
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  addBannerPulse() {
    const style = document.createElement('style');
    style.id = 'proactivity-pulse-style';
    style.textContent = `
      @keyframes proactivity-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      .proactivity-hijack-banner {
        animation: proactivity-pulse 2s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }

  detectPageContent() {
    // Analyze page content to understand what user is doing
    const title = document.title;
    const url = window.location.href;
    const domain = window.location.hostname;

    // Detect work-related vs. entertainment content
    const workKeywords = [
      'research', 'paper', 'study', 'academic', 'thesis', 'dissertation',
      'document', 'edit', 'write', 'article', 'journal', 'conference',
      'github', 'stackoverflow', 'documentation', 'tutorial'
    ];

    const entertainmentKeywords = [
      'video', 'funny', 'meme', 'viral', 'trending', 'entertainment',
      'celebrity', 'gossip', 'game', 'sport', 'news', 'politics'
    ];

    const contentType = this.classifyContent(title + ' ' + url, workKeywords, entertainmentKeywords);

    // Send context to background script
    chrome.runtime.sendMessage({
      action: 'updatePageContext',
      context: {
        url,
        domain,
        title,
        contentType,
        timeSpent: 0,
        timestamp: Date.now()
      }
    });
  }

  classifyContent(text, workKeywords, entertainmentKeywords) {
    const lowerText = text.toLowerCase();

    const workScore = workKeywords.reduce((score, keyword) => {
      return score + (lowerText.includes(keyword) ? 1 : 0);
    }, 0);

    const entertainmentScore = entertainmentKeywords.reduce((score, keyword) => {
      return score + (lowerText.includes(keyword) ? 1 : 0);
    }, 0);

    if (workScore > entertainmentScore) return 'work';
    if (entertainmentScore > workScore) return 'entertainment';
    return 'neutral';
  }

  startTimeTracking() {
    // Track how long user spends on this page
    let timeSpent = 0;
    const interval = setInterval(() => {
      timeSpent += 1000; // 1 second

      // Send periodic updates to background script
      if (timeSpent % 30000 === 0) { // Every 30 seconds
        chrome.runtime.sendMessage({
          action: 'updateTimeSpent',
          timeSpent,
          url: window.location.href
        });
      }
    }, 1000);

    // Clean up when page is unloaded
    window.addEventListener('beforeunload', () => {
      clearInterval(interval);
      chrome.runtime.sendMessage({
        action: 'pageUnload',
        timeSpent,
        url: window.location.href
      });
    });
  }

  showIntervention(type, data) {
    if (this.interventionActive) return;
    this.interventionActive = true;

    const intervention = this.createInterventionElement(type, data);
    document.body.appendChild(intervention);

    // Add smooth entrance animation
    setTimeout(() => {
      intervention.classList.add('proactivity-visible');
    }, 100);
  }

  createInterventionElement(type, data) {
    const intervention = document.createElement('div');
    intervention.className = 'proactivity-intervention';
    intervention.id = 'proactivity-intervention';

    switch (type) {
      case 'procrastination':
        intervention.innerHTML = this.createProcrastinationIntervention(data);
        break;
      case 'tab-switching':
        intervention.innerHTML = this.createTabSwitchingIntervention(data);
        break;
      case 'hyperfocus':
        intervention.innerHTML = this.createHyperfocusIntervention(data);
        break;
      case 'task-reminder':
        intervention.innerHTML = this.createTaskReminderIntervention(data);
        break;
      case 'morning-planning':
        intervention.innerHTML = this.createMorningPlanningIntervention(data);
        break;
    }

    return intervention;
  }

  createProcrastinationIntervention(data) {
    return `
      <div class="proactivity-modal procrastination">
        <div class="proactivity-icon">🌱</div>
        <h3>Gentle nudge</h3>
        <p>Hey! You've been browsing for a little while.</p>
        <p>No judgment at all - want to check what you were planning to work on?</p>
        <div class="proactivity-actions">
          <button class="proactivity-btn primary" onclick="this.handleReturnToTasks()">
            Show my tasks
          </button>
          <button class="proactivity-btn secondary" onclick="this.handleSnooze(5)">
            5 more minutes
          </button>
          <button class="proactivity-btn tertiary" onclick="this.handleDismiss()">
            This is my break time
          </button>
        </div>
        <div class="proactivity-progress">
          <div class="proactivity-timer" data-duration="10"></div>
        </div>
      </div>
    `;
  }

  createTabSwitchingIntervention(data) {
    return `
      <div class="proactivity-modal tab-switching">
        <div class="proactivity-icon">🧠</div>
        <h3>Your ADHD brain is active!</h3>
        <p>I noticed you're switching between tasks - totally normal and okay!</p>
        <p>Want to pick one thing to focus on for just 10 minutes?</p>
        <div class="proactivity-actions">
          <button class="proactivity-btn primary" onclick="this.handleStartFocus()">
            Start 10-minute focus
          </button>
          <button class="proactivity-btn secondary" onclick="this.handleTaskBreakdown()">
            Break down my task first
          </button>
          <button class="proactivity-btn tertiary" onclick="this.handleDismiss()">
            I'm just exploring right now
          </button>
        </div>
      </div>
    `;
  }

  createHyperfocusIntervention(data) {
    return `
      <div class="proactivity-modal hyperfocus">
        <div class="proactivity-icon">⭐</div>
        <h3>Amazing focus session!</h3>
        <p>You've been working intensely for ${Math.round(data.duration / 60)} minutes.</p>
        <p>Your brain has earned a small break to maintain this great momentum!</p>
        <div class="proactivity-actions">
          <button class="proactivity-btn primary" onclick="this.handleTakeBreak()">
            Take a 5-minute break
          </button>
          <button class="proactivity-btn secondary" onclick="this.handleSnooze(15)">
            15 more minutes first
          </button>
          <button class="proactivity-btn tertiary" onclick="this.handleDismiss()">
            I'm in the zone
          </button>
        </div>
        <div class="proactivity-wellness-tip">
          💡 Tip: Stretch, hydrate, or do some deep breathing
        </div>
      </div>
    `;
  }

  createTaskReminderIntervention(data) {
    return `
      <div class="proactivity-modal task-reminder">
        <div class="proactivity-icon">📋</div>
        <h3>Task reminder</h3>
        <p>You had planned to work on: <strong>${data.task}</strong></p>
        <p>Want to continue with this, or update your focus?</p>
        <div class="proactivity-actions">
          <button class="proactivity-btn primary" onclick="this.handleContinueTask()">
            Continue this task
          </button>
          <button class="proactivity-btn secondary" onclick="this.handleChangeTask()">
            Switch to different task
          </button>
          <button class="proactivity-btn tertiary" onclick="this.handleDismiss()">
            Clear reminder
          </button>
        </div>
      </div>
    `;
  }

  createMorningPlanningIntervention(data) {
    const levelMessages = {
      1: { icon: '🌅', title: 'Morning Planning Time', tone: 'gentle' },
      2: { icon: '📋', title: 'Planning Recommended', tone: 'encouraging' },
      3: { icon: '⚠️', title: 'Planning Required', tone: 'firm' },
      4: { icon: '🚨', title: 'Planning Seriously Needed', tone: 'urgent' }
    };

    const level = Math.min(data.spectrumLevel, 4);
    const config = levelMessages[level];

    return `
      <div class="proactivity-modal morning-planning ${config.tone}">
        <div class="proactivity-icon">${config.icon}</div>
        <h3>${config.title}</h3>
        <p>Hi! It's time to plan your day to set yourself up for success.</p>
        ${level >= 3 ?
          `<p class="urgency-notice">You've been avoiding planning for ${data.elapsedTime}. This is making your day harder than it needs to be.</p>` :
          '<p>Planning helps your ADHD brain stay focused and reduces overwhelm.</p>'
        }
        <div class="proactivity-actions">
          <button class="proactivity-btn primary" onclick="window.openMorningPlanning()">
            🌅 Start Planning (5-10 min)
          </button>
          ${level <= 2 ?
            `<button class="proactivity-btn secondary" onclick="window.handleSnooze(15)">
              15 more minutes
            </button>` : ''
          }
          <button class="proactivity-btn tertiary" onclick="this.handleDismiss()">
            ${level >= 3 ? 'I understand the consequences' : 'Maybe later'}
          </button>
        </div>
        <div class="planning-benefits">
          <h4>Quick planning will help you:</h4>
          <ul>
            <li>🎯 Know exactly what to work on</li>
            <li>⚡ Match tasks to your energy level</li>
            <li>🧠 Prevent decision paralysis</li>
            <li>🏆 Feel accomplished at day's end</li>
          </ul>
        </div>
      </div>
    `;
  }

  hideIntervention() {
    const intervention = document.getElementById('proactivity-intervention');
    if (intervention) {
      intervention.classList.add('proactivity-hiding');
      setTimeout(() => {
        intervention.remove();
        this.interventionActive = false;
      }, 300);
    }
  }

  getPageContext() {
    return {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      timeOnPage: Date.now() - this.pageLoadTime,
      scrollPosition: window.scrollY,
      visibilityState: document.visibilityState,
      isFormFocused: document.activeElement &&
                    (document.activeElement.tagName === 'INPUT' ||
                     document.activeElement.tagName === 'TEXTAREA'),
      hasVideoPlaying: Array.from(document.querySelectorAll('video')).some(v => !v.paused)
    };
  }

  // Intervention action handlers (attached to global scope for onclick)
  handleReturnToTasks() {
    chrome.runtime.sendMessage({ action: 'openTaskView' });
    this.hideIntervention();
  }

  handleSnooze(minutes) {
    chrome.runtime.sendMessage({
      action: 'snoozeInterventions',
      duration: minutes * 60 * 1000
    });
    this.hideIntervention();
  }

  handleDismiss() {
    chrome.runtime.sendMessage({ action: 'dismissIntervention' });
    this.hideIntervention();
  }

  handleStartFocus() {
    chrome.runtime.sendMessage({ action: 'startFocusSession', duration: 10 });
    this.hideIntervention();
  }

  handleTaskBreakdown() {
    chrome.runtime.sendMessage({ action: 'openTaskBreakdown' });
    this.hideIntervention();
  }

  handleTakeBreak() {
    chrome.runtime.sendMessage({ action: 'startBreak', duration: 5 });
    this.hideIntervention();
  }

  handleContinueTask() {
    chrome.runtime.sendMessage({ action: 'continueCurrentTask' });
    this.hideIntervention();
  }

  handleChangeTask() {
    chrome.runtime.sendMessage({ action: 'changeCurrentTask' });
    this.hideIntervention();
  }

  openMorningPlanning() {
    chrome.runtime.sendMessage({ action: 'openMorningPlanning' });
    // Open in new tab to avoid losing current work
    window.open('http://localhost:3000/morning-planning', '_blank');
  }

  requestBypass() {
    const reason = prompt('Emergency bypass reason (required):');
    if (reason && reason.trim()) {
      chrome.runtime.sendMessage({
        action: 'requestEmergencyBypass',
        reason: reason.trim(),
        elapsedTime: this.getElapsedTime()
      });
    }
  }
}

// Attach action handlers to global scope for onclick events
window.handleReturnToTasks = () => proactivityContent.handleReturnToTasks();
window.handleSnooze = (minutes) => proactivityContent.handleSnooze(minutes);
window.handleDismiss = () => proactivityContent.handleDismiss();
window.handleStartFocus = () => proactivityContent.handleStartFocus();
window.handleTaskBreakdown = () => proactivityContent.handleTaskBreakdown();
window.handleTakeBreak = () => proactivityContent.handleTakeBreak();
window.handleContinueTask = () => proactivityContent.handleContinueTask();
window.handleChangeTask = () => proactivityContent.handleChangeTask();
window.openMorningPlanning = () => proactivityContent.openMorningPlanning();
window.requestBypass = () => proactivityContent.requestBypass();

// Initialize content script
const proactivityContent = new ProactivityContentScript();