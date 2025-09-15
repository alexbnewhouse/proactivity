import cron from 'node-cron';
import { NotificationUrgency, EnergyLevel, ADHDPattern } from '../../shared/types.js';

/**
 * Proactive notification service specifically designed for ADHD users
 * Based on research showing ADHD brains benefit from external structure and gentle prompting
 */
class ProactiveNotificationService {
  constructor(patternService, userPreferences = {}) {
    this.patternService = patternService;
    this.userPreferences = {
      maxDailyNotifications: 12,
      quietHours: { start: 22, end: 8 }, // 10 PM to 8 AM
      preferredBreakInterval: 25, // Pomodoro-style
      energyCheckInterval: 120, // 2 hours
      procrastinationThreshold: 30, // minutes
      hyperfocusBreakWarning: 90, // minutes
      ...userPreferences
    };

    this.activeNotifications = new Map();
    this.notificationHistory = [];
    this.dailyNotificationCount = 0;
    this.lastResetDate = new Date().toDateString();

    this.initializeSchedulers();
  }

  /**
   * Initialize proactive notification schedulers
   */
  initializeSchedulers() {
    // Reset daily notification count at midnight
    cron.schedule('0 0 * * *', () => {
      this.resetDailyCount();
    });

    // Energy level check every 2 hours during active hours
    cron.schedule('0 */2 8-22 * * *', () => {
      this.checkEnergyLevel();
    });

    // Gentle productivity check every 30 minutes
    cron.schedule('*/30 8-22 * * *', () => {
      this.gentleProductivityCheck();
    });

    // Procrastination intervention check every 15 minutes
    cron.schedule('*/15 8-22 * * *', () => {
      this.checkForProcrastination();
    });

    // Hyperfocus protection check every 30 minutes
    cron.schedule('*/30 * * * *', () => {
      this.checkForHyperfocus();
    });

    // End-of-day reflection
    cron.schedule('0 21 * * *', () => {
      this.triggerEndOfDayReflection();
    });
  }

  /**
   * Send a proactive notification with ADHD-friendly characteristics
   */
  async sendNotification(notification) {
    if (!this.shouldSendNotification(notification)) {
      return false;
    }

    const enhancedNotification = this.enhanceForADHD(notification);
    const result = await this.deliverNotification(enhancedNotification);

    if (result.success) {
      this.trackNotification(enhancedNotification);
      this.dailyNotificationCount++;
    }

    return result;
  }

  /**
   * Check if notification should be sent based on ADHD-friendly criteria
   */
  shouldSendNotification(notification) {
    // Check daily limit to prevent overwhelm
    if (this.dailyNotificationCount >= this.userPreferences.maxDailyNotifications) {
      return false;
    }

    // Check quiet hours
    const currentHour = new Date().getHours();
    const { start: quietStart, end: quietEnd } = this.userPreferences.quietHours;

    if (
      notification.urgency !== NotificationUrgency.CRITICAL &&
      (currentHour >= quietStart || currentHour <= quietEnd)
    ) {
      return false;
    }

    // Check recent notification frequency to avoid spam
    const recentNotifications = this.notificationHistory.filter(
      n => new Date() - new Date(n.timestamp) < 15 * 60 * 1000 // Last 15 minutes
    );

    if (recentNotifications.length >= 2 && notification.urgency !== NotificationUrgency.HIGH) {
      return false;
    }

    // Check if user is in hyperfocus state (only allow supportive notifications)
    if (this.isUserInHyperfocus() && !notification.hyperfocusCompatible) {
      return false;
    }

    return true;
  }

  /**
   * Enhance notification with ADHD-friendly characteristics
   */
  enhanceForADHD(notification) {
    return {
      ...notification,
      // Add visual and emotional elements
      tone: this.getADHDFriendlyTone(notification.urgency),
      actionability: this.makeActionable(notification.message),
      timeContext: this.addTimeContext(notification),
      motivationalElement: this.addMotivation(notification),
      cognitiveLoad: this.calculateCognitiveLoad(notification),

      // ADHD-specific metadata
      stimulationLevel: this.calculateStimulationLevel(notification),
      executiveFunctionDemand: this.assessExecutiveFunctionDemand(notification),
      procrastinationRisk: this.assessProcrastinationRisk(notification)
    };
  }

