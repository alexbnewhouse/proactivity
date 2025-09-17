import { App, Notice } from 'obsidian';

export interface SessionEvent {
	timestamp: number;
	type: 'focus_start' | 'focus_end' | 'break_start' | 'break_end' | 'hyperfocus_detected' | 'plugin_interaction';
	context?: string;
}

export interface SessionMetrics {
	totalFocusTime: number;
	totalBreakTime: number;
	averageSessionLength: number;
	hyperfocusEpisodes: number;
	lastBreak: number;
	currentSessionStart?: number;
	pluginInteractions: number;
}

export interface SessionSettings {
	suggestedBreakInterval: number; // minutes
	hyperfocusThreshold: number; // interactions per minute
	breakReminderEnabled: boolean;
	hyperfocusDetectionEnabled: boolean;
	gentleReminders: boolean;
}

export class SessionTrackingService {
	private app: App;
	private events: SessionEvent[] = [];
	private currentSession: SessionEvent | null = null;
	private metrics: SessionMetrics;
	private settings: SessionSettings;
	private interactionCount: number = 0;
	private lastInteractionTime: number = 0;
	private breakReminderTimer: NodeJS.Timeout | null = null;
	private hyperfocusCheckTimer: NodeJS.Timeout | null = null;

	constructor(app: App, settings: Partial<SessionSettings> = {}) {
		this.app = app;
		this.settings = {
			suggestedBreakInterval: 45, // 45 minutes default (ADHD-friendly)
			hyperfocusThreshold: 3, // 3 interactions per minute
			breakReminderEnabled: true,
			hyperfocusDetectionEnabled: true,
			gentleReminders: true,
			...settings
		};
		this.metrics = this.initializeMetrics();
		this.startTracking();
	}

	private initializeMetrics(): SessionMetrics {
		return {
			totalFocusTime: 0,
			totalBreakTime: 0,
			averageSessionLength: 0,
			hyperfocusEpisodes: 0,
			lastBreak: Date.now(),
			pluginInteractions: 0
		};
	}

	private startTracking() {
		// Start a focus session immediately
		this.startFocusSession();

		// Set up break reminder timer
		if (this.settings.breakReminderEnabled) {
			this.scheduleBreakReminder();
		}

		// Set up hyperfocus detection
		if (this.settings.hyperfocusDetectionEnabled) {
			this.startHyperfocusMonitoring();
		}
	}

	public recordInteraction(context: string = '') {
		const now = Date.now();
		this.interactionCount++;
		this.metrics.pluginInteractions++;
		this.lastInteractionTime = now;

		this.addEvent({
			timestamp: now,
			type: 'plugin_interaction',
			context
		});

		// Check for hyperfocus patterns
		this.checkHyperfocus();
	}

	private startFocusSession() {
		const now = Date.now();
		this.currentSession = {
			timestamp: now,
			type: 'focus_start'
		};
		this.metrics.currentSessionStart = now;
		this.addEvent(this.currentSession);
	}

	private endFocusSession() {
		if (!this.currentSession || !this.metrics.currentSessionStart) return;

		const now = Date.now();
		const sessionLength = now - this.metrics.currentSessionStart;
		
		this.addEvent({
			timestamp: now,
			type: 'focus_end'
		});

		// Update metrics
		this.metrics.totalFocusTime += sessionLength;
		this.updateAverageSessionLength();
		this.currentSession = null;
		this.metrics.currentSessionStart = undefined;
	}

	public startBreak() {
		this.endFocusSession();
		
		const now = Date.now();
		this.addEvent({
			timestamp: now,
			type: 'break_start'
		});

		this.metrics.lastBreak = now;
		
		// Clear break reminder
		if (this.breakReminderTimer) {
			clearTimeout(this.breakReminderTimer);
			this.breakReminderTimer = null;
		}
	}

	public endBreak() {
		const breakStart = this.findLastEvent('break_start');
		if (breakStart) {
			const breakLength = Date.now() - breakStart.timestamp;
			this.metrics.totalBreakTime += breakLength;
		}

		this.addEvent({
			timestamp: Date.now(),
			type: 'break_end'
		});

		// Resume focus session
		this.startFocusSession();
		
		// Schedule next break reminder
		if (this.settings.breakReminderEnabled) {
			this.scheduleBreakReminder();
		}
	}

