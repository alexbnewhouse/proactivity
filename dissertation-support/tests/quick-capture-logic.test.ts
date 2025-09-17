import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock Obsidian classes and Quick Capture Modal
class MockApp {
	vault = {
		create: jest.fn(),
		append: jest.fn()
	};
}

class MockPlugin {
	settings = {
		dailyTasks: {}
	};
	taskService = {
		createTask: jest.fn(),
		getTasksForDate: jest.fn(() => [])
	};
}

// We'll test the logic that would be in QuickCaptureModal
// Since testing actual modal UI is complex, we focus on the categorization and routing logic

describe('Quick Capture Logic', () => {
	let mockApp: MockApp;
	let mockPlugin: MockPlugin;

	beforeEach(() => {
		jest.clearAllMocks();
		mockApp = new MockApp();
		mockPlugin = new MockPlugin();
	});

	describe('Content Categorization', () => {
		test('should identify task-like content', () => {
			const taskInputs = [
				'Review chapter 3 draft',
				'Call advisor about timeline',
				'Fix citation format',
				'Schedule defense presentation'
			];

			taskInputs.forEach(input => {
				const category = categorizeContent(input);
				expect(category.suggestedType).toBe('task');
				expect(category.confidence).toBeGreaterThan(0.7);
			});
		});

		test('should identify idea content', () => {
			const ideaInputs = [
				'Interesting connection between theories X and Y',
				'Maybe the framework could include...',
				'Novel approach: combining ethnography with surveys'
			];

			ideaInputs.forEach(input => {
				const category = categorizeContent(input);
				expect(category.suggestedType).toBe('idea');
				expect(category.confidence).toBeGreaterThan(0.6);
			});
		});

		test('should identify reference content', () => {
			const referenceInputs = [
				'Smith, J. (2023) has great insights on this topic',
				'Check out https://example.com/research-paper',
				'DOI: 10.1000/example',
				'The book "Academic Writing" by Johnson covers this'
			];

			referenceInputs.forEach(input => {
				const category = categorizeContent(input);
				expect(category.suggestedType).toBe('reference');
				expect(category.confidence).toBeGreaterThan(0.8);
			});
		});

		test('should identify questions', () => {
			const questionInputs = [
				'How does this relate to the theoretical framework?',
				'What\'s the sample size for this study?',
				'Why did they choose this methodology?',
				'Where can I find more sources on this topic?'
			];

			questionInputs.forEach(input => {
				const category = categorizeContent(input);
				expect(category.suggestedType).toBe('question');
				expect(category.confidence).toBeGreaterThan(0.9);
			});
		});

		test('should handle ambiguous content gracefully', () => {
			const ambiguousInputs = [
				'Something',
				'Test',
				'Hmm',
				'...'
			];

			ambiguousInputs.forEach(input => {
				const category = categorizeContent(input);
				expect(category.suggestedType).toBe('note'); // Default fallback
				expect(category.confidence).toBeLessThan(0.5);
			});
		});
	});

	describe('Content Routing', () => {
		test('should route tasks to task service', async () => {
			const taskContent = 'Review methodology section';
			const priority = 'high';
			
			await routeContent(mockApp as any, mockPlugin as any, {
				content: taskContent,
				type: 'task',
				priority: priority
			});

			expect(mockPlugin.taskService.createTask).toHaveBeenCalledWith(
				expect.objectContaining({
					text: taskContent,
					priority: priority
				})
			);
		});

		test('should route ideas to inbox file', async () => {
			const ideaContent = 'New theoretical framework approach';
			
			await routeContent(mockApp as any, mockPlugin as any, {
				content: ideaContent,
				type: 'idea',
				priority: 'medium'
			});

			expect(mockApp.vault.append).toHaveBeenCalledWith(
				expect.any(String), // file path
				expect.stringContaining(ideaContent)
			);
		});

		test('should route references to reference database', async () => {
			const refContent = 'Smith, J. (2023). Important Research. Journal of Excellence.';
			
			await routeContent(mockApp as any, mockPlugin as any, {
				content: refContent,
				type: 'reference',
				priority: 'low'
			});

			expect(mockApp.vault.append).toHaveBeenCalledWith(
				'References.md',
				expect.stringContaining(refContent)
			);
		});

		test('should route questions with follow-up tags', async () => {
			const questionContent = 'How does this methodology compare to alternatives?';
			
			await routeContent(mockApp as any, mockPlugin as any, {
				content: questionContent,
				type: 'question',
				priority: 'high'
			});

			expect(mockApp.vault.append).toHaveBeenCalledWith(
				expect.any(String),
				expect.stringContaining('#question #follow-up')
			);
		});
	});

	describe('Priority Handling', () => {
		test('should apply priority to task creation', async () => {
			await routeContent(mockApp as any, mockPlugin as any, {
				content: 'Urgent deadline task',
				type: 'task',
				priority: 'high'
			});

			const createTaskCall = mockPlugin.taskService.createTask.mock.calls[0][0] as any;
			expect(createTaskCall.priority).toBe('high');
		});

		test('should add priority tags to non-task content', async () => {
			await routeContent(mockApp as any, mockPlugin as any, {
				content: 'Important idea',
				type: 'idea',
				priority: 'high'
			});

			const appendCall = mockApp.vault.append.mock.calls[0][1];
			expect(appendCall).toContain('#priority-high');
		});
	});
});

