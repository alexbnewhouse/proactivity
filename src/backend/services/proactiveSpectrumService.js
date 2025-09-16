import { EventEmitter } from 'events';
import cron from 'node-cron';

/**
 * Proactive Reach-Out Spectrum Service
 *
 * Implements a spectrum of proactive intervention levels from gentle nudges
 * to full computer hijacking for ADHD executive function support.
 *
 * Spectrum Levels:
 * 1. Whisper (1-2): Subtle notifications, easy to dismiss
 * 2. Nudge (3-4): Regular reminders with gentle persistence
 * 3. Prompt (5-6): Insistent notifications with mild consequences
 * 4. Insist (7-8): Persistent interruptions, harder to dismiss
 * 5. Hijack (9-10): Computer control until tasks completed
 */
class ProactivitySpectrumService extends EventEmitter {
  constructor(notificationService, patternService, outOfOfficeService) {
    super();

    this.notificationService = notificationService;
    this.patternService = patternService;
    this.outOfOfficeService = outOfOfficeService;

    // Current spectrum settings
    this.currentSpectrum = {
      level: 5, // Default moderate level
      morningTodoEnforcement: true,
      workdayStartTime: '09:00',
      adaptiveAdjustment: true,
      maxDailyEscalation: 8,
      emergencyBypass: true
    };

    // State tracking
    this.morningTodoStatus = {
      completed: false,
      startTime: null,
      escalationLevel: 1,
      attempts: 0,
      lastEscalation: null
    };

    // Spectrum level definitions
    this.spectrumLevels = this.initializeSpectrumLevels();

    // Active interventions
    this.activeInterventions = new Map();
    this.hijackMode = {
      active: false,
      reason: null,
      startTime: null,
      blockedApps: [],
      allowedApps: ['obsidian', 'proactivity'],
      escapeAttempts: 0
    };

    this.initializeSchedulers();
  }

