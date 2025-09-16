import cron from 'node-cron';
import { EventEmitter } from 'events';

/**
 * Morning Planning Enforcement Service
 *
 * Coordinates between the ProactiveSpectrumService and real enforcement mechanisms
 * to ensure morning planning compliance with progressive escalation.
 */
class MorningPlanningEnforcementService extends EventEmitter {
  constructor(database, spectrumService, notificationService) {
    super();

    this.database = database;
    this.spectrumService = spectrumService;
    this.notificationService = notificationService;

    // Enforcement state
    this.enforcementState = new Map(); // userId -> state
    this.activeEnforcements = new Set();

    // Escalation schedule
    this.escalationSchedule = [
      { minutes: 0, level: 1, message: 'Morning planning time! Let\'s plan your day for success.' },
      { minutes: 15, level: 2, message: 'Quick reminder: Planning helps your ADHD brain stay focused.' },
      { minutes: 30, level: 3, message: 'Planning is important for a productive day. Let\'s get this done!' },
      { minutes: 60, level: 5, message: 'You\'ve been avoiding planning. This is making your day harder.' },
      { minutes: 90, level: 7, message: 'Serious: Planning enforcement is now active. Please complete your plan.' },
      { minutes: 120, level: 8, message: 'Critical: Your browsing is restricted until planning is complete.' },
      { minutes: 180, level: 10, message: 'Emergency: Computer hijacked until morning planning is finished.' }
    ];

    this.initializeSchedulers();
  }

  /**
   * Initialize daily schedulers for morning planning enforcement
   */
  initializeSchedulers() {
    // Check for morning planning every 15 minutes during work hours
    cron.schedule('*/15 6-12 * * 1-5', async () => {
      await this.checkMorningPlanningCompliance();
    }, {
      timezone: 'America/New_York' // Adjust based on user timezone
    });

    // Daily reset at midnight
    cron.schedule('0 0 * * *', () => {
      this.dailyReset();
    }, {
      timezone: 'America/New_York'
    });

    // Hourly escalation check during morning hours
    cron.schedule('0 9-12 * * 1-5', async () => {
      await this.processEscalations();
    }, {
      timezone: 'America/New_York'
    });
  }

  /**
   * Check morning planning compliance for all users
   */
  async checkMorningPlanningCompliance() {
    try {
      const currentHour = new Date().getHours();

      // Only enforce during work hours (9 AM - 12 PM)
      if (currentHour < 9 || currentHour > 12) return;

      // For now, check default user (ID: 1)
      const userId = 1;
      const today = new Date().toISOString().split('T')[0];

      const isComplete = await this.database.isMorningPlanningComplete(userId, today);

      if (!isComplete) {
        await this.startEnforcementForUser(userId);
      } else if (this.enforcementState.has(userId)) {
        await this.completeEnforcementForUser(userId);
      }

    } catch (error) {
      console.error('Error checking morning planning compliance:', error);
    }
  }

  /**
   * Start enforcement for a specific user
   */
  async startEnforcementForUser(userId) {
    if (this.activeEnforcements.has(userId)) return;

    this.activeEnforcements.add(userId);

    const startTime = new Date();
    const state = {
      userId,
      startTime,
      currentLevel: 1,
      escalationCount: 0,
      lastEscalation: startTime,
      bypassRequests: 0,
      browserNotificationsSent: []
    };

    this.enforcementState.set(userId, state);

    // Start with spectrum level enforcement
    await this.spectrumService.startMorningPlanningEnforcement(userId);

    // Send initial notification
    await this.sendEnforcementNotification(userId, state.currentLevel);

    // Trigger browser extension enforcement
    await this.triggerBrowserEnforcement(userId, state.currentLevel);

    this.emit('enforcementStarted', { userId, startTime });

    console.log(`🌅 Morning planning enforcement started for user ${userId}`);
  }

