/**
 * ADHD-Friendly Project Kanban Service
 * 
 * Philosophy:
 * - Visual project management that evolves with AI insights
 * - Energy-aware task organization and time estimation
 * - Multi-level hierarchy: Project → Phase → Task → Subtask
 * - Integration with existing micro-tasks and templates
 * - Focus views to prevent overwhelm
 */

import { MicroTask, TaskService } from './task-service';
import { AcademicTemplate } from './academic-templates';

export type KanbanCardStatus = 'not-started' | 'in-progress' | 'completed' | 'blocked';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type TimeEstimate = {
	optimistic: number;  // minutes
	realistic: number;   // minutes  
	pessimistic: number; // minutes
};

export interface KanbanColumn {
	id: string;
	title: string;
	description: string;
	order: number;
	color: string;
	isCollapsed: boolean;
	cardLimit?: number; // WIP limit for focus
}

export interface KanbanCard {
	id: string;
	title: string;
	description: string;
	columnId: string;
	order: number;
	status: KanbanCardStatus;
	
	// ADHD-Optimized Metadata
	energyLevel: EnergyLevel;
	timeEstimate: TimeEstimate;
	actualTimeSpent: number; // minutes tracked
	
	// Task Breakdown
	subtasks: MicroTask[];
	dependencies: string[]; // Other card IDs this depends on
	blockers: string[];     // What's preventing progress
	
	// Context & Progress
	tags: string[];
	priority: 'low' | 'medium' | 'high' | 'urgent';
	dueDate?: string; // ISO date string
	completionPercentage: number; // 0-100
	
	// ADHD Support
	estimatedPomodoros: number;
	adhdTips: string[];
	focusNotes: string; // User notes for maintaining context
	
	// Timestamps
	created: number;
	updated: number;
	started?: number;
	completed?: number;
}

export interface KanbanBoard {
	id: string;
	projectId: string;
	title: string;
	description: string;
	templateId?: string; // Link to academic template used
	
	columns: KanbanColumn[];
	cards: KanbanCard[];
	
	// Board Configuration
	settings: KanbanBoardSettings;
	
	// Progress Tracking
	totalCards: number;
	completedCards: number;
	totalEstimatedHours: number;
	actualTimeSpent: number;
	
	// Timestamps
	created: number;
	updated: number;
}

export interface KanbanBoardSettings {
	showSubtasks: boolean;
	showTimeEstimates: boolean;
	showEnergyLevels: boolean;
	enableDragDrop: boolean;
	autoArchiveCompleted: boolean;
	maxCardsPerColumn?: number;
	focusMode: 'all' | 'today' | 'this-week' | 'current-phase';
	energyFilter?: EnergyLevel[]; // Show only cards matching current energy
}

export interface KanbanFilter {
	energyLevels: EnergyLevel[];
	priorities: string[];
	tags: string[];
	dueWithinDays?: number;
	showOnlyAvailable: boolean; // Hide blocked cards
}

export interface KanbanStats {
	totalCards: number;
	completedCards: number;
	inProgressCards: number;
	blockedCards: number;
	averageCardTime: number; // minutes
	totalProjectTime: number; // minutes
	estimatedTimeRemaining: number;
	completionPercentage: number;
	velocityCardsPerWeek: number;
}

export class ProjectKanbanService {
	private boards: Map<string, KanbanBoard> = new Map();
	private taskService: TaskService;

	constructor(taskService: TaskService) {
		this.taskService = taskService;
	}