  /**
   * Initialize spectrum level definitions with ADHD-specific considerations
   */
  initializeSpectrumLevels() {
    return {
      1: { // Whisper
        name: 'Whisper',
        description: 'Gentle, barely noticeable nudges',
        frequency: 'every 2 hours',
        persistence: 'single notification',
        dismissible: true,
        features: {
          notifications: 'subtle',
          sound: 'none',
          visual: 'minimal',
          interruption: 'none',
          consequences: 'none'
        },
        adhdNote: 'For high-awareness days when you just need gentle reminders'
      },

      2: { // Soft Nudge
        name: 'Soft Nudge',
        description: 'Polite reminders that respect your flow',
        frequency: 'every 90 minutes',
        persistence: 'repeat once after 30 min',
        dismissible: true,
        features: {
          notifications: 'gentle',
          sound: 'soft chime',
          visual: 'calm colors',
          interruption: 'minimal',
          consequences: 'none'
        },
        adhdNote: 'Perfect for when you have some executive function capacity'
      },

      3: { // Regular Nudge
        name: 'Regular Nudge',
        description: 'Standard proactive reminders',
        frequency: 'every hour',
        persistence: 'repeat 2-3 times',
        dismissible: true,
        features: {
          notifications: 'standard',
          sound: 'normal alert',
          visual: 'clear but not jarring',
          interruption: 'brief',
          consequences: 'tracks dismissals'
        },
        adhdNote: 'Good baseline for most days'
      },

      4: { // Firm Nudge
        name: 'Firm Nudge',
        description: 'More insistent reminders with gentle pressure',
        frequency: 'every 45 minutes',
        persistence: 'repeat until acknowledged',
        dismissible: true,
        features: {
          notifications: 'firm but supportive',
          sound: 'attention-getting',
          visual: 'more prominent',
          interruption: 'noticeable',
          consequences: 'tracks patterns, suggests spectrum adjustment'
        },
        adhdNote: 'For days when you need more external structure'
      },

      5: { // Active Prompt
        name: 'Active Prompt',
        description: 'Proactive intervention with mild consequences',
        frequency: 'every 30 minutes',
        persistence: 'escalating reminders',
        dismissible: 'with delay',
        features: {
          notifications: 'persistent',
          sound: 'escalating alerts',
          visual: 'attention-demanding',
          interruption: 'moderate',
          consequences: 'pauses non-essential apps briefly'
        },
        adhdNote: 'When procrastination patterns are detected'
      },

      6: { // Strong Prompt
        name: 'Strong Prompt',
        description: 'Insistent support with noticeable consequences',
        frequency: 'every 20 minutes',
        persistence: 'multiple escalating attempts',
        dismissible: 'requires explanation',
        features: {
          notifications: 'demanding attention',
          sound: 'urgent but not harsh',
          visual: 'unmissable',
          interruption: 'significant',
          consequences: 'limits distracting websites/apps'
        },
        adhdNote: 'For executive function crisis days'
      },

      7: { // Firm Insistence
        name: 'Firm Insistence',
        description: 'Computer becomes your accountability partner',
        frequency: 'every 15 minutes',
        persistence: 'won\'t stop until addressed',
        dismissible: 'requires task commitment',
        features: {
          notifications: 'unavoidable',
          sound: 'persistent but supportive',
          visual: 'overlay interruptions',
          interruption: 'major',
          consequences: 'blocks distracting sites, limits app usage'
        },
        adhdNote: 'When you need your computer to be your external brain'
      },

      8: { // Strong Insistence
        name: 'Strong Insistence',
        description: 'Benevolent computer control for your own good',
        frequency: 'continuous monitoring',
        persistence: 'constant gentle pressure',
        dismissible: 'only after progress',
        features: {
          notifications: 'ever-present',
          sound: 'continuous low-level reminders',
          visual: 'persistent sidebar/overlay',
          interruption: 'major',
          consequences: 'restricts access to non-work applications'
        },
        adhdNote: 'For days when your ADHD brain needs a gentle dictator'
      },

      9: { // Soft Hijack
        name: 'Soft Hijack',
        description: 'Computer prioritizes your goals over your impulses',
        frequency: 'constant',
        persistence: 'relentless but kind',
        dismissible: 'only with significant justification',
        features: {
          notifications: 'system-wide',
          sound: 'environmental',
          visual: 'interface modifications',
          interruption: 'complete',
          consequences: 'only allows work-related activities'
        },
        adhdNote: 'Emergency mode for deadline crises or executive dysfunction'
      },

      10: { // Full Hijack
        name: 'Full Hijack',
        description: 'Computer becomes your external executive function',
        frequency: 'complete control',
        persistence: 'until goals achieved',
        dismissible: 'emergency bypass only',
        features: {
          notifications: 'environmental control',
          sound: 'ambient productivity enhancement',
          visual: 'full interface control',
          interruption: 'total',
          consequences: 'computer only allows productive activities'
        },
        adhdNote: 'Nuclear option - use only when you explicitly request computer to override your ADHD brain'
      }
    };
  }

