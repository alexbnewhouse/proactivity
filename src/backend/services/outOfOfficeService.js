import { EventEmitter } from 'events';

/**
 * Out of Office Service for ProActive PhD
 * Manages vacation/break modes to pause proactive features
 * Provides hooks for easy integration across all services
 */
class OutOfOfficeService extends EventEmitter {
  constructor() {
    super();
    this.isOutOfOffice = false;
    this.outOfOfficeConfig = null;
    this.hooks = new Map();
    this.scheduledTasks = new Map();
    this.pausedServices = new Set();

    this.initializeHooks();
  }

  /**
   * Initialize default hooks for common scenarios
   */
  initializeHooks() {
    // Notification pause hook
    this.registerHook('notifications', {
      onPause: (config) => {
        console.log('🔕 Pausing proactive notifications for vacation');
        return { paused: true, reason: 'out_of_office' };
      },
      onResume: (config) => {
        console.log('🔔 Resuming proactive notifications - welcome back!');
        return { resumed: true, welcomeBack: true };
      }
    });

    // Pattern detection pause hook
    this.registerHook('patterns', {
      onPause: (config) => {
        console.log('🧠 Pausing ADHD pattern detection');
        return { paused: true, patternDetectionDisabled: true };
      },
      onResume: (config) => {
        console.log('🧠 Resuming pattern detection with fresh perspective');
        return { resumed: true, resetPatterns: true };
      }
    });

    // Task suggestions pause hook
    this.registerHook('tasks', {
      onPause: (config) => {
        console.log('📝 Pausing task suggestions');
        return { paused: true, suggestionsDisabled: true };
      },
      onResume: (config) => {
        console.log('📝 Ready to help with tasks again!');
        return { resumed: true, generateWelcomeBackTasks: true };
      }
    });

    // Obsidian integration pause hook
    this.registerHook('obsidian', {
      onPause: (config) => {
        console.log('📓 Pausing Obsidian proactive features');
        return { paused: true, obsidianQuietMode: true };
      },
      onResume: (config) => {
        console.log('📓 Obsidian integration back online');
        return { resumed: true, syncOnReturn: true };
      }
    });
  }

  /**
   * Register a new hook for a service
   */
  registerHook(serviceName, hooks) {
    this.hooks.set(serviceName, {
      onPause: hooks.onPause || (() => ({ paused: true })),
      onResume: hooks.onResume || (() => ({ resumed: true })),
      onScheduledEnd: hooks.onScheduledEnd || hooks.onResume || (() => ({ resumed: true }))
    });
  }

  /**
   * Set out of office mode
   */
  async setOutOfOffice(config = {}) {
    const {
      reason = 'vacation',
      startTime = new Date(),
      endTime = null,
      message = 'Taking a break to recharge! 🌴',
      pauseServices = ['notifications', 'patterns', 'tasks', 'obsidian'],
      enableEmergencyMode = false,
      emergencyKeyword = 'URGENT',
      autoWelcomeBack = true,
      customHooks = {}
    } = config;

    this.isOutOfOffice = true;
    this.outOfOfficeConfig = {
      reason,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      message,
      pauseServices,
      enableEmergencyMode,
      emergencyKeyword,
      autoWelcomeBack,
      customHooks,
      createdAt: new Date(),
      id: `ooo_${Date.now()}`
    };

    // Execute pause hooks for specified services
    const pauseResults = {};
    for (const serviceName of pauseServices) {
      try {
        const hook = this.hooks.get(serviceName);
        if (hook && hook.onPause) {
          pauseResults[serviceName] = await hook.onPause(this.outOfOfficeConfig);
          this.pausedServices.add(serviceName);
        }
      } catch (error) {
        console.error(`Error pausing service ${serviceName}:`, error);
        pauseResults[serviceName] = { error: error.message };
      }
    }

    // Execute custom hooks
    for (const [hookName, hookFn] of Object.entries(customHooks)) {
      if (typeof hookFn.onPause === 'function') {
        try {
          pauseResults[hookName] = await hookFn.onPause(this.outOfOfficeConfig);
        } catch (error) {
          console.error(`Error executing custom pause hook ${hookName}:`, error);
        }
      }
    }

    // Schedule automatic resume if end time is specified
    if (endTime) {
      this.scheduleAutoResume(endTime);
    }

    // Emit out of office event
    this.emit('outOfOfficeStarted', {
      config: this.outOfOfficeConfig,
      pauseResults
    });

    return {
      success: true,
      message: `Out of office mode activated! ${message}`,
      config: this.outOfOfficeConfig,
      pausedServices: Array.from(this.pausedServices),
      pauseResults,
      scheduledEnd: endTime ? new Date(endTime) : null
    };
  }