	/**
	 * Create a new Kanban board from an academic template
	 * ADHD-friendly: Pre-structured columns and cards reduce decision fatigue
	 */
	createBoardFromTemplate(
		template: AcademicTemplate, 
		projectTitle: string,
		projectContext?: any
	): KanbanBoard {
		const boardId = `kanban-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		
		// Create columns from template phases
		const columns: KanbanColumn[] = template.phases.map((phase, index) => ({
			id: `column-${phase.name.toLowerCase().replace(/\s+/g, '-')}`,
			title: phase.name,
			description: phase.description,
			order: index,
			color: this.getPhaseColor(index),
			isCollapsed: false,
			cardLimit: this.getColumnWIPLimit(phase.name)
		}));

		// Add final completion column
		columns.push({
			id: 'column-completed',
			title: '✅ Complete',
			description: 'Finished tasks and deliverables',
			order: columns.length,
			color: '#4FAA74', // Green
			isCollapsed: false
		});

		// Create cards from template tasks
		const cards: KanbanCard[] = [];
		let cardOrder = 0;

		template.phases.forEach((phase, phaseIndex) => {
			const columnId = `column-${phase.name.toLowerCase().replace(/\s+/g, '-')}`;
			
			phase.tasks.forEach((task, taskIndex) => {
				const cardId = `card-${boardId}-${cardOrder}`;
				
				// Convert template task to micro-tasks for subtasks
				const subtasks: MicroTask[] = this.breakDownTask(task, cardId);
				
				// Calculate time estimates based on task complexity
				const timeEstimate = this.estimateTaskTime(task, subtasks);
				
				cards.push({
					id: cardId,
					title: task.title,
					description: task.description,
					columnId: columnId,
					order: cardOrder++,
					status: 'not-started',
					
					energyLevel: task.energyLevel === 'moderate' ? 'medium' : task.energyLevel as EnergyLevel,
					timeEstimate: timeEstimate,
					actualTimeSpent: 0,
					
					subtasks: subtasks,
					dependencies: this.findDependencies(task, cards),
					blockers: [],
					
					tags: this.generateCardTags(task, phase),
					priority: this.assessTaskPriority(task, phaseIndex),
					completionPercentage: 0,
					
					estimatedPomodoros: Math.ceil(timeEstimate.realistic / 25),
					adhdTips: task.tips || this.generateADHDTips(task),
					focusNotes: '',
					
					created: Date.now(),
					updated: Date.now()
				});
			});
		});

		const board: KanbanBoard = {
			id: boardId,
			projectId: projectContext?.sessionId || boardId,
			title: projectTitle,
			description: `${template.name} project board`,
			templateId: template.id,
			
			columns: columns,
			cards: cards,
			
			settings: {
				showSubtasks: true,
				showTimeEstimates: true,
				showEnergyLevels: true,
				enableDragDrop: true,
				autoArchiveCompleted: false,
				focusMode: 'all'
			},
			
			totalCards: cards.length,
			completedCards: 0,
			totalEstimatedHours: cards.reduce((sum, card) => sum + (card.timeEstimate.realistic / 60), 0),
			actualTimeSpent: 0,
			
			created: Date.now(),
			updated: Date.now()
		};

		this.boards.set(boardId, board);
		console.log(`[Kanban] Created board "${projectTitle}" with ${cards.length} cards across ${columns.length} phases`);
		
		return board;
	}

	/**
	 * Move a card to a different column
	 * ADHD-friendly: Automatic status updates and progress tracking
	 */
	moveCard(boardId: string, cardId: string, targetColumnId: string, newOrder?: number): boolean {
		const board = this.boards.get(boardId);
		if (!board) return false;

		const card = board.cards.find(c => c.id === cardId);
		const targetColumn = board.columns.find(c => c.id === targetColumnId);
		if (!card || !targetColumn) return false;

		// Update card position
		card.columnId = targetColumnId;
		card.updated = Date.now();
		
		if (newOrder !== undefined) {
			card.order = newOrder;
		}

		// Update card status based on column
		if (targetColumnId === 'column-completed') {
			card.status = 'completed';
			card.completed = Date.now();
			card.completionPercentage = 100;
			
			// Update board stats
			board.completedCards++;
		} else if (card.status === 'completed') {
			// Moving out of completed
			board.completedCards--;
			card.status = 'in-progress';
			card.started = card.started || Date.now();
		} else if (card.status === 'not-started') {
			card.status = 'in-progress';
			card.started = Date.now();
		}

		board.updated = Date.now();
		this.saveBoard(board);
		
		console.log(`[Kanban] Moved card "${card.title}" to "${targetColumn.title}"`);
		return true;
	}

	/**
	 * Add a new card to the board
	 * ADHD-friendly: Smart defaults and energy estimation
	 */
	addCard(
		boardId: string, 
		title: string, 
		description: string, 
		columnId: string,
		options: Partial<KanbanCard> = {}
	): KanbanCard | null {
		const board = this.boards.get(boardId);
		if (!board) return null;

		const cardId = `card-${boardId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
		
		// Smart defaults for new cards
		const defaultTimeEstimate: TimeEstimate = {
			optimistic: 15,
			realistic: 25,
			pessimistic: 45
		};

		const newCard: KanbanCard = {
			id: cardId,
			title: title,
			description: description,
			columnId: columnId,
			order: board.cards.filter(c => c.columnId === columnId).length,
			status: 'not-started',
			
			energyLevel: 'medium',
			timeEstimate: defaultTimeEstimate,
			actualTimeSpent: 0,
			
			subtasks: [],
			dependencies: [],
			blockers: [],
			
			tags: [],
			priority: 'medium',
			completionPercentage: 0,
			
			estimatedPomodoros: 1,
			adhdTips: ['Break this down into smaller steps if it feels overwhelming'],
			focusNotes: '',
			
			created: Date.now(),
			updated: Date.now(),
			
			...options
		};

		board.cards.push(newCard);
		board.totalCards++;
		board.updated = Date.now();
		
		this.saveBoard(board);
		
		console.log(`[Kanban] Added new card "${title}" to board "${board.title}"`);
		return newCard;
	}

	/**
	 * Break down a card into smaller subtasks
	 * ADHD-friendly: Prevents overwhelm by chunking large tasks
	 */
	breakDownCard(boardId: string, cardId: string, subtaskTitles: string[]): boolean {
		const board = this.boards.get(boardId);
		const card = board?.cards.find(c => c.id === cardId);
		if (!board || !card) return false;

		// Create micro-tasks for each subtask
		const newSubtasks: MicroTask[] = subtaskTitles.map((title, index) => ({
			id: `${cardId}-subtask-${index}`,
			text: title,
			status: 'todo',
			order: index,
			created: Date.now(),
			updated: Date.now()
		}));

		card.subtasks.push(...newSubtasks);
		card.updated = Date.now();
		
		// Update time estimates based on subtasks
		const subtaskTime = newSubtasks.length * 15; // 15 min per subtask
		card.timeEstimate.realistic += subtaskTime;
		card.timeEstimate.pessimistic += subtaskTime * 1.5;
		card.estimatedPomodoros = Math.ceil(card.timeEstimate.realistic / 25);

		board.updated = Date.now();
		this.saveBoard(board);

		console.log(`[Kanban] Added ${newSubtasks.length} subtasks to card "${card.title}"`);
		return true;
	}

	/**
	 * Get cards that match current user energy and focus settings
	 * ADHD-friendly: Show only relevant tasks to prevent overwhelm
	 */
	getFilteredCards(boardId: string, filter: KanbanFilter): KanbanCard[] {
		const board = this.boards.get(boardId);
		if (!board) return [];

		return board.cards.filter(card => {
			// Energy level filter
			if (filter.energyLevels.length > 0 && !filter.energyLevels.includes(card.energyLevel)) {
				return false;
			}

			// Priority filter
			if (filter.priorities.length > 0 && !filter.priorities.includes(card.priority)) {
				return false;
			}

			// Tag filter
			if (filter.tags.length > 0 && !filter.tags.some(tag => card.tags.includes(tag))) {
				return false;
			}

			// Due date filter
			if (filter.dueWithinDays && card.dueDate) {
				const dueDate = new Date(card.dueDate);
				const today = new Date();
				const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
				if (daysDiff > filter.dueWithinDays) {
					return false;
				}
			}

			// Show only available (not blocked)
			if (filter.showOnlyAvailable && (card.blockers.length > 0 || card.status === 'blocked')) {
				return false;
			}

			return true;
		});
	}

	/**
	 * Get board statistics for progress tracking
	 * ADHD-friendly: Visual feedback and momentum tracking
	 */
	getBoardStats(boardId: string): KanbanStats | null {
		const board = this.boards.get(boardId);
		if (!board) return null;

		const totalCards = board.cards.length;
		const completedCards = board.cards.filter(c => c.status === 'completed').length;
		const inProgressCards = board.cards.filter(c => c.status === 'in-progress').length;
		const blockedCards = board.cards.filter(c => c.status === 'blocked').length;
		
		const totalProjectTime = board.cards.reduce((sum, card) => sum + card.actualTimeSpent, 0);
		const averageCardTime = completedCards > 0 ? totalProjectTime / completedCards : 0;
		
		const totalEstimatedTime = board.cards
			.filter(c => c.status !== 'completed')
			.reduce((sum, card) => sum + card.timeEstimate.realistic, 0);

		const completionPercentage = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;

		// Calculate velocity (cards completed per week)
		const boardAgeWeeks = Math.max(1, (Date.now() - board.created) / (1000 * 60 * 60 * 24 * 7));
		const velocityCardsPerWeek = completedCards / boardAgeWeeks;

		return {
			totalCards,
			completedCards,
			inProgressCards,
			blockedCards,
			averageCardTime,
			totalProjectTime,
			estimatedTimeRemaining: totalEstimatedTime,
			completionPercentage,
			velocityCardsPerWeek
		};
	}

	/**
	 * Suggest next best cards based on ADHD-friendly criteria
	 * ADHD-friendly: Smart recommendations based on energy, time, and dependencies
	 */
	suggestNextCards(
		boardId: string, 
		currentEnergy: EnergyLevel, 
		availableMinutes: number
	): KanbanCard[] {
		const board = this.boards.get(boardId);
		if (!board) return [];

		const availableCards = board.cards.filter(card => 
			card.status === 'not-started' &&
			card.blockers.length === 0 &&
			card.dependencies.every(depId => {
				const depCard = board.cards.find(c => c.id === depId);
				return depCard?.status === 'completed';
			})
		);

		// Score cards based on ADHD-friendly criteria
		const scoredCards = availableCards.map(card => ({
			card,
			score: this.calculateCardScore(card, currentEnergy, availableMinutes)
		}));

		// Sort by score and return top suggestions
		return scoredCards
			.sort((a, b) => b.score - a.score)
			.slice(0, 5)
			.map(item => item.card);
	}

	// Private helper methods

	private getPhaseColor(index: number): string {
		const colors = ['#5B8DEF', '#4FAA74', '#E2C158', '#E74C3C', '#9B59B6', '#1ABC9C'];
		return colors[index % colors.length];
	}

	private getColumnWIPLimit(phaseName: string): number | undefined {
		// Enforce WIP limits to prevent ADHD overwhelm
		const wipLimits: Record<string, number> = {
			'research': 3,
			'reading': 3,
			'writing': 2,
			'drafting': 2,
			'revision': 2
		};
		
		const normalizedName = phaseName.toLowerCase();
		return Object.keys(wipLimits).find(key => normalizedName.includes(key)) 
			? wipLimits[normalizedName] : undefined;
	}

	private breakDownTask(task: any, cardId: string): MicroTask[] {
		// Convert academic task into ADHD-friendly micro-tasks
		const subtasks: string[] = [];
		
		// Generic task breakdown based on title keywords
		if (task.title.includes('write') || task.title.includes('draft')) {
			subtasks.push('Create outline', 'Write first paragraph', 'Complete rough draft', 'Review and edit');
		} else if (task.title.includes('research') || task.title.includes('find')) {
			subtasks.push('Define search terms', 'Search databases', 'Read and take notes', 'Organize findings');
		} else if (task.title.includes('analyze') || task.title.includes('review')) {
			subtasks.push('Gather materials', 'Initial analysis', 'Deep analysis', 'Synthesize findings');
		} else {
			// Default breakdown
			subtasks.push('Get started', 'Make progress', 'Complete task', 'Review quality');
		}

		return subtasks.map((text, index) => ({
			id: `${cardId}-subtask-${index}`,
			text: text,
			status: 'todo' as const,
			order: index,
			created: Date.now(),
			updated: Date.now()
		}));
	}

	private estimateTaskTime(task: any, subtasks: MicroTask[]): TimeEstimate {
		// Base estimate from template
		const baseMinutes = task.estimatedMinutes || 25;
		
		// Add time for subtasks
		const subtaskMinutes = subtasks.length * 15;
		
		// ADHD-aware time estimation (add buffer for transitions and breaks)
		const realistic = baseMinutes + subtaskMinutes;
		const optimistic = Math.round(realistic * 0.7);
		const pessimistic = Math.round(realistic * 1.8); // ADHD time blindness buffer
		
		return { optimistic, realistic, pessimistic };
	}

	private findDependencies(task: any, existingCards: KanbanCard[]): string[] {
		// Simple dependency detection based on task dependencies from template
		if (task.dependencies && task.dependencies.length > 0) {
			return existingCards
				.filter(card => task.dependencies.includes(card.title))
				.map(card => card.id);
		}
		return [];
	}

	private generateCardTags(task: any, phase: any): string[] {
		const tags = [phase.name.toLowerCase()];
		
		// Add tags based on task characteristics
		if (task.title.includes('write')) tags.push('writing');
		if (task.title.includes('research')) tags.push('research');
		if (task.title.includes('analyze')) tags.push('analysis');
		if (task.energyLevel === 'high') tags.push('high-energy');
		
		return tags;
	}

	private assessTaskPriority(task: any, phaseIndex: number): 'low' | 'medium' | 'high' | 'urgent' {
		// Earlier phases are generally higher priority
		if (phaseIndex === 0) return 'high';
		if (phaseIndex === 1) return 'medium';
		return 'low';
	}

	private generateADHDTips(task: any): string[] {
		const tips = [
			'Break this into 25-minute focused sessions',
			'Set a timer to maintain awareness of time spent',
			'Take breaks between subtasks to prevent burnout'
		];

		// Add specific tips based on task type
		if (task.energyLevel === 'high') {
			tips.push('Schedule this for when your energy is highest');
		}
		
		if (task.title.includes('write')) {
			tips.push('Start with a terrible first draft - editing is easier than creating');
		}
		
		return tips;
	}

	private calculateCardScore(
		card: KanbanCard, 
		currentEnergy: EnergyLevel, 
		availableMinutes: number
	): number {
		let score = 0;

		// Energy match bonus
		if (card.energyLevel === currentEnergy) score += 50;
		else if (
			(card.energyLevel === 'low' && currentEnergy === 'medium') ||
			(card.energyLevel === 'medium' && currentEnergy === 'high')
		) score += 25;

		// Time fit bonus
		if (card.timeEstimate.realistic <= availableMinutes) score += 30;
		else if (card.timeEstimate.optimistic <= availableMinutes) score += 15;

		// Priority bonus
		const priorityScores = { urgent: 40, high: 30, medium: 20, low: 10 };
		score += priorityScores[card.priority];

		// Completion percentage bonus (encourage finishing started work)
		score += card.completionPercentage * 0.3;

		// Quick win bonus for short tasks
		if (card.timeEstimate.realistic <= 15) score += 20;

		return score;
	}

	public saveBoard(board: KanbanBoard): void {
		this.boards.set(board.id, board);
		// TODO: Persist to storage
		console.log(`[Kanban] Saved board "${board.title}"`);
	}

	// Public getters and utility methods

	getBoard(boardId: string): KanbanBoard | undefined {
		return this.boards.get(boardId);
	}

	getAllBoards(): KanbanBoard[] {
		return Array.from(this.boards.values());
	}

	deleteBoard(boardId: string): boolean {
		return this.boards.delete(boardId);
	}

	/**
	 * Create a demo board for testing and initial setup
	 */
	createDemoBoard(): KanbanBoard {
		const boardId = `demo-board-${Date.now()}`;
		
		const demoBoard: KanbanBoard = {
			id: boardId,
			projectId: 'demo-project',
			title: 'Digital Humanities PhD Chapter 3: "Social Media and Academic Identity"',
			description: 'Third chapter of dissertation analyzing how academics construct professional identity on social media platforms',
			columns: [
				{
					id: 'planning',
					title: '📋 Planning & Research',
					description: 'Initial research and planning phase',
					order: 0,
					color: '#e3f2fd',
					isCollapsed: false,
					cardLimit: 4
				},
				{
					id: 'data-collection',
					title: '📊 Data Collection',
					description: 'Gathering and organizing data',
					order: 1,
					color: '#f3e5f5',
					isCollapsed: false,
					cardLimit: 3
				},
				{
					id: 'analysis',
					title: '🔍 Analysis',
					description: 'Analyzing collected data',
					order: 2,
					color: '#fff3e0',
					isCollapsed: false,
					cardLimit: 3
				},
				{
					id: 'writing',
					title: '✍️ Writing',
					description: 'Drafting chapter sections',
					order: 3,
					color: '#e8f5e8',
					isCollapsed: false,
					cardLimit: 2
				},
				{
					id: 'revision',
					title: '📝 Revision',
					description: 'Editing and polishing',
					order: 4,
					color: '#fce4ec',
					isCollapsed: false,
					cardLimit: 2
				},
				{
					id: 'complete',
					title: '✅ Complete',
					description: 'Finished tasks',
					order: 5,
					color: '#e0f2f1',
					isCollapsed: false
				}
			],
			cards: [
				// Planning & Research Phase
				{
					id: `${boardId}-card-1`,
					title: 'Literature review: Academic identity theory',
					description: 'Review existing literature on professional identity construction, focusing on Goffman and Butler',
					columnId: 'complete',
					order: 0,
					status: 'completed',
					energyLevel: 'medium',
					timeEstimate: {
						optimistic: 120,
						realistic: 180,
						pessimistic: 300
					},
					actualTimeSpent: 165,
					subtasks: [
						{ id: 'lit-1', text: 'Search academic databases', status: 'done', order: 0, created: Date.now() - 7200000, updated: Date.now() - 7200000 },
						{ id: 'lit-2', text: 'Read Goffman\'s "Presentation of Self"', status: 'done', order: 1, created: Date.now() - 3600000, updated: Date.now() - 3600000 },
						{ id: 'lit-3', text: 'Take notes on Butler\'s performativity theory', status: 'done', order: 2, created: Date.now() - 1800000, updated: Date.now() - 1800000 },
						{ id: 'lit-4', text: 'Create synthesis document', status: 'done', order: 3, created: Date.now() - 900000, updated: Date.now() - 900000 }
					],
					dependencies: [],
					blockers: [],
					tags: ['literature-review', 'theory', 'identity'],
					priority: 'high',
					dueDate: new Date(Date.now() - 86400000 * 2).toISOString(),
					completionPercentage: 100,
					estimatedPomodoros: 7,
					adhdTips: ['Use citation manager to stay organized', 'Take breaks between dense theoretical texts'],
					focusNotes: 'Pay special attention to how identity is performed vs. authentic',
					created: Date.now() - 604800000,
					updated: Date.now() - 86400000,
					completed: Date.now() - 86400000
				},
				{
					id: `${boardId}-card-2`,
					title: 'Define research questions',
					description: 'Formulate specific research questions for social media analysis',
					columnId: 'data-collection',
					order: 0,
					status: 'in-progress',
					energyLevel: 'high',
					timeEstimate: {
						optimistic: 45,
						realistic: 90,
						pessimistic: 120
					},
					actualTimeSpent: 30,
					subtasks: [
						{ id: 'rq-1', text: 'Brainstorm potential questions', status: 'done', order: 0, created: Date.now() - 3600000, updated: Date.now() - 3600000 },
						{ id: 'rq-2', text: 'Narrow to 3-4 key questions', status: 'doing', order: 1, created: Date.now() - 1800000, updated: Date.now() - 1800000 },
						{ id: 'rq-3', text: 'Validate with advisor', status: 'todo', order: 2, created: Date.now() - 900000, updated: Date.now() - 900000 }
					],
					dependencies: [`${boardId}-card-1`],
					blockers: [],
					tags: ['methodology', 'research-design'],
					priority: 'high',
					dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
					completionPercentage: 60,
					estimatedPomodoros: 4,
					adhdTips: ['Start with broad questions, then narrow down', 'Use mind mapping to visualize connections'],
					focusNotes: 'Remember to align with overall dissertation argument',
					created: Date.now() - 259200000,
					updated: Date.now() - 1800000,
					started: Date.now() - 7200000
				},
				{
					id: `${boardId}-card-3`,
					title: 'Collect Twitter data sample',
					description: 'Gather 200-300 tweets from academic accounts across different disciplines',
					columnId: 'data-collection',
					order: 1,
					status: 'not-started',
					energyLevel: 'low',
					timeEstimate: {
						optimistic: 60,
						realistic: 120,
						pessimistic: 180
					},
					actualTimeSpent: 0,
					subtasks: [
						{ id: 'data-1', text: 'Set up data collection parameters', status: 'todo', order: 0, created: Date.now(), updated: Date.now() },
						{ id: 'data-2', text: 'Identify target academic accounts', status: 'todo', order: 1, created: Date.now(), updated: Date.now() },
						{ id: 'data-3', text: 'Export tweet data', status: 'todo', order: 2, created: Date.now(), updated: Date.now() },
						{ id: 'data-4', text: 'Organize data in spreadsheet', status: 'todo', order: 3, created: Date.now(), updated: Date.now() }
					],
					dependencies: [`${boardId}-card-2`],
					blockers: [],
					tags: ['data-collection', 'social-media', 'twitter'],
					priority: 'medium',
					dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
					completionPercentage: 0,
					estimatedPomodoros: 5,
					adhdTips: ['Set clear stopping points to avoid endless scrolling', 'Use timer to limit data collection sessions'],
					focusNotes: 'Focus on variety across disciplines - STEM, humanities, social sciences',
					created: Date.now() - 86400000,
					updated: Date.now() - 86400000
				},
				{
					id: `${boardId}-card-4`,
					title: 'Code data for identity markers',
					description: 'Identify and categorize identity performance elements in collected tweets',
					columnId: 'analysis',
					order: 0,
					status: 'not-started',
					energyLevel: 'high',
					timeEstimate: {
						optimistic: 180,
						realistic: 300,
						pessimistic: 480
					},
					actualTimeSpent: 0,
					subtasks: [
						{ id: 'code-1', text: 'Develop coding framework', status: 'todo', order: 0, created: Date.now(), updated: Date.now() },
						{ id: 'code-2', text: 'Test coding on sample tweets', status: 'todo', order: 1, created: Date.now(), updated: Date.now() },
						{ id: 'code-3', text: 'Code first 100 tweets', status: 'todo', order: 2, created: Date.now(), updated: Date.now() },
						{ id: 'code-4', text: 'Code remaining tweets', status: 'todo', order: 3, created: Date.now(), updated: Date.now() },
						{ id: 'code-5', text: 'Review and validate codes', status: 'todo', order: 4, created: Date.now(), updated: Date.now() }
					],
					dependencies: [`${boardId}-card-3`],
					blockers: [],
					tags: ['analysis', 'coding', 'qualitative'],
					priority: 'high',
					dueDate: new Date(Date.now() + 86400000 * 14).toISOString(),
					completionPercentage: 0,
					estimatedPomodoros: 12,
					adhdTips: ['Break coding into smaller batches', 'Take breaks to maintain accuracy', 'Use coding software for consistency'],
					focusNotes: 'Look for professional vs personal identity markers, institutional affiliations, expertise claims',
					created: Date.now() - 43200000,
					updated: Date.now() - 43200000
				},
				{
					id: `${boardId}-card-5`,
					title: 'Draft introduction section',
					description: 'Write the opening 1000-1500 words introducing the chapter\'s focus and approach',
					columnId: 'writing',
					order: 0,
					status: 'not-started',
					energyLevel: 'high',
					timeEstimate: {
						optimistic: 90,
						realistic: 150,
						pessimistic: 240
					},
					actualTimeSpent: 0,
					subtasks: [
						{ id: 'intro-1', text: 'Create outline', status: 'todo', order: 0, created: Date.now(), updated: Date.now() },
						{ id: 'intro-2', text: 'Write hook and context', status: 'todo', order: 1, created: Date.now(), updated: Date.now() },
						{ id: 'intro-3', text: 'Draft research questions', status: 'todo', order: 2, created: Date.now(), updated: Date.now() },
						{ id: 'intro-4', text: 'Write methodology preview', status: 'todo', order: 3, created: Date.now(), updated: Date.now() },
						{ id: 'intro-5', text: 'First revision pass', status: 'todo', order: 4, created: Date.now(), updated: Date.now() }
					],
					dependencies: [`${boardId}-card-2`],
					blockers: [],
					tags: ['writing', 'introduction', 'draft'],
					priority: 'medium',
					dueDate: new Date(Date.now() + 86400000 * 21).toISOString(),
					completionPercentage: 0,
					estimatedPomodoros: 6,
					adhdTips: ['Start with terrible first draft', 'Use Pomodoro technique for focused writing', 'Don\'t edit while drafting'],
					focusNotes: 'Connect to previous chapters, establish stakes for this analysis',
					created: Date.now() - 21600000,
					updated: Date.now() - 21600000
				},
				{
					id: `${boardId}-card-6`,
					title: 'Schedule advisor meeting',
					description: 'Set up meeting to discuss chapter progress and get feedback on direction',
					columnId: 'planning',
					order: 1,
					status: 'not-started',
					energyLevel: 'low',
					timeEstimate: {
						optimistic: 10,
						realistic: 20,
						pessimistic: 45
					},
					actualTimeSpent: 0,
					subtasks: [
						{ id: 'meeting-1', text: 'Check advisor\'s calendar', status: 'todo', order: 0, created: Date.now(), updated: Date.now() },
						{ id: 'meeting-2', text: 'Prepare agenda', status: 'todo', order: 1, created: Date.now(), updated: Date.now() },
						{ id: 'meeting-3', text: 'Send meeting request', status: 'todo', order: 2, created: Date.now(), updated: Date.now() }
					],
					dependencies: [],
					blockers: [],
					tags: ['admin', 'advisor', 'meeting'],
					priority: 'medium',
					dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
					completionPercentage: 0,
					estimatedPomodoros: 1,
					adhdTips: ['Do this when energy is low but time is available', 'Prepare specific questions in advance'],
					focusNotes: 'Ask about: research questions validity, data collection approach, chapter structure',
					created: Date.now(),
					updated: Date.now()
				}
			],
			settings: {
				showSubtasks: true,
				showTimeEstimates: true,
				showEnergyLevels: true,
				enableDragDrop: true,
				autoArchiveCompleted: false,
				maxCardsPerColumn: 4,
				focusMode: 'all'
			},
			totalCards: 6,
			completedCards: 1,
			totalEstimatedHours: 13.5,
			actualTimeSpent: 3.25, // 195 minutes in hours
			created: Date.now() - 604800000,
			updated: Date.now()
		};

		this.boards.set(boardId, demoBoard);
		return demoBoard;
	}

	/**
	 * Create a quick card for immediate editing
	 */
	public createQuickCard(
		boardId: string,
		columnId: string,
		title: string,
		description: string = ''
	): KanbanCard | null {
		const board = this.boards.get(boardId);
		if (!board) return null;

		const cardId = `${boardId}-card-${Date.now()}`;
		const newCard: KanbanCard = {
			id: cardId,
			title,
			description,
			columnId,
			order: board.cards.filter(c => c.columnId === columnId).length,
			status: 'not-started',
			energyLevel: 'medium',
			timeEstimate: {
				optimistic: 15,
				realistic: 30,
				pessimistic: 45
			},
			actualTimeSpent: 0,
			subtasks: [],
			dependencies: [],
			blockers: [],
			tags: [],
			priority: 'medium',
			completionPercentage: 0,
			estimatedPomodoros: 1,
			adhdTips: [],
			focusNotes: '',
			created: Date.now(),
			updated: Date.now()
		};

		board.cards.push(newCard);
		board.totalCards = board.cards.length;
		this.saveBoard(board);
		
		return newCard;
	}
}