	private scheduleBreakReminder() {
		if (this.breakReminderTimer) {
			clearTimeout(this.breakReminderTimer);
		}

		this.breakReminderTimer = setTimeout(() => {
			this.suggestBreak();
		}, this.settings.suggestedBreakInterval * 60 * 1000);
	}

	private suggestBreak() {
		if (!this.settings.breakReminderEnabled) return;

		const timeSinceLastBreak = Date.now() - this.metrics.lastBreak;
		const minutesSinceBreak = Math.floor(timeSinceLastBreak / (1000 * 60));

		if (this.settings.gentleReminders) {
			new Notice(`💡 You've been focused for ${minutesSinceBreak} minutes. Consider a short break when you finish this thought.`, 8000);
		} else {
			new Notice(`Break suggestion: ${minutesSinceBreak} minutes of focus time. Take a breather! 🌱`, 5000);
		}

		// Schedule next reminder (with backoff)
		this.scheduleBreakReminder();
	}

	private startHyperfocusMonitoring() {
		this.hyperfocusCheckTimer = setInterval(() => {
			this.checkHyperfocus();
		}, 60000); // Check every minute
	}

	private checkHyperfocus() {
		const now = Date.now();
		const oneMinuteAgo = now - 60000;
		
		// Count interactions in the last minute
		const recentInteractions = this.events.filter(event => 
			event.type === 'plugin_interaction' && 
			event.timestamp > oneMinuteAgo
		).length;

		if (recentInteractions >= this.settings.hyperfocusThreshold) {
			this.detectHyperfocus();
		}
	}

	private detectHyperfocus() {
		// Don't spam hyperfocus notifications
		const lastHyperfocus = this.findLastEvent('hyperfocus_detected');
		if (lastHyperfocus && (Date.now() - lastHyperfocus.timestamp) < 300000) { // 5 minutes
			return;
		}

		this.addEvent({
			timestamp: Date.now(),
			type: 'hyperfocus_detected'
		});

		this.metrics.hyperfocusEpisodes++;

		if (this.settings.gentleReminders) {
			new Notice('🎯 Hyperfocus detected! You\'re in the zone. Remember to hydrate and breathe.', 6000);
		}
	}

	private addEvent(event: SessionEvent) {
		this.events.push(event);
		
		// Keep only last 1000 events to prevent memory issues
		if (this.events.length > 1000) {
			this.events = this.events.slice(-1000);
		}
	}

	private findLastEvent(type: SessionEvent['type']): SessionEvent | null {
		for (let i = this.events.length - 1; i >= 0; i--) {
			if (this.events[i].type === type) {
				return this.events[i];
			}
		}
		return null;
	}

	private updateAverageSessionLength() {
		const focusSessions = this.events.filter(e => e.type === 'focus_start');
		if (focusSessions.length === 0) return;

		let totalSessionTime = 0;
		let completedSessions = 0;

		for (const session of focusSessions) {
			const endSession = this.events.find(e => 
				e.type === 'focus_end' && 
				e.timestamp > session.timestamp
			);
			
			if (endSession) {
				totalSessionTime += (endSession.timestamp - session.timestamp);
				completedSessions++;
			}
		}

		if (completedSessions > 0) {
			this.metrics.averageSessionLength = totalSessionTime / completedSessions;
		}
	}

	public getMetrics(): SessionMetrics {
		// Update current session time if active
		if (this.metrics.currentSessionStart) {
			const currentSessionTime = Date.now() - this.metrics.currentSessionStart;
			return {
				...this.metrics,
				currentSessionTime
			} as SessionMetrics & { currentSessionTime: number };
		}
		
		return { ...this.metrics };
	}

	public getTodayEvents(): SessionEvent[] {
		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);
		
		return this.events.filter(event => event.timestamp >= todayStart.getTime());
	}

	public updateSettings(newSettings: Partial<SessionSettings>) {
		this.settings = { ...this.settings, ...newSettings };
		
		// Restart timers with new settings
		if (this.breakReminderTimer) {
			clearTimeout(this.breakReminderTimer);
			this.breakReminderTimer = null;
		}
		
		if (this.settings.breakReminderEnabled) {
			this.scheduleBreakReminder();
		}
	}

	public destroy() {
		if (this.breakReminderTimer) {
			clearTimeout(this.breakReminderTimer);
		}
		if (this.hyperfocusCheckTimer) {
			clearInterval(this.hyperfocusCheckTimer);
		}
		
		// End current session
		if (this.currentSession) {
			this.endFocusSession();
		}
	}
}