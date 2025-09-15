import { App, TFile, Notice } from 'obsidian';
import { ProactivitySettings } from './main';

interface ActivityEvent {
  timestamp: number;
  type: 'file_open' | 'file_edit' | 'file_switch' | 'task_start' | 'task_complete' | 'energy_update';
  data: any;
}

interface DetectedPattern {
  type: 'procrastination' | 'hyperfocus' | 'task_switching' | 'energy_pattern' | 'productive_time';
  confidence: number;
  description: string;
  suggestions: string[];
  healthConcern: boolean;
  detected: number;
}

interface UserSession {
  startTime: number;
  endTime?: number;
  activities: ActivityEvent[];
  focusScore: number;
  tasksCompleted: number;
  filesModified: number;
}

export class ADHDPatternDetector {
  private app: App;
  private settings: ProactivitySettings;
  private activityHistory: ActivityEvent[] = [];
  private currentSession: UserSession | null = null;
  private detectionInterval: NodeJS.Timeout | null = null;
  private lastFileActivity: number = Date.now();
  private currentFile: string | null = null;
  private consecutiveFileSwitches: number = 0;
  private hyperfocusStartTime: number | null = null;
  private isDetectionActive: boolean = false;

  constructor(app: App, settings: ProactivitySettings) {
    this.app = app;
    this.settings = settings;
    this.setupEventListeners();
  }

  startDetection() {
    if (this.isDetectionActive) return;

    this.isDetectionActive = true;
    this.startNewSession();

    // Run pattern detection every 5 minutes
    this.detectionInterval = setInterval(() => {
      this.analyzePatterns();
    }, 5 * 60 * 1000);

    console.log('ADHD pattern detection started');
  }

  stopDetection() {
    if (!this.isDetectionActive) return;

    this.isDetectionActive = false;

    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    this.endCurrentSession();
    console.log('ADHD pattern detection stopped');
  }

  updateSettings(settings: ProactivitySettings) {
    this.settings = settings;
  }

  getCurrentPatterns(): DetectedPattern[] {
    return this.analyzeCurrentBehavior();
  }

  checkFocusState() {
    if (!this.isDetectionActive) return;

    const now = Date.now();
    const inactiveMinutes = (now - this.lastFileActivity) / (1000 * 60);

    // Check for hyperfocus (extended activity without breaks)
    if (this.hyperfocusStartTime) {
      const hyperfocusDuration = (now - this.hyperfocusStartTime) / (1000 * 60);

      if (hyperfocusDuration > 90 && this.settings.enableHyperfocusProtection) {
        this.triggerHyperfocusWarning(hyperfocusDuration);
      }
    }

    // Check for procrastination (extended inactivity)
    if (inactiveMinutes > this.settings.procrastinationThreshold) {
      this.triggerProcrastinationDetection(inactiveMinutes);
    }
  }

  private setupEventListeners() {
    // File activity listeners
    this.app.workspace.on('file-open', (file: TFile) => {
      this.recordActivity('file_open', { file: file?.path });
      this.handleFileActivity(file?.path || null);
    });

    this.app.vault.on('modify', (file: TFile) => {
      this.recordActivity('file_edit', { file: file.path });
      this.handleFileActivity(file.path);
    });

    // Workspace change listeners
    this.app.workspace.on('active-leaf-change', () => {
      const activeFile = this.app.workspace.getActiveFile();
      if (activeFile && activeFile.path !== this.currentFile) {
        this.handleFileSwitch(activeFile.path);
      }
    });
  }

  private handleFileActivity(filePath: string | null) {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastFileActivity;

    this.lastFileActivity = now;

    // Start hyperfocus tracking if sustained activity
    if (timeSinceLastActivity < 5 * 60 * 1000) { // Less than 5 minutes between activities
      if (!this.hyperfocusStartTime) {
        this.hyperfocusStartTime = now;
      }
    } else {
      // Reset hyperfocus tracking if there was a break
      this.hyperfocusStartTime = null;
    }

    // Update current session
    if (this.currentSession) {
      this.currentSession.activities.push({
        timestamp: now,
        type: 'file_edit',
        data: { file: filePath }
      });
    }
  }