  /**
   * Complete enforcement for a user
   */
  async completeEnforcementForUser(userId) {
    const state = this.enforcementState.get(userId);
    if (!state) return;

    const endTime = new Date();
    const duration = Math.round((endTime - state.startTime) / 60000); // minutes

    // Reset spectrum level
    await this.spectrumService.resetMorningPlanningLevel(userId);

    // Deactivate browser enforcement
    await this.deactivateBrowserEnforcement(userId);

    // Send completion notification
    await this.notificationService.sendNotification({
      userId,
      type: 'morning_planning_completed',
      urgency: 'low',
      title: '🎉 Morning Planning Complete!',
      message: `Great job! You completed your morning planning in ${duration} minutes. Your day is now set up for success.`,
      celebratory: true
    });

    // Record completion in database
    await this.database.recordSpectrumEvent(userId, {
      eventType: 'morning_planning_completed',
      previousLevel: state.currentLevel,
      newLevel: 1,
      reason: 'Planning completed',
      hoursElapsed: Math.round(duration / 60 * 100) / 100
    });

    // Clean up state
    this.enforcementState.delete(userId);
    this.activeEnforcements.delete(userId);

    this.emit('enforcementCompleted', { userId, duration, finalLevel: state.currentLevel });

    console.log(`✅ Morning planning enforcement completed for user ${userId} after ${duration} minutes`);
  }

  /**
   * Process escalations for all active enforcements
   */
  async processEscalations() {
    for (const [userId, state] of this.enforcementState.entries()) {
      await this.checkEscalation(userId, state);
    }
  }

  /**
   * Check if escalation is needed for a user
   */
  async checkEscalation(userId, state) {
    const now = new Date();
    const minutesElapsed = Math.floor((now - state.startTime) / 60000);

    // Find the appropriate escalation level
    const targetEscalation = this.escalationSchedule
      .filter(e => e.minutes <= minutesElapsed)
      .pop();

    if (!targetEscalation || targetEscalation.level <= state.currentLevel) return;

    // Escalate
    state.currentLevel = targetEscalation.level;
    state.escalationCount++;
    state.lastEscalation = now;

    // Update spectrum service
    await this.spectrumService.escalateSpectrumLevel(userId, 'time_elapsed', minutesElapsed);

    // Send escalation notification
    await this.sendEnforcementNotification(userId, state.currentLevel, targetEscalation.message);

    // Update browser enforcement
    await this.triggerBrowserEnforcement(userId, state.currentLevel);

    // Record escalation event
    await this.database.recordSpectrumEvent(userId, {
      eventType: 'level_escalation',
      previousLevel: state.currentLevel - 1,
      newLevel: state.currentLevel,
      reason: 'Time-based escalation',
      morningPlanningDate: new Date().toISOString().split('T')[0],
      hoursElapsed: Math.round(minutesElapsed / 60 * 100) / 100
    });

    this.emit('escalationTriggered', {
      userId,
      level: state.currentLevel,
      minutesElapsed,
      message: targetEscalation.message
    });

    console.log(`📈 Escalated user ${userId} to level ${state.currentLevel} after ${minutesElapsed} minutes`);
  }

  /**
   * Send enforcement notification through appropriate channels
   */
  async sendEnforcementNotification(userId, level, customMessage = null) {
    const escalation = this.escalationSchedule.find(e => e.level === level);
    const message = customMessage || escalation?.message || 'Morning planning required';

    const urgency = level <= 2 ? 'low' : level <= 4 ? 'medium' : level <= 6 ? 'high' : 'critical';

    await this.notificationService.sendNotification({
      userId,
      type: 'morning_planning_enforcement',
      urgency,
      title: level >= 7 ? '🚨 URGENT: Morning Planning Required' : '🌅 Morning Planning Time',
      message,
      dismissible: level < 7,
      requiresAction: level >= 5,
      spectrumLevel: level,
      actions: [
        { label: 'Complete Planning', action: 'open_morning_planning' },
        ...(level >= 8 ? [{ label: 'Emergency Bypass', action: 'request_bypass' }] : [])
      ]
    });
  }