  /**
   * Resume from out of office mode
   */
  async resumeFromOutOfOffice(forced = false) {
    if (!this.isOutOfOffice) {
      return {
        success: false,
        message: 'Not currently in out of office mode'
      };
    }

    const resumeResults = {};
    const config = this.outOfOfficeConfig;

    // Execute resume hooks for all paused services
    for (const serviceName of this.pausedServices) {
      try {
        const hook = this.hooks.get(serviceName);
        if (hook && hook.onResume) {
          resumeResults[serviceName] = await hook.onResume(config);
        }
      } catch (error) {
        console.error(`Error resuming service ${serviceName}:`, error);
        resumeResults[serviceName] = { error: error.message };
      }
    }

    // Execute custom resume hooks
    if (config.customHooks) {
      for (const [hookName, hookFn] of Object.entries(config.customHooks)) {
        if (typeof hookFn.onResume === 'function') {
          try {
            resumeResults[hookName] = await hookFn.onResume(config);
          } catch (error) {
            console.error(`Error executing custom resume hook ${hookName}:`, error);
          }
        }
      }
    }

    // Clear scheduled auto-resume
    if (this.scheduledTasks.has('autoResume')) {
      clearTimeout(this.scheduledTasks.get('autoResume'));
      this.scheduledTasks.delete('autoResume');
    }

    // Reset state
    const previousConfig = this.outOfOfficeConfig;
    this.isOutOfOffice = false;
    this.outOfOfficeConfig = null;
    this.pausedServices.clear();

    // Generate welcome back message
    const welcomeBackMessage = this.generateWelcomeBackMessage(previousConfig, forced);

    // Emit resume event
    this.emit('outOfOfficeEnded', {
      previousConfig,
      resumeResults,
      forced,
      welcomeBackMessage
    });

    return {
      success: true,
      message: welcomeBackMessage,
      resumedServices: Object.keys(resumeResults),
      resumeResults,
      wasScheduled: !forced && previousConfig.endTime,
      duration: this.calculateDuration(previousConfig.startTime, new Date())
    };
  }

  /**
   * Check if currently out of office
   */
  isCurrentlyOutOfOffice() {
    return this.isOutOfOffice;
  }

  /**
   * Get current out of office configuration
   */
  getCurrentConfig() {
    return this.outOfOfficeConfig;
  }

  /**
   * Get status information
   */
  getStatus() {
    if (!this.isOutOfOffice) {
      return {
        active: false,
        message: 'ProActive PhD is fully operational'
      };
    }

    const config = this.outOfOfficeConfig;
    const timeAway = this.calculateDuration(config.startTime, new Date());
    const timeRemaining = config.endTime
      ? this.calculateDuration(new Date(), config.endTime)
      : null;

    return {
      active: true,
      reason: config.reason,
      message: config.message,
      timeAway,
      timeRemaining,
      pausedServices: Array.from(this.pausedServices),
      scheduledEnd: config.endTime,
      emergencyMode: config.enableEmergencyMode
    };
  }

  /**
   * Handle emergency override (if enabled)
   */
  async handleEmergencyOverride(message, context = {}) {
    if (!this.isOutOfOffice || !this.outOfOfficeConfig.enableEmergencyMode) {
      return { allowed: false, reason: 'Emergency mode not enabled' };
    }

    const keyword = this.outOfOfficeConfig.emergencyKeyword;
    const containsKeyword = message.toUpperCase().includes(keyword);

    if (!containsKeyword) {
      return {
        allowed: false,
        reason: `Emergency keyword "${keyword}" not found`,
        hint: `Include "${keyword}" in your message for emergency access`
      };
    }

    // Temporarily allow the action
    this.emit('emergencyOverride', {
      message,
      context,
      timestamp: new Date(),
      config: this.outOfOfficeConfig
    });

    return {
      allowed: true,
      message: 'Emergency access granted. Processing your request...',
      note: 'Out of office mode remains active for other features'
    };
  }