  /**
   * Get ADHD-friendly tone for notifications
   */
  getADHDFriendlyTone(urgency) {
    const tones = {
      [NotificationUrgency.LOW]: {
        style: 'gentle_suggestion',
        examples: ['Just a thought...', 'When you\'re ready...', 'No pressure, but...']
      },
      [NotificationUrgency.MEDIUM]: {
        style: 'encouraging_reminder',
        examples: ['You\'ve got this!', 'Quick check-in:', 'Friendly reminder:']
      },
      [NotificationUrgency.HIGH]: {
        style: 'supportive_urgent',
        examples: ['Hey, this is important:', 'Time-sensitive:', 'Let\'s tackle this:']
      },
      [NotificationUrgency.CRITICAL]: {
        style: 'calm_intervention',
        examples: ['I\'m here to help:', 'Let\'s break this down:', 'Together we can:']
      }
    };

    const toneConfig = tones[urgency] || tones[NotificationUrgency.MEDIUM];
    const example = toneConfig.examples[Math.floor(Math.random() * toneConfig.examples.length)];

    return {
      style: toneConfig.style,
      prefix: example,
      emotional_tone: this.getEmotionalTone(urgency)
    };
  }

  /**
   * Make notification actionable with clear next steps
   */
  makeActionable(message) {
    return {
      originalMessage: message,
      actionPrompt: this.extractActionPrompt(message),
      nextSteps: this.generateNextSteps(message),
      timeEstimate: this.estimateTimeRequired(message),
      difficultyLevel: this.assessDifficulty(message)
    };
  }

  /**
   * Add time context to help with time blindness
   */
  addTimeContext(notification) {
    const now = new Date();
    return {
      currentTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timeOfDay: this.getTimeOfDayContext(now),
      relativeTime: this.getRelativeTimeContext(notification),
      energyOptimal: this.isOptimalEnergyTime(now)
    };
  }

  /**
   * Add motivational element based on ADHD research
   */
  addMotivation(notification) {
    const motivationTypes = [
      'progress_acknowledgment',
      'effort_recognition',
      'capability_affirmation',
      'future_benefit',
      'social_connection'
    ];

    const type = motivationTypes[Math.floor(Math.random() * motivationTypes.length)];

    const motivationMessages = {
      progress_acknowledgment: [
        'Look how far you\'ve come!',
        'Every step counts.',
        'You\'re making progress, even when it doesn\'t feel like it.'
      ],
      effort_recognition: [
        'I see how hard you\'re working.',
        'Your effort matters.',
        'You\'re doing difficult things.'
      ],
      capability_affirmation: [
        'You have everything you need to succeed.',
        'You\'ve handled tough things before.',
        'Your brain works differently, and that\'s a strength.'
      ],
      future_benefit: [
        'Your future self will thank you.',
        'This brings you closer to your goal.',
        'Small actions create big changes.'
      ],
      social_connection: [
        'You\'re not alone in this.',
        'Other PhD students feel this way too.',
        'I\'m here to support you.'
      ]
    };

    const messages = motivationMessages[type];
    return {
      type,
      message: messages[Math.floor(Math.random() * messages.length)],
      timing: 'append' // Add at end of notification
    };
  }

  /**
   * Proactive checks and interventions
   */

  async checkEnergyLevel() {
    const notification = {
      id: `energy_check_${Date.now()}`,
      type: 'energy_assessment',
      urgency: NotificationUrgency.LOW,
      message: 'Quick energy check: How are you feeling right now?',
      actions: [
        { label: 'High energy ⚡', value: EnergyLevel.HIGH },
        { label: 'Moderate 🔋', value: EnergyLevel.MODERATE },
        { label: 'Low energy 🪫', value: EnergyLevel.LOW },
        { label: 'Depleted 😴', value: EnergyLevel.DEPLETED }
      ],
      hyperfocusCompatible: false,
      callback: this.handleEnergyLevelResponse.bind(this)
    };

    return this.sendNotification(notification);
  }

  async gentleProductivityCheck() {
    if (this.isUserActive()) {
      return; // User is already active, no need to check
    }

    const notification = {
      id: `productivity_check_${Date.now()}`,
      type: 'gentle_check_in',
      urgency: NotificationUrgency.LOW,
      message: 'How\'s your focus today? Any dissertation goals you\'d like to tackle?',
      actions: [
        { label: 'Working on something', value: 'active' },
        { label: 'Need help starting', value: 'need_help' },
        { label: 'Taking a break', value: 'break' },
        { label: 'Done for today', value: 'finished' }
      ],
      hyperfocusCompatible: false,
      callback: this.handleProductivityResponse.bind(this)
    };

    return this.sendNotification(notification);
  }