  private handleFileSwitch(newFilePath: string) {
    if (this.currentFile && this.currentFile !== newFilePath) {
      this.consecutiveFileSwitches++;
      this.recordActivity('file_switch', {
        from: this.currentFile,
        to: newFilePath,
        consecutiveSwitches: this.consecutiveFileSwitches
      });

      // Detect excessive task switching
      if (this.consecutiveFileSwitches > 5) {
        this.triggerTaskSwitchingDetection();
      }
    } else {
      this.consecutiveFileSwitches = 0;
    }

    this.currentFile = newFilePath;
  }

  private recordActivity(type: ActivityEvent['type'], data: any) {
    const event: ActivityEvent = {
      timestamp: Date.now(),
      type,
      data
    };

    this.activityHistory.push(event);

    // Keep only last 24 hours of activity
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    this.activityHistory = this.activityHistory.filter(event => event.timestamp > cutoff);
  }

  private startNewSession() {
    this.endCurrentSession();

    this.currentSession = {
      startTime: Date.now(),
      activities: [],
      focusScore: 0,
      tasksCompleted: 0,
      filesModified: 0
    };
  }

  private endCurrentSession() {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now();
      this.calculateSessionMetrics();
      // Store session for later analysis
    }
  }

  private calculateSessionMetrics() {
    if (!this.currentSession) return;

    const session = this.currentSession;
    const duration = (session.endTime || Date.now()) - session.startTime;

    // Calculate focus score based on activity consistency
    const activityGaps = this.calculateActivityGaps(session.activities);
    session.focusScore = this.calculateFocusScore(activityGaps, duration);

    // Count file modifications
    session.filesModified = session.activities.filter(a => a.type === 'file_edit').length;
  }

  private calculateActivityGaps(activities: ActivityEvent[]): number[] {
    const gaps = [];
    for (let i = 1; i < activities.length; i++) {
      gaps.push(activities[i].timestamp - activities[i - 1].timestamp);
    }
    return gaps;
  }

  private calculateFocusScore(gaps: number[], duration: number): number {
    if (gaps.length === 0) return 0;

    const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const maxGap = Math.max(...gaps);

    // Good focus = consistent activity with small gaps
    const consistencyScore = 1 - (maxGap - averageGap) / duration;
    const activityScore = Math.min(gaps.length / (duration / (10 * 60 * 1000)), 1); // Activities per 10min

    return Math.max(0, Math.min(1, (consistencyScore + activityScore) / 2));
  }

  private analyzePatterns(): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    patterns.push(...this.detectProcrastinationPattern());
    patterns.push(...this.detectHyperfocusPattern());
    patterns.push(...this.detectTaskSwitchingPattern());
    patterns.push(...this.detectEnergyPattern());
    patterns.push(...this.detectProductiveTimePattern());

    return patterns;
  }

  private analyzeCurrentBehavior(): DetectedPattern[] {
    return this.analyzePatterns();
  }

  private detectProcrastinationPattern(): DetectedPattern[] {
    const now = Date.now();
    const recentActivity = this.activityHistory.filter(
      event => now - event.timestamp < 60 * 60 * 1000 // Last hour
    );

    if (recentActivity.length < 3) {
      const inactiveMinutes = (now - this.lastFileActivity) / (1000 * 60);

      if (inactiveMinutes > this.settings.procrastinationThreshold) {
        return [{
          type: 'procrastination',
          confidence: Math.min(0.9, inactiveMinutes / 60),
          description: `Low activity detected for ${Math.round(inactiveMinutes)} minutes`,
          suggestions: [
            'Try the 2-minute rule: commit to just 2 minutes of work',
            'Break your task into smaller micro-steps',
            'Use the Pomodoro technique with shorter intervals',
            'Consider if this is the right energy level for this task'
          ],
          healthConcern: false,
          detected: now
        }];
      }
    }

    return [];
  }

  private detectHyperfocusPattern(): DetectedPattern[] {
    if (!this.hyperfocusStartTime) return [];

    const now = Date.now();
    const hyperfocusDuration = (now - this.hyperfocusStartTime) / (1000 * 60);

    if (hyperfocusDuration > 60) { // More than 1 hour of continuous focus
      return [{
        type: 'hyperfocus',
        confidence: Math.min(0.9, hyperfocusDuration / 120),
        description: `Sustained focus session: ${Math.round(hyperfocusDuration)} minutes`,
        suggestions: [
          'Great focus! Consider taking a 5-10 minute break soon',
          'Hydrate and stretch to maintain this energy',
          'Set a gentle reminder to check in with your body',
          'Remember to eat if it\'s been a while'
        ],
        healthConcern: hyperfocusDuration > 120, // Health concern after 2 hours
        detected: now
      }];
    }

    return [];
  }

  private detectTaskSwitchingPattern(): DetectedPattern[] {
    const recentSwitches = this.activityHistory.filter(
      event => event.type === 'file_switch' &&
      Date.now() - event.timestamp < 30 * 60 * 1000 // Last 30 minutes
    );

    if (recentSwitches.length > 8) { // More than 8 file switches in 30 minutes
      return [{
        type: 'task_switching',
        confidence: Math.min(0.9, recentSwitches.length / 15),
        description: `High task switching: ${recentSwitches.length} file changes in 30 minutes`,
        suggestions: [
          'You seem to be jumping between tasks - this is totally normal with ADHD!',
          'Try closing extra tabs to reduce visual distractions',
          'Pick one file to focus on for the next 15 minutes',
          'Consider if you need a break or different type of task'
        ],
        healthConcern: false,
        detected: Date.now()
      }];
    }

    return [];
  }

  private detectEnergyPattern(): DetectedPattern[] {
    // This would analyze energy level updates over time
    // For now, return empty array - could be enhanced with actual energy tracking data
    return [];
  }

  private detectProductiveTimePattern(): DetectedPattern[] {
    if (!this.currentSession) return [];

    const sessionDuration = (Date.now() - this.currentSession.startTime) / (1000 * 60);

    if (sessionDuration > 25 && this.currentSession.focusScore > 0.7) {
      return [{
        type: 'productive_time',
        confidence: this.currentSession.focusScore,
        description: `High productivity session: ${Math.round(sessionDuration)} minutes`,
        suggestions: [
          'You\'re in a great flow state!',
          'Your ADHD brain is working well right now',
          'Consider what factors are helping you focus today',
          'Remember this pattern for future reference'
        ],
        healthConcern: false,
        detected: Date.now()
      }];
    }

    return [];
  }

  private triggerHyperfocusWarning(duration: number) {
    if (!this.settings.enableHyperfocusProtection) return;

    const hours = Math.floor(duration / 60);
    const minutes = Math.round(duration % 60);

    new Notice(
      `💙 Hyperfocus check-in: You've been focused for ${hours}h ${minutes}m. Consider a gentle break for your wellbeing.`,
      8000
    );
  }

  private triggerProcrastinationDetection(inactiveMinutes: number) {
    const roundedMinutes = Math.round(inactiveMinutes);

    new Notice(
      `🤗 Gentle nudge: It's been ${roundedMinutes} minutes since your last activity. No judgment - want to try a tiny step?`,
      6000
    );
  }

  private triggerTaskSwitchingDetection() {
    new Notice(
      `🧠 I notice you're switching between tasks frequently - totally normal with ADHD! Maybe try focusing on one file for 10 minutes?`,
      7000
    );

    // Reset counter after notification
    this.consecutiveFileSwitches = 0;
  }

  // Public methods for external use

  recordEnergyUpdate(energyLevel: string) {
    this.recordActivity('energy_update', { energyLevel });
  }

  recordTaskStart(task: any) {
    this.recordActivity('task_start', { task });
    if (this.currentSession) {
      this.currentSession.tasksCompleted++;
    }
  }

  recordTaskComplete(task: any) {
    this.recordActivity('task_complete', { task });
  }

  getSessionSummary() {
    if (!this.currentSession) return null;

    const duration = (Date.now() - this.currentSession.startTime) / (1000 * 60);

    return {
      duration: Math.round(duration),
      focusScore: this.currentSession.focusScore,
      tasksCompleted: this.currentSession.tasksCompleted,
      filesModified: this.currentSession.filesModified,
      patterns: this.getCurrentPatterns()
    };
  }

  exportPatternData() {
    return {
      activityHistory: this.activityHistory,
      currentSession: this.currentSession,
      detectedPatterns: this.getCurrentPatterns(),
      metadata: {
        detectionActive: this.isDetectionActive,
        settingsSnapshot: this.settings
      }
    };
  }
}