  /**
   * Schedule automatic resume
   */
  scheduleAutoResume(endTime) {
    const timeUntilResume = new Date(endTime) - new Date();

    if (timeUntilResume > 0) {
      const timeoutId = setTimeout(async () => {
        console.log('⏰ Scheduled out of office period ended, resuming services...');
        await this.resumeFromOutOfOffice(false);
      }, timeUntilResume);

      this.scheduledTasks.set('autoResume', timeoutId);
      console.log(`📅 Auto-resume scheduled for ${new Date(endTime)}`);
    }
  }

  /**
   * Generate welcome back message based on break duration and type
   */
  generateWelcomeBackMessage(config, forced) {
    const duration = this.calculateDuration(config.startTime, new Date());
    const baseMessage = forced ? 'Welcome back!' : 'Welcome back from your break!';

    const contextualMessages = {
      vacation: '🌴 Hope you had a relaxing vacation! Ready to tackle your dissertation with fresh energy?',
      sick: '🏥 Glad you\'re feeling better! Take it easy as you get back into your routine.',
      break: '☕ Hope that break was refreshing! Your mind is probably clearer now.',
      personal: '🫂 Welcome back! Sometimes life needs our attention, and that\'s perfectly okay.',
      default: '✨ Welcome back! Ready to make some progress on your goals?'
    };

    const contextualMessage = contextualMessages[config.reason] || contextualMessages.default;

    let durationNote = '';
    if (duration.days > 0) {
      durationNote = ` You were away for ${duration.days} day${duration.days > 1 ? 's' : ''}.`;
    } else if (duration.hours > 0) {
      durationNote = ` You took ${duration.hours} hour${duration.hours > 1 ? 's' : ''} away.`;
    }

    return `${baseMessage} ${contextualMessage}${durationNote} I'm here to help you ease back into your work! 🎯`;
  }

  /**
   * Calculate duration between two dates
   */
  calculateDuration(startDate, endDate) {
    const diffMs = Math.abs(endDate - startDate);
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes, totalMs: diffMs };
  }

  /**
   * Quick vacation mode preset
   */
  async startVacationMode(days = 7, autoResume = true) {
    const endTime = autoResume
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      : null;

    return this.setOutOfOffice({
      reason: 'vacation',
      message: `On vacation for ${days} days! 🏖️ Recharging for maximum productivity when I return!`,
      endTime,
      pauseServices: ['notifications', 'patterns', 'tasks'],
      enableEmergencyMode: true,
      emergencyKeyword: 'URGENT'
    });
  }

  /**
   * Quick sick day preset
   */
  async startSickDay(hours = 24) {
    const endTime = new Date(Date.now() + hours * 60 * 60 * 1000);

    return this.setOutOfOffice({
      reason: 'sick',
      message: 'Taking time to rest and recover 🤒 Health comes first!',
      endTime,
      pauseServices: ['notifications', 'patterns'],
      enableEmergencyMode: true,
      emergencyKeyword: 'EMERGENCY'
    });
  }

  /**
   * Quick focus mode (pauses only interruptions)
   */
  async startDeepFocusMode(hours = 4) {
    const endTime = new Date(Date.now() + hours * 60 * 60 * 1000);

    return this.setOutOfOffice({
      reason: 'deep_focus',
      message: 'In deep focus mode 🎯 Avoiding all interruptions!',
      endTime,
      pauseServices: ['notifications'], // Only pause notifications
      enableEmergencyMode: false,
      autoWelcomeBack: true
    });
  }

  /**
   * Integration helper for other services
   */
  shouldAllowAction(serviceName, actionType = 'default') {
    if (!this.isOutOfOffice) {
      return { allowed: true };
    }

    if (!this.pausedServices.has(serviceName)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'out_of_office',
      message: this.outOfOfficeConfig.message,
      emergencyModeAvailable: this.outOfOfficeConfig.enableEmergencyMode,
      emergencyKeyword: this.outOfOfficeConfig.enableEmergencyMode
        ? this.outOfOfficeConfig.emergencyKeyword
        : null
    };
  }
}

export default OutOfOfficeService;