  async checkForProcrastination() {
    const procrastinationIndicators = await this.detectProcrastinationIndicators();

    if (procrastinationIndicators.likelihood > 0.7) {
      const intervention = this.patternService.getInterventionsForPattern(
        ADHDPattern.PROCRASTINATION,
        procrastinationIndicators.likelihood
      )[0];

      const notification = {
        id: `procrastination_intervention_${Date.now()}`,
        type: 'pattern_intervention',
        urgency: NotificationUrgency.HIGH,
        message: intervention?.message || 'I notice you might be stuck. Let\'s break this down together.',
        pattern: ADHDPattern.PROCRASTINATION,
        intervention,
        actions: [
          { label: 'Break it down', value: 'breakdown_task' },
          { label: 'Change environment', value: 'change_environment' },
          { label: 'Start with 2 minutes', value: 'two_minute_rule' },
          { label: 'Not now', value: 'dismiss' }
        ],
        hyperfocusCompatible: false,
        callback: this.handleProcrastinationIntervention.bind(this)
      };

      return this.sendNotification(notification);
    }
  }

  async checkForHyperfocus() {
    const hyperfocusIndicators = await this.detectHyperfocusIndicators();

    if (hyperfocusIndicators.likelihood > 0.8) {
      const workDuration = hyperfocusIndicators.workDuration;

      if (workDuration > this.userPreferences.hyperfocusBreakWarning) {
        const notification = {
          id: `hyperfocus_protection_${Date.now()}`,
          type: 'health_protection',
          urgency: NotificationUrgency.MEDIUM,
          message: `You've been in the zone for ${Math.floor(workDuration / 60)} hours! Time for a quick health check.`,
          actions: [
            { label: 'Quick break ☕', value: 'short_break' },
            { label: 'Keep going 5 more min', value: 'continue_5' },
            { label: 'Find stopping point', value: 'find_stopping_point' }
          ],
          hyperfocusCompatible: true,
          urgentHealthCare: true,
          callback: this.handleHyperfocusProtection.bind(this)
        };

        return this.sendNotification(notification);
      }
    }
  }

  async triggerEndOfDayReflection() {
    const notification = {
      id: `end_of_day_${Date.now()}`,
      type: 'reflection',
      urgency: NotificationUrgency.LOW,
      message: 'Day\'s winding down. How did your dissertation work go today?',
      actions: [
        { label: 'Great progress! 🎉', value: 'great' },
        { label: 'Some progress 👍', value: 'some' },
        { label: 'Struggled today 😔', value: 'struggled' },
        { label: 'Didn\'t work on it', value: 'none' }
      ],
      hyperfocusCompatible: false,
      callback: this.handleEndOfDayReflection.bind(this)
    };

    return this.sendNotification(notification);
  }

  // Response handlers
  async handleEnergyLevelResponse(response) {
    const energyLevel = response.value;

    // Store energy level for future task suggestions
    await this.updateUserEnergyLevel(energyLevel);

    // Suggest appropriate tasks based on energy level
    if (energyLevel === EnergyLevel.LOW || energyLevel === EnergyLevel.DEPLETED) {
      return this.suggestLowEnergyTasks();
    } else if (energyLevel === EnergyLevel.HIGH || energyLevel === EnergyLevel.HYPERFOCUS) {
      return this.suggestHighEnergyTasks();
    }
  }

  async handleProductivityResponse(response) {
    switch (response.value) {
      case 'need_help':
        return this.offerTaskSuggestions();
      case 'break':
        return this.acknowledgeBreak();
      case 'finished':
        return this.celebrateCompletion();
      default:
        return this.encourageCurrentWork();
    }
  }

  async handleProcrastinationIntervention(response) {
    switch (response.value) {
      case 'breakdown_task':
        return this.initiateTaskBreakdown();
      case 'change_environment':
        return this.suggestEnvironmentChange();
      case 'two_minute_rule':
        return this.initiateTwoMinuteRule();
      default:
        return this.respectUserChoice();
    }
  }

  async handleHyperfocusProtection(response) {
    switch (response.value) {
      case 'short_break':
        return this.guideShortBreak();
      case 'continue_5':
        return this.setFiveMinuteTimer();
      case 'find_stopping_point':
        return this.helpFindStoppingPoint();
    }
  }

