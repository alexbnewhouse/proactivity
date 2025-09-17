import { App, ItemView, WorkspaceLeaf } from 'obsidian';
import { SessionTrackingService, SessionMetrics, SessionEvent } from './session-tracking-service';

export const SESSION_ANALYTICS_VIEW_TYPE = 'session-analytics-view';

export class SessionAnalyticsView extends ItemView {
	private sessionService: SessionTrackingService;
	private refreshInterval: NodeJS.Timeout | null = null;

	constructor(leaf: WorkspaceLeaf, sessionService: SessionTrackingService) {
		super(leaf);
		this.sessionService = sessionService;
	}

	getViewType(): string {
		return SESSION_ANALYTICS_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Session Analytics';
	}

	getIcon(): string {
		return 'bar-chart-3';
	}

	async onOpen() {
		await this.renderView();
		
		// Refresh view every minute
		this.refreshInterval = setInterval(() => {
			this.renderView();
		}, 60000);
	}

	async onClose() {
		if (this.refreshInterval) {
			clearInterval(this.refreshInterval);
			this.refreshInterval = null;
		}
	}

	private async renderView() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('ds-session-analytics');

		const metrics = this.sessionService.getMetrics();
		const todayEvents = this.sessionService.getTodayEvents();

		// Header
		const header = container.createEl('div', { cls: 'ds-analytics-header' });
		header.createEl('h2', { text: 'Session Analytics', cls: 'ds-analytics-title' });
		
		const subtitle = header.createEl('p', { cls: 'ds-analytics-subtitle' });
		subtitle.innerHTML = `Track your ADHD-friendly work patterns • <span class="ds-accent">Today's insights</span>`;

		// Current session status
		const currentSection = container.createEl('div', { cls: 'ds-analytics-section' });
		currentSection.createEl('h3', { text: '🎯 Current Session', cls: 'ds-section-title' });
		
		const currentCard = currentSection.createEl('div', { cls: 'ds-analytics-card ds-current-session' });
		
		if (metrics.currentSessionStart) {
			const sessionTime = Date.now() - metrics.currentSessionStart;
			const minutes = Math.floor(sessionTime / (1000 * 60));
			const hours = Math.floor(minutes / 60);
			const displayMinutes = minutes % 60;
			
			const timeDisplay = hours > 0 ? `${hours}h ${displayMinutes}m` : `${minutes}m`;
			currentCard.createEl('div', { text: `Active for ${timeDisplay}`, cls: 'ds-metric-value' });
			currentCard.createEl('div', { text: 'Keep up the great work! 🌟', cls: 'ds-metric-label' });
		} else {
			currentCard.createEl('div', { text: 'On break', cls: 'ds-metric-value ds-on-break' });
			currentCard.createEl('div', { text: 'Ready to start a new session?', cls: 'ds-metric-label' });
		}

		// Today's metrics
		const todaySection = container.createEl('div', { cls: 'ds-analytics-section' });
		todaySection.createEl('h3', { text: '📊 Today\'s Progress', cls: 'ds-section-title' });
		
		const metricsGrid = todaySection.createEl('div', { cls: 'ds-metrics-grid' });
		
		// Focus time
		const focusCard = metricsGrid.createEl('div', { cls: 'ds-analytics-card' });
		const focusHours = Math.floor(metrics.totalFocusTime / (1000 * 60 * 60));
		const focusMinutes = Math.floor((metrics.totalFocusTime % (1000 * 60 * 60)) / (1000 * 60));
		const focusDisplay = focusHours > 0 ? `${focusHours}h ${focusMinutes}m` : `${focusMinutes}m`;
		focusCard.createEl('div', { text: focusDisplay, cls: 'ds-metric-value' });
		focusCard.createEl('div', { text: '🎯 Focus Time', cls: 'ds-metric-label' });

		// Break time
		const breakCard = metricsGrid.createEl('div', { cls: 'ds-analytics-card' });
		const breakHours = Math.floor(metrics.totalBreakTime / (1000 * 60 * 60));
		const breakMinutes = Math.floor((metrics.totalBreakTime % (1000 * 60 * 60)) / (1000 * 60));
		const breakDisplay = breakHours > 0 ? `${breakHours}h ${breakMinutes}m` : `${breakMinutes}m`;
		breakCard.createEl('div', { text: breakDisplay, cls: 'ds-metric-value' });
		breakCard.createEl('div', { text: '☕ Break Time', cls: 'ds-metric-label' });

		// Plugin interactions
		const interactionsCard = metricsGrid.createEl('div', { cls: 'ds-analytics-card' });
		interactionsCard.createEl('div', { text: metrics.pluginInteractions.toString(), cls: 'ds-metric-value' });
		interactionsCard.createEl('div', { text: '⚡ Interactions', cls: 'ds-metric-label' });

		// Hyperfocus episodes
		const hyperfocusCard = metricsGrid.createEl('div', { cls: 'ds-analytics-card' });
		hyperfocusCard.createEl('div', { text: metrics.hyperfocusEpisodes.toString(), cls: 'ds-metric-value' });
		hyperfocusCard.createEl('div', { text: '🔥 Hyperfocus Episodes', cls: 'ds-metric-label' });

		// Recent activity timeline
		const activitySection = container.createEl('div', { cls: 'ds-analytics-section' });
		activitySection.createEl('h3', { text: '📈 Recent Activity', cls: 'ds-section-title' });
		
		const recentEvents = todayEvents.slice(-8).reverse(); // Last 8 events, most recent first
		