  /**
   * Trigger browser extension enforcement
   */
  async triggerBrowserEnforcement(userId, level) {
    // In a real implementation, this would communicate with the browser extension
    // For now, we'll emit an event that could be picked up by WebSocket or other mechanism

    const enforcementData = {
      userId,
      action: 'activateMorningPlanning',
      spectrumLevel: level,
      timestamp: new Date().toISOString(),
      escalationSchedule: this.escalationSchedule.find(e => e.level === level)
    };

    this.emit('browserEnforcementRequired', enforcementData);

    // Simulate browser extension communication
    console.log(`🌐 Browser enforcement activated for user ${userId} at level ${level}`);

    // Store in database for browser extension to poll
    await this.database.recordSpectrumEvent(userId, {
      eventType: 'browser_enforcement_activated',
      previousLevel: level - 1,
      newLevel: level,
      reason: 'Morning planning enforcement',
      hijackActive: level >= 5
    });
  }

  /**
   * Deactivate browser enforcement
   */
  async deactivateBrowserEnforcement(userId) {
    const deactivationData = {
      userId,
      action: 'deactivateMorningPlanning',
      timestamp: new Date().toISOString()
    };

    this.emit('browserEnforcementDeactivated', deactivationData);

    console.log(`🌐 Browser enforcement deactivated for user ${userId}`);
  }

  /**
   * Handle emergency bypass request
   */
  async handleEmergencyBypass(userId, reason) {
    const state = this.enforcementState.get(userId);
    if (!state) {
      return { success: false, message: 'No active enforcement found' };
    }

    // Only allow bypass at high levels
    if (state.currentLevel < 8) {
      return {
        success: false,
        message: `Bypass not available at level ${state.currentLevel}. Please complete planning.`
      };
    }

    state.bypassRequests++;

    // Grant temporary bypass through spectrum service
    const bypass = await this.spectrumService.grantEmergencyBypass(userId, 30, reason);

    // Temporarily deactivate browser enforcement
    await this.deactivateBrowserEnforcement(userId);

    // Schedule re-activation
    setTimeout(async () => {
      if (this.enforcementState.has(userId)) {
        await this.triggerBrowserEnforcement(userId, state.currentLevel);
      }
    }, 30 * 60 * 1000); // 30 minutes

    this.emit('emergencyBypassGranted', { userId, reason, duration: 30 });

    return {
      success: true,
      message: `Emergency bypass granted for 30 minutes. Reason: ${reason}`,
      duration: 30
    };
  }

  /**
   * Get current enforcement status for a user
   */
  getEnforcementStatus(userId) {
    const state = this.enforcementState.get(userId);

    if (!state) {
      return {
        active: false,
        required: false,
        message: 'No active enforcement'
      };
    }

    const minutesElapsed = Math.floor((new Date() - state.startTime) / 60000);

    return {
      active: true,
      required: true,
      currentLevel: state.currentLevel,
      minutesElapsed,
      escalationCount: state.escalationCount,
      bypassRequests: state.bypassRequests,
      nextEscalation: this.escalationSchedule.find(e => e.level > state.currentLevel),
      message: `Morning planning enforcement active at level ${state.currentLevel}`
    };
  }

  /**
   * Daily reset of enforcement state
   */
  dailyReset() {
    this.enforcementState.clear();
    this.activeEnforcements.clear();

    console.log('🔄 Daily enforcement reset completed');
  }

  /**
   * Get enforcement statistics
   */
  getEnforcementStats() {
    const activeCount = this.activeEnforcements.size;
    const totalEscalations = Array.from(this.enforcementState.values())
      .reduce((sum, state) => sum + state.escalationCount, 0);

    return {
      activeEnforcements: activeCount,
      totalEscalations,
      averageLevel: activeCount > 0 ?
        Array.from(this.enforcementState.values())
          .reduce((sum, state) => sum + state.currentLevel, 0) / activeCount : 0
    };
  }
}

export default MorningPlanningEnforcementService;