  async handleEndOfDayReflection(response) {
    const reflection = await this.processReflection(response.value);
    return this.provideEncouragementAndTomorrowPlanning(reflection);
  }

  // Utility methods

  resetDailyCount() {
    const today = new Date().toDateString();
    if (this.lastResetDate !== today) {
      this.dailyNotificationCount = 0;
      this.lastResetDate = today;
    }
  }

  isUserInHyperfocus() {
    // Check recent activity patterns to determine if user is in hyperfocus
    return this.detectHyperfocusIndicators().then(indicators => indicators.likelihood > 0.8);
  }

  isUserActive() {
    // Check if user has been active in the last 30 minutes
    const lastActivity = this.getLastActivityTimestamp();
    return lastActivity && (new Date() - lastActivity) < 30 * 60 * 1000;
  }

  async detectProcrastinationIndicators() {
    // Integration point with pattern detection
    return {
      likelihood: 0.5, // Placeholder
      indicators: [],
      duration: 0
    };
  }

  async detectHyperfocusIndicators() {
    return {
      likelihood: 0.3, // Placeholder
      workDuration: 0,
      indicators: []
    };
  }

  getLastActivityTimestamp() {
    // Placeholder - would integrate with activity tracking
    return new Date();
  }

  trackNotification(notification) {
    this.notificationHistory.push({
      ...notification,
      timestamp: new Date().toISOString(),
      delivered: true
    });

    // Keep only last 100 notifications
    if (this.notificationHistory.length > 100) {
      this.notificationHistory = this.notificationHistory.slice(-100);
    }
  }

  async deliverNotification(notification) {
    // Placeholder for actual delivery mechanism
    console.log('📧 ProActive Notification:', notification);

    return {
      success: true,
      deliveryMethod: 'system',
      timestamp: new Date().toISOString()
    };
  }

  // Additional utility methods for notification enhancement
  calculateCognitiveLoad(notification) {
    let load = 1; // Base load

    if (notification.actions && notification.actions.length > 4) load += 1;
    if (notification.message.length > 100) load += 1;
    if (notification.urgency === NotificationUrgency.CRITICAL) load += 2;

    return Math.min(load, 5); // Cap at 5
  }

  calculateStimulationLevel(notification) {
    // ADHD brains need optimal stimulation
    if (notification.urgency === NotificationUrgency.HIGH) return 'high';
    if (notification.type === 'gentle_check_in') return 'low';
    return 'medium';
  }

  assessExecutiveFunctionDemand(notification) {
    const demands = [];

    if (notification.actions && notification.actions.length > 2) {
      demands.push('decision_making');
    }
    if (notification.timeContext) {
      demands.push('time_management');
    }
    if (notification.pattern) {
      demands.push('self_awareness');
    }

    return demands;
  }

  assessProcrastinationRisk(notification) {
    if (notification.urgency === NotificationUrgency.LOW) return 'high';
    if (notification.type === 'pattern_intervention') return 'low';
    return 'medium';
  }

  getEmotionalTone(urgency) {
    const tones = {
      [NotificationUrgency.LOW]: 'calm_supportive',
      [NotificationUrgency.MEDIUM]: 'encouraging_optimistic',
      [NotificationUrgency.HIGH]: 'focused_determined',
      [NotificationUrgency.CRITICAL]: 'compassionate_grounding'
    };
    return tones[urgency] || 'neutral';
  }

  extractActionPrompt(message) {
    // Simple extraction - in real implementation, would use NLP
    if (message.includes('?')) {
      return message.split('?')[0] + '?';
    }
    return 'What would you like to do?';
  }

  generateNextSteps(message) {
    // Placeholder - would generate contextual next steps
    return [
      'Click on an action below',
      'Take a moment to consider your options',
      'Choose what feels right for now'
    ];
  }

  estimateTimeRequired(message) {
    // Simple heuristic
    return '2-5 minutes';
  }

  assessDifficulty(message) {
    return 'low'; // Most notifications should be low difficulty
  }

  getTimeOfDayContext(now) {
    const hour = now.getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }

  getRelativeTimeContext(notification) {
    // Placeholder for relative time context
    return 'now';
  }

  isOptimalEnergyTime(now) {
    // Most people with ADHD have better focus in morning
    const hour = now.getHours();
    return hour >= 9 && hour <= 11;
  }
}

export default ProactiveNotificationService;