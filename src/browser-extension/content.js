// Proactivity Content Script - Injected into all web pages
// Provides gentle interventions and task reminders

class ProactivityContentScript {
  constructor() {
    this.isProactivityPage = window.location.hostname.includes('proactivity');
    this.interventionActive = false;
    this.pageLoadTime = Date.now();

    this.init();
  }

  init() {
    // Don't interfere with Proactivity's own pages
    if (this.isProactivityPage) return;

    this.setupMessageListener();
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
      }
    });
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

// Initialize content script
const proactivityContent = new ProactivityContentScript();