  /**
   * Set the proactive spectrum level
   */
  async setSpectrumLevel(level, options = {}) {
    if (level < 1 || level > 10) {
      throw new Error('Spectrum level must be between 1 and 10');
    }

    const previousLevel = this.currentSpectrum.level;
    this.currentSpectrum = {
      ...this.currentSpectrum,
      level,
      ...options
    };

    // If escalating to hijack levels, confirm with user
    if (level >= 9 && previousLevel < 9) {
      const confirmation = await this.requestHijackConfirmation(level);
      if (!confirmation) {
        this.currentSpectrum.level = previousLevel;
        return { success: false, reason: 'User cancelled hijack mode activation' };
      }
    }

    // Apply the new spectrum level
    await this.applySpectrumLevel(level);

    this.emit('spectrumChanged', {
      previousLevel,
      newLevel: level,
      spectrumInfo: this.spectrumLevels[level],
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      level,
      description: this.spectrumLevels[level].description,
      features: this.spectrumLevels[level].features,
      adhdNote: this.spectrumLevels[level].adhdNote
    };
  }

  /**
   * Apply spectrum level behaviors
   */
  async applySpectrumLevel(level) {
    const spectrumConfig = this.spectrumLevels[level];

    // Clear existing interventions
    this.clearActiveInterventions();

    // Apply level-specific behaviors
    if (level >= 1 && level <= 4) {
      await this.setupNotificationLevel(level);
    } else if (level >= 5 && level <= 6) {
      await this.setupPromptLevel(level);
    } else if (level >= 7 && level <= 8) {
      await this.setupInsistenceLevel(level);
    } else if (level >= 9) {
      await this.setupHijackLevel(level);
    }

    // Set up morning todo enforcement if enabled
    if (this.currentSpectrum.morningTodoEnforcement) {
      this.setupMorningTodoEnforcement();
    }
  }

  /**
   * Setup gentle notification levels (1-4)
   */
  async setupNotificationLevel(level) {
    const config = this.spectrumLevels[level];

    // Configure notification service with spectrum-appropriate settings
    await this.notificationService.updateConfiguration({
      frequency: this.parseFrequency(config.frequency),
      persistence: config.persistence,
      dismissible: config.dismissible,
      sound: config.features.sound,
      visual: config.features.visual,
      interruption: config.features.interruption
    });

    // Start gentle monitoring
    this.startGentleMonitoring(level);
  }

  /**
   * Setup prompt levels (5-6) with mild consequences
   */
  async setupPromptLevel(level) {
    const config = this.spectrumLevels[level];

    await this.setupNotificationLevel(level);

    // Add mild consequences
    if (level >= 5) {
      this.enableMildConsequences();
    }

    if (level >= 6) {
      this.enableWebsiteBlocking('distracting');
    }
  }

  /**
   * Setup insistence levels (7-8) with significant consequences
   */
  async setupInsistenceLevel(level) {
    const config = this.spectrumLevels[level];

    await this.setupPromptLevel(level);

    // Add stronger consequences
    this.enableAppRestrictions();
    this.setupPersistentOverlay(level);

    if (level >= 8) {
      this.enableContinuousMonitoring();
    }
  }

  /**
   * Setup hijack levels (9-10) with computer control
   */
  async setupHijackLevel(level) {
    console.log(`🚨 Activating Hijack Level ${level}: ${this.spectrumLevels[level].name}`);

    this.hijackMode = {
      active: true,
      level,
      reason: 'User requested spectrum level',
      startTime: new Date().toISOString(),
      blockedApps: [],
      allowedApps: this.determineAllowedApps(level),
      escapeAttempts: 0
    };

    // Implement progressive hijacking
    if (level >= 9) {
      await this.implementSoftHijack();
    }

    if (level >= 10) {
      await this.implementFullHijack();
    }

    this.emit('hijackActivated', {
      level,
      mode: this.hijackMode,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Morning todo list enforcement system
   */
  setupMorningTodoEnforcement() {
    // Clear existing schedulers
    this.clearMorningSchedulers();

    // Schedule morning todo check
    cron.schedule('0 * 9-12 * * 1-5', async () => { // Every hour from 9-12 AM, weekdays
      if (!this.morningTodoStatus.completed) {
        await this.escalateMorningTodoEnforcement();
      }
    });

    // Daily reset
    cron.schedule('0 0 * * *', () => {
      this.resetMorningTodoStatus();
    });
  }

  /**
   * Escalate morning todo enforcement
   */
  async escalateMorningTodoEnforcement() {
    const currentHour = new Date().getHours();
    const workdayStart = parseInt(this.currentSpectrum.workdayStartTime.split(':')[0]);
    const hoursElapsed = currentHour - workdayStart;

    this.morningTodoStatus.attempts++;
    this.morningTodoStatus.lastEscalation = new Date().toISOString();

    // Escalation schedule based on ADHD urgency patterns
    let targetLevel = this.currentSpectrum.level;

    if (hoursElapsed >= 1) targetLevel = Math.max(targetLevel, 5); // After 1 hour: Active Prompt
    if (hoursElapsed >= 2) targetLevel = Math.max(targetLevel, 7); // After 2 hours: Firm Insistence
    if (hoursElapsed >= 3) targetLevel = Math.max(targetLevel, 9); // After 3 hours: Soft Hijack

    // Cap escalation at user's max setting
    targetLevel = Math.min(targetLevel, this.currentSpectrum.maxDailyEscalation);

    if (targetLevel > this.currentSpectrum.level) {
      console.log(`📈 Morning Todo Escalation: Level ${this.currentSpectrum.level} → ${targetLevel}`);

      await this.setSpectrumLevel(targetLevel);

      // Send escalation notification
      await this.notificationService.sendNotification({
        type: 'morning_todo_escalation',
        urgency: 'high',
        message: `Morning todo list enforcement escalated to Level ${targetLevel}. Complete your morning goals to return to normal operation.`,
        actions: [
          { label: 'Show Morning Todos', action: 'show_morning_todos' },
          { label: 'Emergency Bypass', action: 'emergency_bypass' }
        ],
        dismissible: targetLevel < 8
      });
    }

    this.emit('morningTodoEscalation', {
      level: targetLevel,
      hoursElapsed,
      attempts: this.morningTodoStatus.attempts,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Complete morning todo list and return to normal operation
   */
  async completeMorningTodos() {
    this.morningTodoStatus.completed = true;
    this.morningTodoStatus.completionTime = new Date().toISOString();

    // Return to user's preferred spectrum level
    const originalLevel = this.getUserPreferredLevel();
    await this.setSpectrumLevel(originalLevel);

    // Celebrate completion
    await this.notificationService.sendNotification({
      type: 'morning_todos_completed',
      urgency: 'low',
      message: '🎉 Morning todos completed! Great start to your day. Returning to normal operation.',
      celebratory: true
    });

    this.emit('morningTodosCompleted', {
      completionTime: this.morningTodoStatus.completionTime,
      attempts: this.morningTodoStatus.attempts,
      originalLevel,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Adaptive spectrum adjustment based on ADHD patterns
   */
  async adaptiveSpectrumAdjustment(detectedPatterns) {
    if (!this.currentSpectrum.adaptiveAdjustment) return;

    let suggestedLevel = this.currentSpectrum.level;

    // Analyze patterns and suggest adjustments
    for (const pattern of detectedPatterns) {
      switch (pattern.type) {
        case 'procrastination':
          if (pattern.severity === 'severe') {
            suggestedLevel = Math.min(suggestedLevel + 2, 10);
          } else if (pattern.severity === 'moderate') {
            suggestedLevel = Math.min(suggestedLevel + 1, 10);
          }
          break;

        case 'hyperfocus':
          // During hyperfocus, maintain current level but prepare for aftermath
          if (pattern.duration > 180) { // 3+ hours
            this.schedulePostHyperfocusSupport();
          }
          break;

        case 'overwhelm':
          // Reduce spectrum level during overwhelm
          suggestedLevel = Math.max(suggestedLevel - 1, 1);
          break;

        case 'task_switching':
          // Increase structure for task switching issues
          suggestedLevel = Math.min(suggestedLevel + 1, 10);
          break;
      }
    }

    // Suggest adjustment if significantly different
    if (Math.abs(suggestedLevel - this.currentSpectrum.level) >= 2) {
      await this.suggestSpectrumAdjustment(suggestedLevel, detectedPatterns);
    }
  }

  /**
   * Suggest spectrum level adjustment to user
   */
  async suggestSpectrumAdjustment(suggestedLevel, reasons) {
    const suggestion = {
      currentLevel: this.currentSpectrum.level,
      suggestedLevel,
      reasons: reasons.map(p => ({
        pattern: p.type,
        severity: p.severity,
        impact: p.impact
      })),
      message: this.generateAdjustmentMessage(suggestedLevel, reasons)
    };

    await this.notificationService.sendNotification({
      type: 'spectrum_adjustment_suggestion',
      urgency: 'medium',
      message: suggestion.message,
      actions: [
        { label: `Switch to Level ${suggestedLevel}`, action: 'accept_suggestion', data: suggestedLevel },
        { label: 'Keep Current Level', action: 'decline_suggestion' },
        { label: 'Customize', action: 'open_spectrum_settings' }
      ],
      metadata: suggestion
    });

    this.emit('spectrumAdjustmentSuggested', suggestion);
  }

  /**
   * Emergency bypass system
   */
  async requestEmergencyBypass(reason) {
    if (!this.currentSpectrum.emergencyBypass) {
      return { allowed: false, reason: 'Emergency bypass disabled' };
    }

    // Log emergency bypass
    const bypass = {
      timestamp: new Date().toISOString(),
      reason,
      currentLevel: this.currentSpectrum.level,
      hijackMode: this.hijackMode.active,
      ip: 'local', // Could track IP for security
      approved: true // Could require additional verification
    };

    // Temporarily reduce spectrum level
    const emergencyLevel = Math.max(1, this.currentSpectrum.level - 3);
    await this.setSpectrumLevel(emergencyLevel);

    // Schedule return to normal
    setTimeout(async () => {
      await this.setSpectrumLevel(this.currentSpectrum.level + 3);
    }, 30 * 60 * 1000); // 30 minutes

    this.emit('emergencyBypass', bypass);

    return {
      allowed: true,
      temporaryLevel: emergencyLevel,
      duration: '30 minutes',
      message: 'Emergency bypass granted. System will return to normal operation in 30 minutes.'
    };
  }

  /**
   * Get current spectrum status
   */
  getSpectrumStatus() {
    return {
      currentLevel: this.currentSpectrum.level,
      levelName: this.spectrumLevels[this.currentSpectrum.level].name,
      levelDescription: this.spectrumLevels[this.currentSpectrum.level].description,
      features: this.spectrumLevels[this.currentSpectrum.level].features,
      adhdNote: this.spectrumLevels[this.currentSpectrum.level].adhdNote,
      hijackMode: this.hijackMode.active,
      morningTodoEnforcement: this.currentSpectrum.morningTodoEnforcement,
      morningTodoStatus: this.morningTodoStatus,
      adaptiveAdjustment: this.currentSpectrum.adaptiveAdjustment,
      timestamp: new Date().toISOString()
    };
  }

  // Helper methods and implementations

  initializeSchedulers() {
    // Daily spectrum reset
    cron.schedule('0 6 * * *', () => {
      this.dailySpectrumReset();
    });
  }

  parseFrequency(frequencyString) {
    // Parse frequency strings like "every 2 hours" into milliseconds
    const matches = frequencyString.match(/every (\d+) (minute|hour)s?/);
    if (matches) {
      const amount = parseInt(matches[1]);
      const unit = matches[2];
      return amount * (unit === 'hour' ? 60 * 60 * 1000 : 60 * 1000);
    }
    return 60 * 60 * 1000; // Default 1 hour
  }

  async requestHijackConfirmation(level) {
    // In a real implementation, this would show a modal or require explicit confirmation
    console.log(`🚨 Requesting confirmation for Hijack Level ${level}`);
    return true; // Auto-approve for now
  }

  clearActiveInterventions() {
    this.activeInterventions.clear();
    // Clear any active timers, overlays, etc.
  }

  generateAdjustmentMessage(suggestedLevel, patterns) {
    const levelName = this.spectrumLevels[suggestedLevel].name;
    const patternTypes = patterns.map(p => p.type).join(', ');

    if (suggestedLevel > this.currentSpectrum.level) {
      return `I noticed ${patternTypes} patterns. Consider increasing to Level ${suggestedLevel} (${levelName}) for more structure and support.`;
    } else {
      return `You seem to be doing well! Consider reducing to Level ${suggestedLevel} (${levelName}) for a gentler approach.`;
    }
  }

  getUserPreferredLevel() {
    // In a real implementation, this would load from user preferences
    return 5; // Default moderate level
  }

  // Implementation stubs for hijack features
  async implementSoftHijack() {
    console.log('🔒 Implementing soft hijack mode...');
    // Block distracting websites and apps
    // Modify system notifications
    // Create persistent reminders
  }

  async implementFullHijack() {
    console.log('🔒 Implementing full hijack mode...');
    // Take control of desktop environment
    // Only allow productive applications
    // Continuous monitoring and enforcement
  }

  enableMildConsequences() {
    console.log('⚠️ Enabling mild consequences...');
    // Brief app pauses, website warnings, etc.
  }

  enableWebsiteBlocking(type) {
    console.log(`🚫 Enabling ${type} website blocking...`);
    // Implement website blocking based on type
  }

  enableAppRestrictions() {
    console.log('📱 Enabling app restrictions...');
    // Limit access to non-productive apps
  }

  setupPersistentOverlay(level) {
    console.log(`📺 Setting up persistent overlay for level ${level}...`);
    // Create UI overlay that shows current tasks and progress
  }

  enableContinuousMonitoring() {
    console.log('👁️ Enabling continuous monitoring...');
    // Monitor all user activity for pattern detection
  }

  determineAllowedApps(level) {
    const baseApps = ['obsidian', 'proactivity', 'terminal', 'finder'];

    if (level === 9) {
      return [...baseApps, 'browser-work-mode', 'text-editor'];
    } else if (level === 10) {
      return baseApps; // Minimal set
    }

    return baseApps;
  }

  startGentleMonitoring(level) {
    // Implement gentle monitoring based on level
  }

  clearMorningSchedulers() {
    // Clear existing cron jobs for morning todos
  }

  resetMorningTodoStatus() {
    this.morningTodoStatus = {
      completed: false,
      startTime: null,
      escalationLevel: 1,
      attempts: 0,
      lastEscalation: null
    };
  }

  schedulePostHyperfocusSupport() {
    // Schedule increased support after hyperfocus ends
  }

  dailySpectrumReset() {
    // Reset spectrum to user preferences each morning
    const preferredLevel = this.getUserPreferredLevel();
    this.setSpectrumLevel(preferredLevel);
  }

  /**
   * Get current spectrum level for a user
   */
  async getCurrentSpectrumLevel(userId) {
    // For now, return the current spectrum level
    // In a full implementation, this would be stored per-user
    return this.currentSpectrum.level;
  }

  /**
   * Get when morning planning was started
   */
  async getMorningPlanningStartTime(userId) {
    return this.morningTodoStatus.startTime || new Date().toISOString();
  }

  /**
   * Reset morning planning level after completion
   */
  async resetMorningPlanningLevel(userId) {
    const originalLevel = this.getUserPreferredLevel();
    await this.setSpectrumLevel(originalLevel);
    this.morningTodoStatus.completed = true;
    this.morningTodoStatus.completionTime = new Date().toISOString();
  }

  /**
   * Escalate spectrum level due to morning planning delays
   */
  async escalateSpectrumLevel(userId, reason, data) {
    const currentLevel = this.currentSpectrum.level;
    let newLevel = currentLevel;

    // Escalation logic based on reason
    switch (reason) {
      case 'time_elapsed':
        if (data >= 30 && currentLevel < 3) newLevel = 3;
        break;
      case 'prolonged_delay':
        if (data >= 60 && currentLevel < 5) newLevel = 5;
        break;
      case 'serious_procrastination':
        if (data >= 120 && currentLevel < 8) newLevel = 8;
        break;
      default:
        newLevel = Math.min(currentLevel + 1, this.currentSpectrum.maxDailyEscalation);
    }

    if (newLevel > currentLevel) {
      await this.setSpectrumLevel(newLevel);
    }

    return newLevel;
  }

  /**
   * Grant emergency bypass with duration and reason
   */
  async grantEmergencyBypass(userId, durationMinutes, reason) {
    const bypass = {
      userId,
      timestamp: new Date().toISOString(),
      reason,
      durationMinutes,
      originalLevel: this.currentSpectrum.level,
      temporaryLevel: Math.max(1, this.currentSpectrum.level - 3)
    };

    // Temporarily reduce spectrum level
    await this.setSpectrumLevel(bypass.temporaryLevel);

    // Schedule return to original level
    setTimeout(async () => {
      await this.setSpectrumLevel(bypass.originalLevel);
    }, durationMinutes * 60 * 1000);

    this.emit('emergencyBypass', bypass);
    return bypass;
  }

  /**
   * Start morning planning enforcement
   */
  async startMorningPlanningEnforcement(userId) {
    this.morningTodoStatus = {
      completed: false,
      startTime: new Date().toISOString(),
      escalationLevel: 1,
      attempts: 0,
      lastEscalation: null
    };

    // Start with gentle reminder
    await this.setSpectrumLevel(Math.max(this.currentSpectrum.level, 2));

    return this.morningTodoStatus;
  }
}

export default ProactivitySpectrumService;