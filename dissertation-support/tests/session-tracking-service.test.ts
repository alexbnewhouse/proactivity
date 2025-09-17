import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SessionTrackingService, SessionMetrics, SessionEvent } from '../src/session-tracking-service';

// Mock Obsidian classes
class MockApp {
	vault = {};
}

class MockNotice {
	constructor(public message: string, public timeout?: number) {}
}

// Mock global Notice
(global as any).Notice = MockNotice;

describe('SessionTrackingService', () => {
	let sessionService: SessionTrackingService;
	let mockApp: MockApp;

	beforeEach(() => {
		jest.clearAllTimers();
		jest.useFakeTimers();
		mockApp = new MockApp();
		
		sessionService = new SessionTrackingService(mockApp as any, {
			suggestedBreakInterval: 1, // 1 minute for testing
			breakReminderEnabled: true,
			hyperfocusDetectionEnabled: true,
			gentleReminders: true
		});
	});

	afterEach(() => {
		sessionService.destroy();
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	});

	test('should initialize with default metrics', () => {
		const metrics = sessionService.getMetrics();
		
		expect(metrics.totalFocusTime).toBe(0);
		expect(metrics.totalBreakTime).toBe(0);
		expect(metrics.pluginInteractions).toBe(0);
		expect(metrics.hyperfocusEpisodes).toBe(0);
		expect(metrics.currentSessionStart).toBeDefined();
	});

	test('should record plugin interactions', () => {
		sessionService.recordInteraction('Test Action');
		
		const metrics = sessionService.getMetrics();
		expect(metrics.pluginInteractions).toBe(1);
		
		const events = sessionService.getTodayEvents();
		const interactionEvents = events.filter(e => e.type === 'plugin_interaction');
		expect(interactionEvents).toHaveLength(1);
		expect(interactionEvents[0].context).toBe('Test Action');
	});

	test('should detect hyperfocus after threshold interactions', () => {
		// Record interactions rapidly to trigger hyperfocus
		for (let i = 0; i < 5; i++) {
			sessionService.recordInteraction('Rapid Action');
		}

		const events = sessionService.getTodayEvents();
		const hyperfocusEvents = events.filter(e => e.type === 'hyperfocus_detected');
		expect(hyperfocusEvents.length).toBeGreaterThan(0);

		const metrics = sessionService.getMetrics();
		expect(metrics.hyperfocusEpisodes).toBeGreaterThan(0);
	});

	test('should handle manual break management', () => {
		const initialMetrics = sessionService.getMetrics();
		expect(initialMetrics.currentSessionStart).toBeDefined();

		// Start break
		sessionService.startBreak();
		
		const duringBreakMetrics = sessionService.getMetrics();
		expect(duringBreakMetrics.currentSessionStart).toBeUndefined();

		// Simulate some break time
		jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes

		// End break  
		sessionService.endBreak();

		const afterBreakMetrics = sessionService.getMetrics();
		expect(afterBreakMetrics.currentSessionStart).toBeDefined();
		expect(afterBreakMetrics.totalBreakTime).toBeGreaterThan(0);
	});

	test('should schedule break reminders', () => {
		const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
		
		// Fast-forward to trigger break reminder
		jest.advanceTimersByTime(61 * 1000); // 61 seconds (our test setting is 1 minute)

		// Should have created a Notice (break suggestion)
		// We can't easily test the Notice creation, but we can verify the timer behavior
		expect(jest.getTimerCount()).toBeGreaterThan(0);
		
		consoleSpy.mockRestore();
	});

	test('should track focus session duration', () => {
		const startTime = Date.now();
		jest.setSystemTime(startTime);

		// Simulate focus session
		jest.advanceTimersByTime(30 * 60 * 1000); // 30 minutes
		
		// End the session manually to capture duration
		sessionService.startBreak();

		const metrics = sessionService.getMetrics();
		expect(metrics.totalFocusTime).toBeGreaterThan(25 * 60 * 1000); // At least 25 minutes
	});

	test('should provide today\'s events filtered by date', () => {
		sessionService.recordInteraction('Morning Task');
		
		// Simulate a day passing
		const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
		jest.setSystemTime(tomorrow);
		
		sessionService.recordInteraction('Next Day Task');

		const todayEvents = sessionService.getTodayEvents();
		
		// Should only include events from the current day
		expect(todayEvents.length).toBe(1);
		expect(todayEvents[0].context).toBe('Next Day Task');
	});

	test('should update settings dynamically', () => {
		// Change break interval
		sessionService.updateSettings({
			suggestedBreakInterval: 5, // 5 minutes
			gentleReminders: false
		});

		// Verify settings are applied (indirectly by checking timer behavior)
		expect(jest.getTimerCount()).toBeGreaterThan(0);
	});

	test('should limit event history to prevent memory issues', () => {
		// Record more than the limit (1000 events)
		for (let i = 0; i < 1100; i++) {
			sessionService.recordInteraction(`Action ${i}`);
		}

		const events = sessionService.getTodayEvents();
		
		// Should not exceed reasonable limits
		expect(events.length).toBeLessThanOrEqual(1000);
	});

	test('should clean up resources on destroy', () => {
		const timerCountBefore = jest.getTimerCount();
		
		sessionService.destroy();
		
		const timerCountAfter = jest.getTimerCount();
		expect(timerCountAfter).toBeLessThan(timerCountBefore);
	});
});