		if (recentEvents.length === 0) {
			const emptyState = activitySection.createEl('div', { cls: 'ds-analytics-empty' });
			emptyState.createEl('div', { text: '🌱', cls: 'ds-empty-icon' });
			emptyState.createEl('div', { text: 'Start using the plugin to see your activity!', cls: 'ds-empty-text' });
		} else {
			const timeline = activitySection.createEl('div', { cls: 'ds-timeline' });
			
			recentEvents.forEach(event => {
				const eventEl = timeline.createEl('div', { cls: 'ds-timeline-event' });
				
				const time = new Date(event.timestamp).toLocaleTimeString('en-US', { 
					hour: 'numeric', 
					minute: '2-digit',
					hour12: true 
				});
				
				const icon = this.getEventIcon(event.type);
				const description = this.getEventDescription(event);
				
				eventEl.createEl('span', { text: time, cls: 'ds-event-time' });
				eventEl.createEl('span', { text: icon, cls: 'ds-event-icon' });
				eventEl.createEl('span', { text: description, cls: 'ds-event-description' });
				
				if (event.context) {
					eventEl.createEl('span', { text: event.context, cls: 'ds-event-context' });
				}
			});
		}

		// ADHD-friendly insights
		const insights = this.generateInsights(metrics, todayEvents);
		if (insights.length > 0) {
			const insightsSection = container.createEl('div', { cls: 'ds-analytics-section' });
			insightsSection.createEl('h3', { text: '💡 ADHD-Friendly Insights', cls: 'ds-section-title' });
			
			const insightsList = insightsSection.createEl('div', { cls: 'ds-insights-list' });
			
			insights.forEach(insight => {
				const insightEl = insightsList.createEl('div', { cls: 'ds-insight' });
				insightEl.createEl('span', { text: insight.icon, cls: 'ds-insight-icon' });
				insightEl.createEl('span', { text: insight.text, cls: 'ds-insight-text' });
			});
		}

		// Quick actions
		const actionsSection = container.createEl('div', { cls: 'ds-analytics-section' });
		actionsSection.createEl('h3', { text: '⚡ Quick Actions', cls: 'ds-section-title' });
		
		const actionsGrid = actionsSection.createEl('div', { cls: 'ds-actions-grid' });
		
		const startBreakBtn = actionsGrid.createEl('button', { 
			text: '☕ Start Break', 
			cls: 'ds-action-button ds-break-button' 
		});
		startBreakBtn.onclick = () => {
			this.sessionService.startBreak();
			this.renderView();
		};
		
		const endBreakBtn = actionsGrid.createEl('button', { 
			text: '🎯 End Break', 
			cls: 'ds-action-button ds-focus-button' 
		});
		endBreakBtn.onclick = () => {
			this.sessionService.endBreak();
			this.renderView();
		};
		
		// Only show appropriate button based on current state
		if (metrics.currentSessionStart) {
			endBreakBtn.style.display = 'none';
		} else {
			startBreakBtn.style.display = 'none';
		}
	}

	private getEventIcon(type: SessionEvent['type']): string {
		switch (type) {
			case 'focus_start': return '🎯';
			case 'focus_end': return '⏸️';
			case 'break_start': return '☕';
			case 'break_end': return '🔋';
			case 'hyperfocus_detected': return '🔥';
			case 'plugin_interaction': return '⚡';
			default: return '📋';
		}
	}

	private getEventDescription(event: SessionEvent): string {
		switch (event.type) {
			case 'focus_start': return 'Started focus session';
			case 'focus_end': return 'Ended focus session';
			case 'break_start': return 'Started break';
			case 'break_end': return 'Ended break';
			case 'hyperfocus_detected': return 'Hyperfocus detected';
			case 'plugin_interaction': return event.context || 'Plugin interaction';
			default: return 'Unknown event';
		}
	}

	private generateInsights(metrics: SessionMetrics, events: SessionEvent[]): Array<{icon: string, text: string}> {
		const insights: Array<{icon: string, text: string}> = [];
		
		// Focus time insights
		const focusHours = metrics.totalFocusTime / (1000 * 60 * 60);
		if (focusHours > 4) {
			insights.push({
				icon: '🌟',
				text: 'Great focus today! You\'ve had over 4 hours of focused work.'
			});
		} else if (focusHours < 1 && events.length > 0) {
			insights.push({
				icon: '🌱',
				text: 'Remember, even small amounts of focus time count. Every minute matters!'
			});
		}

		// Break compliance
		const timeSinceLastBreak = Date.now() - metrics.lastBreak;
		const minutesSinceBreak = timeSinceLastBreak / (1000 * 60);
		if (minutesSinceBreak > 90) {
			insights.push({
				icon: '☕',
				text: 'It\'s been a while since your last break. Consider taking a short breather.'
			});
		}

		// Hyperfocus patterns
		if (metrics.hyperfocusEpisodes > 2) {
			insights.push({
				icon: '🔥',
				text: 'Multiple hyperfocus episodes today - great productivity! Remember to hydrate.'
			});
		} else if (metrics.hyperfocusEpisodes === 1) {
			insights.push({
				icon: '🎯',
				text: 'One hyperfocus episode detected. You\'re in the zone today!'
			});
		}

		// Interaction patterns
		if (metrics.pluginInteractions > 20) {
			insights.push({
				icon: '⚡',
				text: 'Very active plugin usage today - you\'re really engaged with your work!'
			});
		}

		// Average session feedback
		if (metrics.averageSessionLength > 0) {
			const avgMinutes = Math.floor(metrics.averageSessionLength / (1000 * 60));
			if (avgMinutes > 60) {
				insights.push({
					icon: '⏰',
					text: `Your average session is ${avgMinutes} minutes. Consider shorter breaks to maintain energy.`
				});
			} else if (avgMinutes < 20) {
				insights.push({
					icon: '🔄',
					text: `Short sessions (${avgMinutes} min avg) can be great for ADHD - keep up the momentum!`
				});
			}
		}

		return insights;
	}
}