// Utility functions that would be extracted from QuickCaptureModal
interface ContentCategory {
	suggestedType: 'task' | 'idea' | 'reference' | 'question' | 'note';
	confidence: number;
	reasoning?: string;
}

interface CaptureData {
	content: string;
	type: string;
	priority: string;
}

function categorizeContent(content: string): ContentCategory {
	const lowerContent = content.toLowerCase();
	
	// Question detection (highest confidence)
	if (content.includes('?') || lowerContent.startsWith('how ') || 
		lowerContent.startsWith('what ') || lowerContent.startsWith('why ') || 
		lowerContent.startsWith('where ') || lowerContent.startsWith('when ')) {
		return { suggestedType: 'question', confidence: 0.95 };
	}
	
	// Reference detection
	if (content.match(/https?:\/\//) || content.match(/DOI:|doi:/) || 
		content.match(/\(\d{4}\)/) || lowerContent.includes('book ') ||
		lowerContent.includes('paper ') || lowerContent.includes('study ')) {
		return { suggestedType: 'reference', confidence: 0.85 };
	}
	
	// Task detection
	const taskWords = ['review', 'fix', 'call', 'schedule', 'write', 'complete', 'finish', 'check'];
	if (taskWords.some(word => lowerContent.includes(word))) {
		return { suggestedType: 'task', confidence: 0.8 };
	}
	
	// Idea detection  
	const ideaWords = ['what if', 'maybe', 'idea:', 'approach', 'framework', 'theory', 'connection'];
	if (ideaWords.some(word => lowerContent.includes(word))) {
		return { suggestedType: 'idea', confidence: 0.7 };
	}
	
	// Default to note with low confidence
	return { suggestedType: 'note', confidence: 0.3 };
}

async function routeContent(app: any, plugin: any, data: CaptureData): Promise<void> {
	const timestamp = new Date().toISOString();
	
	try {
		switch (data.type) {
			case 'task':
				plugin.taskService.createTask({
					text: data.content,
					priority: data.priority,
					created: timestamp
				});
				break;
				
			case 'idea':
				const ideaFile = 'Ideas Inbox.md';
				const ideaContent = `\n## ${timestamp}\n${data.content}\n#idea #priority-${data.priority}\n`;
				await app.vault.append(ideaFile, ideaContent);
				break;
				
			case 'reference':
				const refFile = 'References.md';
				const refContent = `\n- ${data.content} #reference #priority-${data.priority}\n`;
				await app.vault.append(refFile, refContent);
				break;
				
			case 'question':
				const questionsFile = 'Questions & Follow-ups.md';
				const questionContent = `\n## ${timestamp}\n${data.content}\n#question #follow-up #priority-${data.priority}\n`;
				await app.vault.append(questionsFile, questionContent);
				break;
				
			default:
				// Route to daily note
				const today = new Date().toISOString().split('T')[0];
				const dailyFile = `${today}.md`;
				const noteContent = `\n- ${data.content} #quick-capture #priority-${data.priority}\n`;
				await app.vault.append(dailyFile, noteContent);
		}
	} catch (error) {
		console.error('Failed to route captured content:', error);
		throw error;
	}
}