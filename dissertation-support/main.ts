import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, Modal, Menu, ItemView, WorkspaceLeaf } from 'obsidian';

// ADHD-Friendly Services
import { StorageService } from './src/storage-service';
import { AIService, AIProvider } from './src/ai-service';
import { PlanningService } from './src/planning-service';
import { TaskService } from './src/task-service';
import { ProjectDialogueService } from './src/project-dialogue-service';
import { AcademicTemplateService } from './src/academic-templates';
import { ProjectKanbanService } from './src/kanban-service';
import { validateSettings, Settings as ValidatedSettings } from './src/settings-schema';
import { KanbanView, KANBAN_VIEW_TYPE } from './src/kanban-view';
import { QuickCaptureModal } from './src/quick-capture-modal';
import { SessionTrackingService } from './src/session-tracking-service';
import { SessionAnalyticsView, SESSION_ANALYTICS_VIEW_TYPE } from './src/session-analytics-view';

interface LastContext {
	title: string; // brief description or heading user was working on
	filePath: string; // vault path to note
	line: number; // approximate line number (cursor position)
	updated: number; // epoch ms
}

interface DailyPlanSuggestion {
	id: string;
	text: string;
	done: boolean;
}

interface DailyPlan {
	date: string; // YYYY-MM-DD
	suggestions: DailyPlanSuggestion[]; // up to 3 tiny actions
	firstAction: string; // user input
	stopPoint: string; // user planned stop point
	created: number; // epoch ms
	lastUpdated: number; // epoch ms
}

// --- Task Board (Phase 2+) ---
type MicroTaskStatus = 'todo' | 'doing' | 'done';

interface MicroTask {
  id: string;            // unique (date + random)
  text: string;          // short actionable micro-task
  status: MicroTaskStatus; // lifecycle state
  order: number;         // ordering within the day board
  created: number;       // epoch ms
  updated: number;       // epoch ms
}

// Record keyed by date (YYYY-MM-DD) storing that day's micro tasks
interface DailyTasksRecord {
  [date: string]: MicroTask[];
}

interface DissertationSupportSettings {
	reminderInterval: number; // minutes
	openaiApiKey: string;
	dissertationTopic: string;
	deadline: string;
	prospectusDeadline?: string; // separate deadline for prospectus planning
	planOutputFolder?: string; // folder to create plan files in
	targetWordCount?: number; // optional total target word count for dissertation
	lastPlans?: { [k in 'dissertation' | 'prospectus']?: { file: string; created: string; daysRemaining: number | null } };
	lastReminderTime: number;
	isReminderActive: boolean;
	lastContext?: LastContext; // optional until user saves first context
	notionStyleEnabled: boolean; // enable enhanced Notion-like styling
	lastDailyPlan?: DailyPlan; // auto-generated daily focus
  dailyTasks?: DailyTasksRecord; // micro-task board keyed by date
	firstRunCompleted?: boolean; // track if user has seen welcome guide
	featureUsage?: {
		savedContext?: boolean;
		createdPlan?: boolean;
		createdDelta?: boolean;
		createdMicroTask?: boolean;
		seededFromPlan?: boolean;
		openedFocusPanel?: boolean;
		toggledReminders?: boolean;
	};
	lastOpenedBoardId?: string; // Remember last Kanban board
	// Session tracking settings
	sessionBreakInterval?: number; // minutes between break suggestions
	enableBreakReminders?: boolean; // enable/disable break reminder notifications
	enableHyperfocusDetection?: boolean; // detect and notify about hyperfocus episodes
	gentleSessionReminders?: boolean; // use gentle, non-disruptive reminder language
	// API key prompt tracking
	hasPromptedForApiKey?: boolean; // track if user has been prompted for API key during project creation
}

const DEFAULT_SETTINGS: DissertationSupportSettings = {
	reminderInterval: 60, // 1 hour
	openaiApiKey: '',
	dissertationTopic: '',
	deadline: '',
	prospectusDeadline: '',
	planOutputFolder: '',
	targetWordCount: undefined,
	lastPlans: {},
	lastReminderTime: 0,
	isReminderActive: true,
	notionStyleEnabled: true,
	dailyTasks: {},
	firstRunCompleted: false,
	featureUsage: {},
	lastOpenedBoardId: '',
	// Session tracking defaults
	sessionBreakInterval: 45,
	enableBreakReminders: true,
	enableHyperfocusDetection: true,
	gentleSessionReminders: true,
	hasPromptedForApiKey: false,
}

export default class DissertationSupportPlugin extends Plugin {
	settings: DissertationSupportSettings;
	reminderInterval: NodeJS.Timeout | null = null;

	// ADHD-Friendly Services - Dependency Injection
	private storageService: StorageService;
	private aiService: AIService;
	private planningService: PlanningService;
	private taskService: TaskService;
	private projectDialogueService: ProjectDialogueService;
	private academicTemplateService: AcademicTemplateService;
	public projectKanbanService: ProjectKanbanService;
	private sessionTrackingService: SessionTrackingService;

	async onload() {
		await this.loadSettings();

		// Register the welcome guide view
		this.registerView(
			WELCOME_GUIDE_VIEW_TYPE,
			(leaf) => new WelcomeGuideView(leaf)
		);

		// Register the kanban board view
		this.registerView(
			KANBAN_VIEW_TYPE,
			(leaf) => new KanbanView(leaf, this)
		);

		// Register the session analytics view
		this.registerView(
			SESSION_ANALYTICS_VIEW_TYPE,
			(leaf) => new SessionAnalyticsView(leaf, this.sessionTrackingService)
		);

		// Stylesheet is static (styles.css) and auto-loaded by Obsidian when present.

		// Add ribbon icon
		this.addRibbonIcon('brain', 'Dissertation Support', (event) => {
			this.showMainMenu(event);
		});

		// Add command for AI planning
		this.addCommand({
			id: 'ai-plan-dissertation',
			name: 'Plan my dissertation with AI',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'p' }],
			callback: () => {
				this.sessionTrackingService?.recordInteraction('AI Planning');
				this.runAIPlanning('dissertation');
			}
		});

		this.addCommand({
			id: 'ai-plan-dissertation-delta',
			name: 'Update dissertation plan (delta)',
			callback: () => this.runAIPlanningDelta('dissertation')
		});

		// Add command for prospectus planning
		this.addCommand({
			id: 'ai-plan-prospectus',
			name: 'Plan my prospectus with AI',
			callback: () => {
				this.runAIPlanning('prospectus');
			}
		});

		this.addCommand({
			id: 'ai-plan-prospectus-delta',
			name: 'Update prospectus plan (delta)',
			callback: () => this.runAIPlanningDelta('prospectus')
		});

		// Command: Show Today's Focus Panel (micro-plan)
		this.addCommand({
			id: 'show-today-focus-panel',
			name: "Show Today's Focus Panel",
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'f' }],
			callback: () => {
				this.ensureTodayPlan();
				this.showFocusPanel();
			}
		});

		// Add command to toggle reminders
		this.addCommand({
			id: 'toggle-reminders',
			name: 'Toggle proactive reminders',
			callback: () => {
				this.toggleReminders();
			}
		});

		// Add command to show welcome guide
		this.addCommand({
			id: 'show-welcome-guide',
			name: 'Show Welcome Guide',
			callback: async () => {
				await this.activateWelcomeGuideView();
			}
		});

		// Add command to show kanban board
		this.addCommand({
			id: 'show-kanban-board',
			name: 'Show Project Kanban Board',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'k' }],
			callback: async () => {
				this.sessionTrackingService?.recordInteraction('Kanban Board');
				await this.activateKanbanView();
			}
		});

		// Add command to start new project
		this.addCommand({
			id: 'start-new-project',
			name: 'Start New Project',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'n' }],
			callback: () => {
				this.startNewProject();
			}
		});

		// Add settings tab
		this.addSettingTab(new DissertationSettingTab(this.app, this));

		// Command: Insert/Update resume card in today's daily note
		this.addCommand({
			id: 'insert-resume-card',
			name: 'Insert Resume Card in Today\'s Daily Note',
			callback: () => this.upsertResumeCardInDailyNote()
		});

		// Command: Save current context (manual capture)
		this.addCommand({
			id: 'save-current-dissertation-context',
			name: 'Save Current Dissertation Context',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 's' }],
			callback: () => {
				this.captureCurrentContext();
			}
		});

		// Command: Add Micro Task
		this.addCommand({
			id: 'add-micro-task',
			name: 'Add Micro Task',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 't' }],
			callback: () => {
				this.sessionTrackingService?.recordInteraction('Add Task');
				new AddMicroTaskModal(this.app, this, (text) => {
					this.createMicroTask(text);
					this.upsertTaskBoardInDailyNote(true);
				}).open();
			}
		});

		// Command: Seed micro tasks from last plan
		this.addCommand({
			id: 'seed-micro-tasks-from-plan',
			name: 'Seed micro tasks from last plan',
			callback: () => this.seedMicroTasksFromLastPlan()
		});

		// Command: Start New Project (AI Dialogue)
		this.addCommand({
			id: 'start-new-project',
			name: 'Start New Project (AI Dialogue)',
			callback: () => this.startNewProject()
		});

		// Command: Quick Capture
		this.addCommand({
			id: 'quick-capture',
			name: 'Quick Capture',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'c' }],
			callback: () => {
				this.sessionTrackingService?.recordInteraction('Quick Capture');
				const modal = new QuickCaptureModal(this.app, this);
				modal.open();
			}
		});

		// Command: Session Analytics
		this.addCommand({
			id: 'show-session-analytics',
			name: 'Show Session Analytics',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'a' }],
			callback: async () => {
				this.sessionTrackingService?.recordInteraction('Session Analytics');
				await this.activateSessionAnalyticsView();
			}
		});


		// Start proactive reminders
		this.startProactiveReminders();

		// Auto-upsert resume card if we already have context & user enabled style
		if (this.settings.lastContext && this.settings.notionStyleEnabled) {
			this.upsertResumeCardInDailyNote();
		}

		// Generate a new daily plan if date changed
		this.ensureTodayPlan();

		// Status bar item
		this.initStatusBar();

		// Markdown post processor for resume card interactions
		this.registerMarkdownPostProcessor((el, ctx) => {
			// Support both old .ds-resume-card and new .ds-resume-card-wrapper
			const wrappers: Element[] = Array.from(el.querySelectorAll('.ds-resume-card-wrapper, .ds-resume-card'));
			if (!wrappers.length) return;
			wrappers.forEach(card => {
				const button = card.querySelector('.ds-resume-btn');
				if (!button) return;
				if ((button as any)._dsBound) return; // prevent duplicate binding
				(button as any)._dsBound = true;
				button.addEventListener('click', async () => {
					const filePath = card.getAttribute('data-file');
					const lineStr = card.getAttribute('data-line');
					if (!filePath) return;
					// @ts-ignore
					await this.app.workspace.openLinkText(filePath, '/', false);
					if (lineStr) {
						setTimeout(() => {
							// @ts-ignore
							const leaf = this.app.workspace.activeLeaf;
							if (leaf && (leaf as any).view && (leaf as any).view.editor) {
								(leaf as any).view.editor.setCursor({ line: parseInt(lineStr, 10), ch: 0 });
							}
						}, 180);
					}
					new Notice('🎯 Resumed where you left off');
				});
			});
		});

		// Global delegated click handler (covers Live Preview, later dynamic loads)
		const delegated = async (ev: Event) => {
			const target = ev.target as HTMLElement;
			if (!target) return;
			// Plan actions
			if (target.closest('.ds-plan-seed-btn')) {
				this.seedMicroTasksFromLastPlan();
				return;
			}
			if (target.closest('.ds-plan-delta-btn')) {
				const btn = target.closest('.ds-plan-delta-btn') as HTMLElement;
				const pType = (btn?.getAttribute('data-plan-type') as any) || 'dissertation';
				this.runAIPlanningDelta(pType === 'prospectus' ? 'prospectus' : 'dissertation');
				return;
			}
			const btn = target.closest('.ds-resume-btn');
			if (!btn) return;
			const wrapper = btn.closest('.ds-resume-card-wrapper, .ds-resume-card') as HTMLElement | null;
			if (!wrapper) return;
			const filePath = wrapper.getAttribute('data-file');
			const lineStr = wrapper.getAttribute('data-line');
			if (!filePath) return;
			// @ts-ignore
			await this.app.workspace.openLinkText(filePath, '/', false);
			if (lineStr) {
				setTimeout(() => {
					// @ts-ignore
					const leaf = this.app.workspace.activeLeaf;
					if (leaf && (leaf as any).view && (leaf as any).view.editor) {
						(leaf as any).view.editor.setCursor({ line: parseInt(lineStr, 10), ch: 0 });
					}
				}, 160);
			}
			new Notice('🎯 Resumed where you left off');
		};
		this.registerDomEvent(document, 'click', delegated);

		// Delegated events for task board interactions
		const taskDelegate = (ev: Event) => {
			const target = ev.target as HTMLElement;
			if (!target) return;
			// Status cycle button
			const statusBtn = target.closest('.ds-task-status-btn');
			if (statusBtn) {
				const card = statusBtn.closest('.ds-task-card') as HTMLElement | null;
				if (!card) return;
				const id = card.getAttribute('data-id');
				if (!id) return;
				const list = this.ensureTodayTaskList();
				const task = list.find(t => t.id === id);
				if (!task) return;
				const order: MicroTaskStatus[] = ['todo','doing','done'];
				const next = order[(order.indexOf(task.status) + 1) % order.length];
				task.status = next;
				task.updated = Date.now();
				this.saveDailyTasks();
				card.dataset.status = next;
				card.classList.remove('status-todo','status-doing','status-done');
				card.classList.add(`status-${next}`);
				return;
			}
			// Add task button
			const addBtn = target.closest('.ds-task-add-btn');
			if (addBtn) {
				new AddMicroTaskModal(this.app, this, (text) => {
					if (!text.trim()) return;
					this.createMicroTask(text.trim());
					this.upsertTaskBoardInDailyNote(true);
				}).open();
			}
		};
		this.registerDomEvent(document, 'click', taskDelegate);

		// Drag and drop handlers
		let dragId: string | null = null;
		const dragStart = (ev: DragEvent) => {
			const card = (ev.target as HTMLElement)?.closest('.ds-task-card') as HTMLElement | null;
			if (!card) return; 
			dragId = card.getAttribute('data-id');
			ev.dataTransfer?.setData('text/plain', dragId || '');
		};
		const dragOver = (ev: DragEvent) => {
			if (!(ev.target instanceof HTMLElement)) return;
			const overCard = ev.target.closest('.ds-task-card');
			if (!overCard) return;
			ev.preventDefault();
		};
		const drop = (ev: DragEvent) => {
			if (!dragId) return;
			if (!(ev.target instanceof HTMLElement)) return;
			const targetCard = ev.target.closest('.ds-task-card') as HTMLElement | null;
			if (!targetCard) return;
			const targetId = targetCard.getAttribute('data-id');
			if (!targetId || targetId === dragId) return;
			const list = this.ensureTodayTaskList();
			const fromIdx = list.findIndex(t=>t.id===dragId);
			const toIdx = list.findIndex(t=>t.id===targetId);
			if (fromIdx === -1 || toIdx === -1) return;
			const [moved] = list.splice(fromIdx,1);
			list.splice(toIdx,0,moved);
			list.forEach((t,i)=> t.order = i);
			this.saveDailyTasks();
			this.upsertTaskBoardInDailyNote(false);
		};
		this.registerDomEvent(document, 'dragstart', dragStart as any);
		this.registerDomEvent(document, 'dragover', dragOver as any);
		this.registerDomEvent(document, 'drop', drop as any);

		console.log('Dissertation Support Plugin loaded');

		// Show welcome guide on first run
		this.checkFirstRun();
	}

	/** Activate the Welcome Guide view in the sidebar */
	async activateWelcomeGuideView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(WELCOME_GUIDE_VIEW_TYPE);

		if (leaves.length > 0) {
			// A welcome guide view already exists, use it
			leaf = leaves[0];
		} else {
			// Create a new welcome guide view in the right sidebar
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: WELCOME_GUIDE_VIEW_TYPE, active: true });
			}
		}

		// Reveal the leaf
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	/** Activate the Kanban Board view in the sidebar */
	async activateKanbanView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(KANBAN_VIEW_TYPE);

		if (leaves.length > 0) {
			// A kanban view already exists, use it
			leaf = leaves[0];
		} else {
			// Create a new kanban view in the right sidebar
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: KANBAN_VIEW_TYPE, active: true });
			}
		}

		// Reveal the leaf
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	/** Activate the Session Analytics view in the sidebar */
	async activateSessionAnalyticsView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(SESSION_ANALYTICS_VIEW_TYPE);

		if (leaves.length > 0) {
			// A session analytics view already exists, use it
			leaf = leaves[0];
		} else {
			// Create a new session analytics view in the right sidebar
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: SESSION_ANALYTICS_VIEW_TYPE, active: true });
			}
		}

		// Reveal the leaf
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	/** Check if this is the first run and show welcome guide */
	private async checkFirstRun() {
		if (!this.settings.firstRunCompleted) {
			// Small delay to let UI settle, then open welcome guide
			setTimeout(async () => {
				await this.activateWelcomeGuideView();
				this.settings.firstRunCompleted = true;
				this.saveSettings();
			}, 1000);
		}
	}

	/** Capture active editor context and store as lastContext */
	captureCurrentContext() {
		try {
			// Prefer activeLeaf to avoid runtime issues with instanceof
			// @ts-ignore
			const leaf = this.app.workspace.activeLeaf;
			if (!leaf || !leaf.view) {
				new Notice('No active note to capture');
				return;
			}
			const view: any = leaf.view;
			if (!view.file || !view.editor) {
				new Notice('Current view is not a markdown note');
				return;
			}
			const file: TFile = view.file;
			const editor = view.editor;
			const cursor = editor.getCursor();
			const line = cursor?.line ?? 0;
			const contentLine = editor.getLine(line) || '';
			let derivedTitle = file.basename;
			const fileCache = this.app.metadataCache.getFileCache(file);
			if (fileCache?.headings && fileCache.headings.length > 0) {
				derivedTitle = fileCache.headings[0].heading;
			}
			if (/^#+\s+/.test(contentLine.trim())) {
				derivedTitle = contentLine.replace(/^#+\s+/, '').trim();
			}
			this.settings.lastContext = {
				title: derivedTitle,
				filePath: file.path,
				line,
				updated: Date.now()
			};
			if (!this.settings.featureUsage) this.settings.featureUsage = {};
			this.settings.featureUsage.savedContext = true;
			this.saveSettings();
			console.log('[DissertationSupport] Context saved', this.settings.lastContext);
			new Notice('✅ Context saved');
			this.upsertResumeCardInDailyNote();
		} catch (e) {
			console.error('[DissertationSupport] capture error', e);
			new Notice('Failed to save context (see console)');
		}
	}

	openLastContext() {
		if (!this.settings.lastContext) {
			new Notice('No saved context yet');
			return;
		}
		const ctx = this.settings.lastContext;
		// @ts-ignore
		this.app.workspace.openLinkText(ctx.filePath, '/', false).then(() => {
			setTimeout(() => {
				// @ts-ignore
				const leaf = this.app.workspace.activeLeaf;
				if (leaf && (leaf as any).view && (leaf as any).view.editor) {
					(leaf as any).view.editor.setCursor({ line: ctx.line, ch: 0 });
				}
			}, 160);
		});
	}

	initStatusBar() {
		const item = this.addStatusBarItem();
		item.addClass('ds-status-bar');
		const update = () => {
			let text = '';
			if (this.settings.lastReminderTime) {
				const mins = Math.floor((Date.now() - this.settings.lastReminderTime) / 60000);
				text += `Last nudge: ${mins}m ago`;
			} else {
				text += 'No nudges yet';
			}
			if (this.settings.lastContext) {
				text += ' | Resume?';
				item.addClass('ds-status-resume');
			} else {
				item.removeClass('ds-status-resume');
			}
			item.setText(text);
		};
		item.onClickEvent(() => {
			if (this.settings.lastContext) this.openLastContext();
		});
		update();
		// periodic refresh
		this.registerInterval(window.setInterval(update, 60_000));
	}

	/** Ensure today's micro-task list exists and return it */
	ensureTodayTaskList(): MicroTask[] {
		const today = new Date().toISOString().split('T')[0];
		if (!this.settings.dailyTasks) this.settings.dailyTasks = {};
		if (!this.settings.dailyTasks[today]) {
			this.settings.dailyTasks[today] = [];
			this.saveSettings();
		}
		return this.settings.dailyTasks[today];
	}

	saveDailyTasks() {
		this.saveSettings();
	}

	/**
	 * Create micro-task using ADHD-friendly TaskService
	 * Maintains backward compatibility with existing code
	 */
	createMicroTask(text: string): MicroTask {
		if (!this.taskService) {
			// Fallback to old method if service not available
			return this.createMicroTaskLegacy(text);
		}

		try {
			const task = this.taskService.createTask(text);
			
			// Track feature usage for onboarding
			if (!this.settings.featureUsage) this.settings.featureUsage = {};
			this.settings.featureUsage.createdMicroTask = true;
			
			// Auto-save using ADHD-friendly storage service
			this.saveSettings();
			
			return task;
		} catch (error) {
			console.error('[Task Creation] Failed:', error);
			new Notice('❌ Could not create task. ' + (error as Error).message);
			
			// Return a mock task to prevent crashes
			return {
				id: 'error-' + Date.now(),
				text: text.trim(),
				status: 'todo' as MicroTaskStatus,
				order: 0,
				created: Date.now(),
				updated: Date.now(),
			};
		}
	}

	/**
	 * Legacy task creation method for fallback
	 * ADHD-friendly: Never leave user completely broken
	 */
	private createMicroTaskLegacy(text: string): MicroTask {
		const list = this.ensureTodayTaskList();
		const today = new Date().toISOString().split('T')[0];
		const mt: MicroTask = {
			id: `${today}-${Math.random().toString(36).slice(2,8)}`,
			text: text.trim(),
			status: 'todo',
			order: list.length,
			created: Date.now(),
			updated: Date.now()
		};
		list.push(mt);
		if (!this.settings.featureUsage) this.settings.featureUsage = {};
		this.settings.featureUsage.createdMicroTask = true;
		this.saveDailyTasks();
		return mt;
	}

	/**
	 * Start new project using AI dialogue
	 * ADHD-friendly: Guided conversation to break down project initiation
	 */
	async startNewProject(): Promise<void> {
		if (!this.projectDialogueService) {
			new Notice('⚠️ Project dialogue service not available. Check AI settings.');
			return;
		}

		// Check if we need to prompt for API key (only once per session)
		if (!this.settings.hasPromptedForApiKey && !this.settings.openaiApiKey?.trim()) {
			this.settings.hasPromptedForApiKey = true;
			await this.saveSettings();
			
			// Show API key prompt
			new ApiKeyPromptModal(this.app, this, (hasApiKey) => {
				if (hasApiKey) {
					// Continue with AI-powered project creation
					this.openProjectDialogue();
				} else {
					// Continue with local/basic project creation
					new Notice('💡 Creating project in local mode. You can add an API key in settings later for AI features.');
					this.openProjectDialogue();
				}
			}).open();
			return;
		}

		// Open the project dialogue modal directly
		this.openProjectDialogue();
	}

	private openProjectDialogue(): void {
		// Open the project dialogue modal
		new ProjectDialogueModal(this.app, this.projectDialogueService, async (plan) => {
			// Handle the completed project plan
			if (plan) {
				new Notice(`✅ Created project: ${plan.title} with ${plan.immediateNextSteps.length} next steps`);
				
				// Auto-generate micro-tasks from the plan
				try {
					const result = await this.projectDialogueService.createMicroTasksFromPlan('', plan);
					if (result.tasksCreated > 0) {
						new Notice(`📝 Generated ${result.tasksCreated} micro-tasks from your project plan`);
						// Refresh task board in daily note
						this.upsertTaskBoardInDailyNote(true);
					}
				} catch (error) {
					console.error('[Project Creation] Failed to generate tasks:', error);
					new Notice('⚠️ Project created, but task generation failed. You can add tasks manually.');
				}

				// Auto-generate Kanban board from the plan
				try {
					const kanbanBoard = await this.projectDialogueService.createKanbanFromPlan('', plan);
					if (kanbanBoard) {
						new Notice(`📋 Created Kanban board: "${kanbanBoard.title}" - Open the Project Kanban view to see it!`);
						
						// Update settings to remember this board
						this.settings.lastOpenedBoardId = kanbanBoard.id;
						await this.saveSettings();
						
						// If Kanban view is already open, refresh it with the new board
						const leaf = this.app.workspace.getLeavesOfType(KANBAN_VIEW_TYPE)[0];
						if (leaf && leaf.view instanceof KanbanView) {
							leaf.view.currentBoard = kanbanBoard;
							leaf.view.renderBoard();
							leaf.view.refreshBoardSelector();
							this.app.workspace.revealLeaf(leaf);
						}
					}
				} catch (error) {
					console.error('[Project Creation] Failed to generate Kanban board:', error);
					new Notice('⚠️ Project created, but Kanban board generation failed.');
				}

				// Check if this is a dissertation project and trigger AI planning
				try {
					const sessionContext = await this.projectDialogueService.getProjectContext('');
					if (sessionContext && sessionContext.type === 'dissertation') {
						// Update dissertation topic in settings if provided
						if (sessionContext.title && !this.settings.dissertationTopic) {
							this.settings.dissertationTopic = sessionContext.title;
							await this.saveSettings();
						}
						
						// Trigger AI dissertation planning if API key is available
						if (this.settings.openaiApiKey) {
							new Notice('🤖 Generating comprehensive dissertation plan...');
							await this.runAIPlanning('dissertation');
						} else {
							new Notice('💡 Tip: Set your OpenAI API key in settings to generate an AI-powered dissertation plan!');
						}
					}
				} catch (error) {
					console.error('[Project Creation] Failed to trigger AI planning:', error);
					// Don't show error to user, this is a bonus feature
				}

				// Track feature usage
				if (!this.settings.featureUsage) this.settings.featureUsage = {};
				this.settings.featureUsage.createdPlan = true;
				this.saveSettings();
			}
		}).open();
	}

	private extractMicroTasksFromContent(content: string, max: number = 8): string[] {
		// Heuristic: capture bullet lines that start with - or * and have 6-120 chars
		const lines = content.split(/\r?\n/);
		const tasks: string[] = [];
		for (const line of lines) {
			const m = line.match(/^\s*[-*+]\s+(.{6,120})$/);
			if (m) {
				const txt = m[1].trim();
				// skip headings disguised or very long / section labels
				if (/^#+/.test(txt) || /\bchapter\b/i.test(txt)) continue;
				if (txt.length > 5 && tasks.indexOf(txt) === -1) tasks.push(txt);
			}
			if (tasks.length >= max) break;
		}
		return tasks;
	}

	/**
	 * Seed micro-tasks from last plan using ADHD-friendly TaskService
	 * Maintains backward compatibility with existing code
	 */
	async seedMicroTasksFromLastPlan() {
		if (!this.settings.lastPlans || Object.keys(this.settings.lastPlans).length === 0) {
			new Notice('No stored plan metadata yet. Generate a plan first.');
			return;
		}

		// Prefer dissertation then prospectus
		const meta = this.settings.lastPlans['dissertation'] || this.settings.lastPlans['prospectus'];
		if (!meta) { 
			new Notice('No plan available for seeding'); 
			return; 
		}

		if (!this.taskService) {
			// Fallback to legacy method
			await this.seedMicroTasksFromLastPlanLegacy(meta);
			return;
		}

		try {
			// Use TaskService's built-in seed functionality
			const result = await this.taskService.seedTasksFromPlan(meta.file, 8);
			
			// Update task board in daily note
			await this.upsertTaskBoardInDailyNote(true);
			
			// Track feature usage
			if (!this.settings.featureUsage) this.settings.featureUsage = {};
			this.settings.featureUsage.seededFromPlan = true;
			this.saveSettings();
			
			new Notice(`✅ Seeded ${result.added} micro task${result.added!==1?'s':''}`);
			
		} catch (error) {
			console.error('[Task Seeding] Failed:', error);
			new Notice('❌ Could not seed tasks. ' + (error as Error).message);
			
			// Try fallback method
			await this.seedMicroTasksFromLastPlanLegacy(meta);
		}
	}

	/**
	 * Legacy task seeding method for fallback
	 * ADHD-friendly: Never leave user completely broken
	 */
	private async seedMicroTasksFromLastPlanLegacy(meta: any) {
		try {
			const file = this.app.vault.getAbstractFileByPath(meta.file) as TFile | null;
			if (!file) { 
				new Notice('Plan file not found'); 
				return; 
			}
			
			const content = await this.app.vault.read(file);
			const extracted = this.extractMicroTasksFromContent(content, 8);
			
			if (!extracted.length) { 
				new Notice('No suitable bullet tasks found'); 
				return; 
			}
			
			let added = 0;
			extracted.forEach(t => { this.createMicroTask(t); added++; });
			await this.upsertTaskBoardInDailyNote(true);
			
			if (!this.settings.featureUsage) this.settings.featureUsage = {};
			this.settings.featureUsage.seededFromPlan = true;
			this.saveSettings();
			
			new Notice(`✅ Seeded ${added} micro task${added!==1?'s':''} (legacy mode)`);
		} catch (error) {
			console.error('[Legacy Task Seeding] Failed:', error);
			new Notice('❌ Could not seed tasks from plan');
		}
	}

	/** Ensure a daily plan exists for today; generate if missing or stale */
	ensureTodayPlan() {
		const today = new Date().toISOString().split('T')[0];
		if (this.settings.lastDailyPlan?.date === today) return;
		this.settings.lastDailyPlan = this.generateDailyPlan(today);
		this.saveSettings();
		// also ensure today's task board placeholder exists
		this.upsertTaskBoardInDailyNote(false).catch(err => console.warn('Task board upsert (init) failed', err));
	}

	/** Generate up to 3 gentle micro-suggestions */
	generateDailyPlan(date: string) {
		const baseSuggestions: string[] = [];
		// Seed suggestions from context title words if available
		if (this.settings.lastContext) {
			baseSuggestions.push(`Open the note: ${this.settings.lastContext.title}`);
			baseSuggestions.push('Skim last 3 paragraphs');
			baseSuggestions.push('Clarify one sentence');
		} else {
			baseSuggestions.push('Open main dissertation outline');
			baseSuggestions.push('Write a single sentence');
			baseSuggestions.push('List 2 sub-questions');
		}
		const suggestions = baseSuggestions.slice(0, 3).map((text, i) => ({ id: `${date}-${i}`, text, done: false }));
		return {
			date,
			suggestions,
			firstAction: '',
			stopPoint: '',
			created: Date.now(),
			lastUpdated: Date.now()
		};
	}

	/** Placeholder: open focus panel modal (implemented later) */
	showFocusPanel() {
		if (!this.settings.lastDailyPlan) this.ensureTodayPlan();
		const modal = new FocusPanelModal(this.app, this);
		modal.open();
		if (!this.settings.featureUsage) this.settings.featureUsage = {};
		this.settings.featureUsage.openedFocusPanel = true;
		this.saveSettings();
	}

	onunload() {
		this.stopProactiveReminders();
		this.sessionTrackingService?.destroy();
		console.log('Dissertation Support Plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		// Migration: ensure dailyTasks exists
		if (!this.settings.dailyTasks) this.settings.dailyTasks = {};
		if (this.settings.prospectusDeadline === undefined) this.settings.prospectusDeadline = '';
		if (this.settings.planOutputFolder === undefined) this.settings.planOutputFolder = '';
		if (this.settings.lastPlans === undefined) this.settings.lastPlans = {};
		if (!this.settings.featureUsage) this.settings.featureUsage = {};

		// Initialize ADHD-friendly services with dependency injection
		await this.initializeServices();
	}

	/**
	 * Initialize all ADHD-friendly services with proper dependency injection
	 * Services are designed for graceful degradation and fast feedback
	 */
	private async initializeServices(): Promise<void> {
		try {
			// StorageService: Handles debounced saves and never-fail persistence
			this.storageService = new StorageService(this);

			// TaskService: ADHD-friendly micro-task management (≤12 tasks/day)
			this.taskService = new TaskService(this.app, this.settings.dailyTasks || {}, {
				maxTasksPerDay: 12, // ADHD-friendly limit
				showEmptyState: true,
				autoArchiveCompleted: false, // Keep for satisfaction review
				enableDragDrop: true,
			});

			// AIService: Fallback-ready AI with timeout handling
			const aiProvider: AIProvider = {
				name: this.settings.openaiApiKey ? 'openai' : 'local',
				apiKey: this.settings.openaiApiKey,
				maxTokens: 2000,
				temperature: 0.7,
			};
			
			this.aiService = new AIService({
				defaultProvider: aiProvider,
				retryAttempts: 3,
				timeoutMs: 30000,
				enableLogging: true,
			});

			// PlanningService: ADHD-friendly micro-task planning
			this.planningService = new PlanningService(this.app, this.aiService);

			// AcademicTemplateService: ADHD-friendly academic project templates
			this.academicTemplateService = new AcademicTemplateService();

			// ProjectKanbanService: Visual project management with ADHD-friendly features
			this.projectKanbanService = new ProjectKanbanService(this.taskService);

			// ProjectDialogueService: AI-driven project initiation dialogue
			this.projectDialogueService = new ProjectDialogueService(
				this.aiService, 
				this.taskService, 
				this.academicTemplateService,
				this.projectKanbanService
			);

			// SessionTrackingService: ADHD-friendly session monitoring and break reminders
			this.sessionTrackingService = new SessionTrackingService(this.app, {
				suggestedBreakInterval: this.settings.sessionBreakInterval || 45,
				breakReminderEnabled: this.settings.enableBreakReminders !== false,
				hyperfocusDetectionEnabled: this.settings.enableHyperfocusDetection !== false,
				gentleReminders: this.settings.gentleSessionReminders !== false
			});

			console.log('[ADHD Services] All services initialized successfully');

		} catch (error) {
			console.error('[ADHD Services] Service initialization failed:', error);
			new Notice('⚠️ Some features may be limited. Check console for details.');
			
			// Graceful degradation - create minimal services
			await this.initializeMinimalServices();
		}
	}

	/**
	 * Fallback initialization when main services fail
	 * ADHD-friendly: Never leave user without basic functionality
	 */
	private async initializeMinimalServices(): Promise<void> {
		try {
			this.taskService = new TaskService(this.app, {}, { maxTasksPerDay: 5 });
			console.log('[ADHD Services] Minimal services initialized');
		} catch (error) {
			console.error('[ADHD Services] Even minimal initialization failed:', error);
		}
	}

	async saveSettings() {
		// Use ADHD-friendly storage service if available, otherwise fallback
		if (this.storageService) {
			const { settings: validatedSettings } = validateSettings(this.settings);
			await this.storageService.saveSettings(validatedSettings);
		} else {
			await this.saveData(this.settings);
		}
		
		// Sync task data if TaskService is available
		if (this.taskService) {
			this.settings.dailyTasks = this.taskService.getTasksData();
		}
		
		// Update AI service configuration when API key changes
		if (this.aiService) {
			const aiProvider: AIProvider = {
				name: this.settings.openaiApiKey ? 'openai' : 'local',
				apiKey: this.settings.openaiApiKey,
				maxTokens: 2000,
				temperature: 0.7,
			};
			
			this.aiService.updateConfiguration({
				defaultProvider: aiProvider,
			});
		}
	}

	startProactiveReminders() {
		if (!this.settings.isReminderActive) return;
		
		this.stopProactiveReminders(); // Clear any existing interval
		
		this.reminderInterval = setInterval(() => {
			this.showProactiveReminder();
		}, this.settings.reminderInterval * 60 * 1000);

		console.log(`Proactive reminders started: every ${this.settings.reminderInterval} minutes`);
	}

	stopProactiveReminders() {
		if (this.reminderInterval) {
			clearInterval(this.reminderInterval);
			this.reminderInterval = null;
		}
	}

	toggleReminders() {
		this.settings.isReminderActive = !this.settings.isReminderActive;
		this.saveSettings();
		if (!this.settings.featureUsage) this.settings.featureUsage = {};
		this.settings.featureUsage.toggledReminders = true;
		this.saveSettings();
		
		if (this.settings.isReminderActive) {
			this.startProactiveReminders();
			new Notice('✅ Proactive reminders enabled');
		} else {
			this.stopProactiveReminders();
			new Notice('⏸️ Proactive reminders paused');
		}
	}

	showProactiveReminder() {
		const now = Date.now();
		
		// Don't show if we just showed one recently (within 10 minutes)
		if (now - this.settings.lastReminderTime < 10 * 60 * 1000) {
			return;
		}

		this.settings.lastReminderTime = now;
		this.saveSettings();

		// Create a gentle, non-intrusive reminder
		const reminderMessages = [
			"🎓 Ready for 15 minutes of dissertation work?",
			"✍️ How about opening your dissertation document?",
			"📚 Time for a quick writing session?",
			"🔍 Want to review what you wrote yesterday?",
			"💭 Ready to add just one paragraph?",
			"📝 How about outlining your next section?",
		];

		const message = reminderMessages[Math.floor(Math.random() * reminderMessages.length)];
		
		new Notice(message, 8000); // Show for 8 seconds
		
		// Also log to console for debugging
		console.log('Proactive reminder shown:', message);
	}

	showMainMenu(event: MouseEvent) {
		const menu = new Menu();
		
		menu.addItem((item) => {
			item.setTitle("🚀 Start New Project")
				.setIcon("plus")
				.onClick(() => {
					this.startNewProject();
				});
		});

		menu.addItem((item) => {
			item.setTitle("📚 Welcome Guide")
				.setIcon("help-circle")
				.onClick(async () => {
					await this.activateWelcomeGuideView();
				});
		});

		menu.addItem((item) => {
			item.setTitle("📋 Project Kanban Board")
				.setIcon("kanban-square")
				.onClick(async () => {
					await this.activateKanbanView();
				});
		});

		menu.addSeparator();

		menu.addItem((item) => {
			item.setTitle("🎯 Focus Panel")
				.setIcon("target")
				.onClick(() => {
					this.showFocusPanel();
				});
		});

		menu.addItem((item) => {
			item.setTitle("🤖 AI Planning")
				.setIcon("brain")
				.onClick(() => {
					this.runAIPlanning('dissertation');
				});
		});

		menu.addSeparator();

		menu.addItem((item) => {
			item.setTitle("⚙️ Settings")
				.setIcon("settings")
				.onClick(() => {
					(this.app as any).setting.open();
					(this.app as any).setting.openTabById('dissertation-support');
				});
		});

		menu.showAtMouseEvent(event);
	}

	showQuickStart() {
		const modal = new QuickStartModal(this.app, this);
		modal.open();
	}



	/** Insert or update the resume card in today's daily note (YYYY-MM-DD).md */
	async upsertResumeCardInDailyNote() {
		if (!this.settings.lastContext) {
			new Notice('No saved context yet. Save context first.');
			return;
		}
		const today = new Date().toISOString().split('T')[0];
		const dailyFileName = `${today}.md`;
		let file = this.app.vault.getAbstractFileByPath(dailyFileName) as TFile | null;
		if (!file) {
			await this.app.vault.create(dailyFileName, `# ${today}\n\n`);
			file = this.app.vault.getAbstractFileByPath(dailyFileName) as TFile | null;
		}
		if (!file) {
			new Notice('Could not create or access daily note');
			return;
		}
		const content = await this.app.vault.read(file);
		const markerStart = '<!-- ds-resume-card:start -->';
		const markerEnd = '<!-- ds-resume-card:end -->';

		const elapsedMins = Math.max(1, Math.floor((Date.now() - this.settings.lastContext.updated) / 60000));
		const humanAgo = elapsedMins < 60 ? `${elapsedMins}m ago` : `${Math.floor(elapsedMins / 60)}h ago`;
		const cardMarkdown = `${markerStart}\n\n<div class=\"ds-resume-card-wrapper ds-enter\" data-file=\"${this.settings.lastContext.filePath}\" data-line=\"${this.settings.lastContext.line}\">\n  <div class=\"ds-resume-header\"><span class=\"ds-pulse-indicator\"></span><span>Resume Focus</span></div>\n  <div class=\"ds-resume-title\">${this.settings.lastContext.title}</div>\n  <div class=\"ds-resume-meta\">Last worked: ${humanAgo} • <a href=\"${this.settings.lastContext.filePath}\">Open note</a></div>\n  <div><button class=\"ds-resume-btn\" aria-label=\"Resume work at saved context\">Continue here →</button></div>\n  <div class=\"ds-resume-footer\">Gentle restart • No pressure</div>\n</div>\n\n${markerEnd}`;

		let newContent: string;
		if (content.includes(markerStart) && content.includes(markerEnd)) {
			newContent = content.replace(new RegExp(markerStart + '[\s\S]*?' + markerEnd), cardMarkdown);
		} else {
			// Insert near top after first heading
			const lines = content.split('\n');
			let insertIndex = 0;
			if (lines.length > 0 && /^# /.test(lines[0])) insertIndex = 1; // after top heading
			lines.splice(insertIndex, 0, cardMarkdown, '');
			newContent = lines.join('\n');
		}
		await this.app.vault.modify(file, newContent);
		new Notice('✅ Resume card updated in daily note');
		// After resume card update, also keep task board present (non-intrusive)
		this.upsertTaskBoardInDailyNote(true).catch(()=>{});
	}

	/** 
	 * Insert or update the micro task board block in today's daily note
	 * Uses ADHD-friendly TaskService for consistent rendering
	 */
	async upsertTaskBoardInDailyNote(showNotice: boolean = false) {
		if (!this.taskService) {
			// Fallback to legacy method
			await this.upsertTaskBoardInDailyNoteLegacy(showNotice);
			return;
		}

		try {
			// Use TaskService's built-in daily note integration
			await this.taskService.upsertTaskBoardInDailyNote(undefined, showNotice);
			
			if (showNotice) {
				new Notice('✅ Task board updated');
			}
		} catch (error) {
			console.error('[Task Board] Update failed:', error);
			
			// Fallback to legacy method
			await this.upsertTaskBoardInDailyNoteLegacy(showNotice);
		}
	}

	/**
	 * Legacy task board update method for fallback
	 * ADHD-friendly: Never leave user completely broken
	 */
	private async upsertTaskBoardInDailyNoteLegacy(showNotice: boolean = false) {
		try {
			const today = new Date().toISOString().split('T')[0];
			const dailyFileName = `${today}.md`;
			let file = this.app.vault.getAbstractFileByPath(dailyFileName) as TFile | null;
			
			if (!file) {
				await this.app.vault.create(dailyFileName, `# ${today}\n\n`);
				file = this.app.vault.getAbstractFileByPath(dailyFileName) as TFile | null;
			}
			if (!file) return;
			
			const content = await this.app.vault.read(file);
			const markerStart = '<!-- ds-task-board:start -->';
			const markerEnd = '<!-- ds-task-board:end -->';
			
			const list = this.ensureTodayTaskList().sort((a,b)=> a.order - b.order);
			const cardsHtml = list.map(t => {
				const statusClass = `status-${t.status}`;
				return `<div class=\"ds-task-card ${statusClass}\" data-id=\"${t.id}\" draggable=\"true\" data-status=\"${t.status}\">`+
				`<button class=\"ds-task-status-btn\" aria-label=\"Cycle status\"></button>`+
				`<div class=\"ds-task-text\">${escapeHtml(t.text)}</div>`+
				`</div>`;
			}).join('\n');
			
			const emptyState = `<div class=\"ds-task-empty\">Add a micro-task (≤ 25 min) to make starting easy.</div>`;
			const addBtn = `<button class=\"ds-task-add-btn\" aria-label=\"Add micro task\">＋ Task</button>`;
			const boardHtml = `${markerStart}\n<div class=\"ds-task-board-wrapper ds-enter\">\n  <div class=\"ds-task-board-header\">Today's Micro Tasks ${addBtn}</div>\n  <div class=\"ds-task-board\">${cardsHtml || emptyState}</div>\n  <div class=\"ds-task-hint\">Statuses: grey = todo • blue = doing • green = done</div>\n</div>\n${markerEnd}`;
			
			let newContent: string;
			if (content.includes(markerStart) && content.includes(markerEnd)) {
				newContent = content.replace(new RegExp(markerStart + '[\\s\\S]*?' + markerEnd), boardHtml);
			} else {
				// Insert after resume card if present else after heading
				const resumeMarker = '<!-- ds-resume-card:end -->';
				if (content.includes(resumeMarker)) {
					newContent = content.replace(resumeMarker, resumeMarker + '\n\n' + boardHtml + '\n');
				} else {
					const lines = content.split('\n');
					let insertIndex = 0;
					if (lines.length > 0 && /^# /.test(lines[0])) insertIndex = 1;
					lines.splice(insertIndex, 0, boardHtml, '');
					newContent = lines.join('\n');
				}
			}
			
			await this.app.vault.modify(file, newContent);
			
			if (showNotice) {
				new Notice('✅ Task board updated (legacy mode)');
			}
		} catch (error) {
			console.error('[Legacy Task Board] Update failed:', error);
			if (showNotice) {
				new Notice('❌ Could not update task board');
			}
		}
	}

	/**
	 * Generate AI plan using ADHD-friendly PlanningService
	 * Maintains backward compatibility with existing code
	 */
	async runAIPlanning(planType: 'dissertation' | 'prospectus') {
		if (!this.settings.openaiApiKey) {
			new Notice('❌ Please set your OpenAI API key in settings first');
			return;
		}
		if (!this.settings.dissertationTopic) {
			new Notice('❌ Please set your dissertation topic in settings first');
			return;
		}

		const label = planType === 'prospectus' ? 'prospectus' : 'dissertation';
		new Notice(`🤖 Generating ${label} plan with AI...`);

		if (!this.planningService || !this.aiService) {
			// Fallback to legacy method
			await this.runAIPlanningLegacy(planType);
			return;
		}

		try {
			// Use PlanningService's ADHD-friendly planning
			const planConfig = {
				topic: this.settings.dissertationTopic,
				planType: planType,
				deadline: planType === 'prospectus' ? this.settings.prospectusDeadline : this.settings.deadline,
				targetWordCount: this.settings.targetWordCount,
				outputFolder: this.settings.planOutputFolder,
			};

			const planContent = await this.planningService.generatePlan(planConfig);
			const result = await this.planningService.createPlanFile(planConfig, planContent);
			
			// Track feature usage
			if (!this.settings.featureUsage) this.settings.featureUsage = {};
			this.settings.featureUsage.createdPlan = true;
			this.saveSettings();
			
			new Notice(`✅ ${planType === 'prospectus' ? 'Prospectus' : 'Dissertation'} plan created at ${result.filePath}!`);
			
		} catch (error) {
			console.error('[AI Planning] Failed:', error);
			new Notice('❌ Failed to generate plan. ' + (error as Error).message);
			
			// Try fallback method
			await this.runAIPlanningLegacy(planType);
		}
	}

	/**
	 * Legacy AI planning method for fallback
	 * ADHD-friendly: Never leave user completely broken
	 */
	private async runAIPlanningLegacy(planType: 'dissertation' | 'prospectus') {
		try {
			const plan = await this.generatePlan(planType);
			await this.createPlanFile(planType, plan);
			
			if (!this.settings.featureUsage) this.settings.featureUsage = {};
			this.settings.featureUsage.createdPlan = true;
			this.saveSettings();
			
			new Notice(`✅ ${planType === 'prospectus' ? 'Prospectus' : 'Dissertation'} plan created (legacy mode)!`);
		} catch (error) {
			console.error('[Legacy AI Planning] Failed:', error);
			new Notice('❌ Failed to generate plan. Check your API key and try again.');
		}
	}

	async runAIPlanningDelta(planType: 'dissertation' | 'prospectus') {
		if (!this.settings.openaiApiKey || !this.settings.dissertationTopic) {
			new Notice('❌ Missing API key or topic');
			return;
		}
		const last = this.settings.lastPlans?.[planType];
		if (!last) {
			new Notice('No previous plan found; generating fresh.');
			return this.runAIPlanning(planType);
		}
		new Notice('🤖 Generating delta plan (changes & next micro steps)...');
		try {
			const basePrompt = this.buildPlanPrompt(planType);
			const deltaPrompt = basePrompt + `\n\nYou previously generated a plan stored in file: ${last.file} on ${last.created}. Produce a DELTA UPDATE focusing on: 1) Adjusted timeline (if days remaining changed), 2) Top 5 next micro tasks, 3) Any risk shifts, 4) A concise recap table. Keep it short (< 800 tokens).`;
			const system = 'You provide concise delta updates to an existing structured academic plan, focusing only on what changed and immediate next actions.';
			const response = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: { 'Authorization': `Bearer ${this.settings.openaiApiKey}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: 'gpt-4',
					messages: [
						{ role: 'system', content: system },
						{ role: 'user', content: deltaPrompt }
					],
					max_tokens: 900,
					temperature: 0.5
				})
			});
			if (!response.ok) throw new Error('API error');
			const data = await response.json();
			const deltaContent = data.choices[0].message.content;
			const today = new Date().toISOString().split('T')[0];
			const fileName = `${planType === 'prospectus' ? 'Prospectus' : 'Dissertation'} Plan Delta - ${today}.md`;
			const folder = (this.settings.planOutputFolder || '').trim();
			let fullPath = fileName;
			if (folder) { await this.ensureFolderExists(folder); fullPath = `${folder.replace(/\/$/, '')}/${fileName}`; }
			await this.safeCreateFile(fullPath, `# ${planType === 'prospectus' ? 'Prospectus' : 'Dissertation'} Plan Delta (${today})\n\n${deltaContent}`);
			if (!this.settings.lastPlans) this.settings.lastPlans = {};
			this.settings.lastPlans[planType] = { file: fullPath, created: today, daysRemaining: this.settings.lastPlans[planType]?.daysRemaining ?? null };
			await this.saveSettings();
			if (!this.settings.featureUsage) this.settings.featureUsage = {};
			this.settings.featureUsage.createdDelta = true;
			this.saveSettings();
			new Notice('✅ Delta plan created');
		} catch (e) {
			console.error(e);
			new Notice('❌ Delta plan failed');
		}
	}

	private buildPlanPrompt(planType: 'dissertation' | 'prospectus'): string {
		const topic = this.settings.dissertationTopic || 'not specified';
		const deadlineRaw = planType === 'prospectus' ? this.settings.prospectusDeadline : this.settings.deadline;
		let timelineMeta = 'No specific deadline provided.';
		let daysRemaining: number | null = null;
		let weeksRemaining: number | null = null;
		if (deadlineRaw) {
			const parsed = new Date(deadlineRaw);
			if (!isNaN(parsed.getTime())) {
				const now = new Date();
				const diffMs = parsed.getTime() - now.getTime();
				if (diffMs > 0) {
					daysRemaining = Math.ceil(diffMs / 86400000);
					weeksRemaining = Math.ceil(daysRemaining / 7);
					timelineMeta = `${daysRemaining} days (~${weeksRemaining} weeks) remain until the deadline (${deadlineRaw}). Provide a realistic weekly milestone ladder that de-risks slippage.`;
				} else {
					timelineMeta = `Deadline date (${deadlineRaw}) appears in the past; treat as needing rapid triage scaffolding.`;
				}
			}
		}
		const focusLabel = planType === 'prospectus' ? 'prospectus' : 'dissertation';
		const sections = planType === 'prospectus'
			? '1. Required prospectus sections (title page, abstract (if needed), introduction / background, problem statement, purpose, research questions/hypotheses, significance, literature review scaffold, proposed methodology, expected contributions).'
			: '1. Major chapters/sections (Introduction, Literature Review, Methods, Results, Discussion, Conclusion, Appendices).';
		const wordTarget = this.settings.targetWordCount;
		const pacingLine = wordTarget ? `Total target length ~${wordTarget.toLocaleString()} words. Provide rough word allocation per major section (percent + est words).` : 'No explicit word target provided; focus on structural clarity.';
		return `I am preparing a ${focusLabel} about "${topic}".
Deadline context: ${timelineMeta}

${pacingLine}

Neurodivergent constraints (ADHD):
- Task initiation friction
- Working memory volatility / context loss between sessions
- Need concrete micro actions (5–25 min) instead of vague goals
- Risk of over-planning paralysis

Please generate a structured ${focusLabel} plan with:
${sections}
2. For each section: concrete micro-tasks (5–25 min granularity) that move it forward.
3. A timeline mapping weeks (${weeksRemaining ?? 'N/A'} if numeric) to high-level deliverables; front-load clarity tasks (outline, scoping) early. If word target given, include weekly cumulative word range suggestions.
4. A risk / mitigation list (3–5 items) focused on momentum threats.
5. Context preservation tips after each major section (what to capture before stopping).
6. A quick-start list for the next 3 sessions (bullet list, each ≤ 15 min).

Format:
- Use markdown
- Top-level heading with plan type and topic
- Include a summary table (Section | Key Outputs | Est. Micro Tasks)
- Timeline as a markdown table if possible

Keep tone encouraging, neutral, non-judgmental.`;
	}

	async generatePlan(planType: 'dissertation' | 'prospectus'): Promise<string> {
		const prompt = this.buildPlanPrompt(planType);
		const system = planType === 'prospectus'
			? 'You are an expert academic advisor helping students craft rigorous yet manageable dissertation prospectus documents. Emphasize scope clarity and early risk reduction.'
			: 'You are an expert academic advisor specializing in helping ADHD students complete dissertations. Focus on breaking down complex academic work into specific, actionable micro-tasks.';
		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.settings.openaiApiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'gpt-4',
				messages: [
					{ role: 'system', content: system },
					{ role: 'user', content: prompt }
				],
				max_tokens: 2500,
				temperature: 0.7
			})
		});
		if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
		const data = await response.json();
		return data.choices[0].message.content;
	}

	async createPlanFile(planType: 'dissertation' | 'prospectus', plan: string) {
		const today = new Date().toISOString().split('T')[0];
		const isProspectus = planType === 'prospectus';
		const deadline = isProspectus ? this.settings.prospectusDeadline : this.settings.deadline;
		let daysRemaining: number | null = null;
		if (deadline) {
			const d = new Date(deadline);
			if (!isNaN(d.getTime())) {
				const diff = d.getTime() - Date.now();
				if (diff > 0) daysRemaining = Math.ceil(diff / 86400000);
			}
		}
		const baseName = `${isProspectus ? 'Prospectus' : 'Dissertation'} Plan - ${today}.md`;
		const folder = (this.settings.planOutputFolder || '').trim();
		let filePath = baseName;
		if (folder) {
			// ensure folder exists (nested supported)
			await this.ensureFolderExists(folder);
			filePath = `${folder.replace(/\/$/, '')}/${baseName}`;
		}
		const actionsBlock = `\n<div class="ds-plan-actions">\n  <button class="ds-plan-seed-btn" data-plan-type="${planType}">Seed top bullets as micro tasks →</button>\n  <button class="ds-plan-delta-btn" data-plan-type="${planType}">Generate delta update</button>\n</div>\n`;
		const frontmatter = `---\ncreated: ${today}\nplanType: ${planType}\ntopic: "${this.settings.dissertationTopic}"\n${isProspectus ? 'prospectusDeadline' : 'deadline'}: "${deadline || ''}"\ndaysRemaining: ${daysRemaining ?? 'null'}\noutputFolder: "${folder}"\n---\n\n# ${isProspectus ? 'Prospectus' : 'Dissertation'} Plan: ${this.settings.dissertationTopic}\n\nGenerated on: ${today}\n${deadline ? `Target ${isProspectus ? 'Prospectus' : 'Dissertation'} Deadline: ${deadline}` : 'No deadline specified'}\n\n${plan}${actionsBlock}\n---\n*Generated by AI – refine and adapt based on advisor feedback and evolving clarity.*\n`;
		await this.safeCreateFile(filePath, frontmatter);
		// Record metadata
		if (!this.settings.lastPlans) this.settings.lastPlans = {};
		this.settings.lastPlans[planType] = { file: filePath, created: today, daysRemaining };
		await this.saveSettings();
	}

	private async ensureFolderExists(path: string) {
		const parts = path.split('/').filter(Boolean);
		let current = '';
		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			// @ts-ignore
			if (!this.app.vault.getAbstractFileByPath(current)) {
				// @ts-ignore
				await this.app.vault.createFolder(current).catch(()=>{});
			}
		}
	}

	private async safeCreateFile(path: string, content: string) {
		// @ts-ignore
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing) {
			// append suffix to avoid overwrite
			const extIndex = path.lastIndexOf('.');
			const base = extIndex === -1 ? path : path.substring(0, extIndex);
			const ext = extIndex === -1 ? '' : path.substring(extIndex);
			let i = 1;
			let candidate = `${base} (${i})${ext}`;
			// @ts-ignore
			while (this.app.vault.getAbstractFileByPath(candidate)) {
				i++; candidate = `${base} (${i})${ext}`;
			}
			path = candidate;
		}
		await this.app.vault.create(path, content);
		return path;
	}
}

class QuickStartModal extends Modal {
	plugin: DissertationSupportPlugin;

	constructor(app: App, plugin: DissertationSupportPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: '🎓 Dissertation Support' });
		
		contentEl.createEl('p', { 
			text: 'This plugin provides proactive reminders and AI-powered planning for ADHD-friendly dissertation writing.' 
		});

		const quickActions = contentEl.createDiv('quick-actions');
		
		const planButton = quickActions.createEl('button', { 
			text: '🤖 Plan my dissertation with AI',
			cls: 'mod-cta'
		});
		planButton.onclick = () => {
			this.close();
			this.plugin.runAIPlanning('dissertation');
		};

		const settingsButton = quickActions.createEl('button', { 
			text: '⚙️ Open Settings' 
		});
		settingsButton.onclick = () => {
			this.close();
			// @ts-ignore
			this.app.setting.open();
			// @ts-ignore  
			this.app.setting.openTabById(this.plugin.manifest.id);
		};

		const reminderButton = quickActions.createEl('button', { 
			text: this.plugin.settings.isReminderActive ? '⏸️ Pause Reminders' : '▶️ Start Reminders'
		});
		reminderButton.onclick = () => {
			this.plugin.toggleReminders();
			this.close();
		};
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class FocusPanelModal extends Modal {
	plugin: DissertationSupportPlugin;

	constructor(app: App, plugin: DissertationSupportPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('ds-focus-modal');
		const plan = this.plugin.settings.lastDailyPlan;
		if (!plan) {
			contentEl.createEl('p', { text: 'No plan available.' });
			return;
		}
		contentEl.createEl('h2', { text: "Today's Focus" });
		const suggestionsContainer = contentEl.createDiv({ cls: 'ds-focus-suggestions' });
		plan.suggestions.forEach(s => {
			const row = suggestionsContainer.createDiv({ cls: 'ds-focus-suggestion' });
			const checkbox = row.createEl('input', { type: 'checkbox' });
			checkbox.checked = s.done;
			checkbox.addEventListener('change', () => {
				s.done = checkbox.checked;
				plan.lastUpdated = Date.now();
				this.plugin.saveSettings();
				row.toggleClass('is-done', s.done);
			});
			const label = row.createEl('span', { text: s.text });
		});
		// First action input
		const firstActionWrap = contentEl.createDiv({ cls: 'ds-focus-field' });
		firstActionWrap.createEl('label', { text: "What I'll do first" });
		const firstInput = firstActionWrap.createEl('input', { type: 'text', value: plan.firstAction });
		firstInput.placeholder = 'e.g., Outline subsection on methods';
		firstInput.addEventListener('blur', () => {
			plan.firstAction = firstInput.value.trim();
			plan.lastUpdated = Date.now();
			this.plugin.saveSettings();
		});
		// Stop point input
		const stopWrap = contentEl.createDiv({ cls: 'ds-focus-field' });
		stopWrap.createEl('label', { text: 'Planned stop point' });
		const stopInput = stopWrap.createEl('input', { type: 'text', value: plan.stopPoint });
		stopInput.placeholder = 'e.g., Finish first paragraph';
		stopInput.addEventListener('blur', () => {
			plan.stopPoint = stopInput.value.trim();
			plan.lastUpdated = Date.now();
			this.plugin.saveSettings();
		});

		const footer = contentEl.createDiv({ cls: 'ds-focus-footer' });
		const closeBtn = footer.createEl('button', { text: 'Close' });
		closeBtn.addEventListener('click', () => this.close());
	}

	onClose() {
		this.contentEl.empty();
	}
}

class AddMicroTaskModal extends Modal {
	plugin: DissertationSupportPlugin;
	onSubmit: (text: string) => void;

	constructor(app: App, plugin: DissertationSupportPlugin, onSubmit: (text: string)=>void) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('ds-focus-modal');
		contentEl.createEl('h2', { text: 'New Micro Task' });
		const wrap = contentEl.createDiv({ cls: 'ds-focus-field' });
		wrap.createEl('label', { text: 'Describe a tiny action (≤ 25 min)' });
		const input = wrap.createEl('textarea');
		(input as HTMLTextAreaElement).rows = 3;
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
				this.submit(input as HTMLTextAreaElement);
			}
		});
		const footer = contentEl.createDiv({ cls: 'ds-focus-footer' });
		const addBtn = footer.createEl('button', { text: 'Add' });
		addBtn.addEventListener('click', () => this.submit(input as HTMLTextAreaElement));
		const cancel = footer.createEl('button', { text: 'Cancel' });
		cancel.addEventListener('click', () => this.close());
	}

	submit(input: HTMLTextAreaElement) {
		const value = input.value.trim();
		if (!value) { new Notice('Enter a tiny actionable task'); return; }
		this.onSubmit(value);
		this.close();
	}

	onClose() { this.contentEl.empty(); }
}

class ApiKeyPromptModal extends Modal {
	private plugin: DissertationSupportPlugin;
	private onComplete: (hasApiKey: boolean) => void;

	constructor(app: App, plugin: DissertationSupportPlugin, onComplete: (hasApiKey: boolean) => void) {
		super(app);
		this.plugin = plugin;
		this.onComplete = onComplete;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('ds-focus-modal');
		
		// Header
		contentEl.createEl('h2', { text: '🤖 AI-Powered Project Creation' });
		
		// Description
		const description = contentEl.createDiv();
		description.setText('This feature uses AI to guide you through project planning with personalized questions and suggestions. To enable this, you\'ll need an OpenAI API key.');
		
		// Status check
		const statusDiv = contentEl.createDiv({ cls: 'ds-api-status' });
		const hasKey = this.plugin.settings.openaiApiKey?.trim();
		if (hasKey) {
			statusDiv.innerHTML = '✅ API key is already configured';
		} else {
			statusDiv.innerHTML = '⚠️ No API key found';
		}

		// API Key input (if no key exists)
		let apiKeyInput: HTMLInputElement | null = null;
		if (!hasKey) {
			const inputWrapper = contentEl.createDiv({ cls: 'ds-api-input-wrapper' });
			inputWrapper.createEl('label', { text: 'Enter your OpenAI API key:' });
			apiKeyInput = inputWrapper.createEl('input', { type: 'password', placeholder: 'sk-...' });
			apiKeyInput.style.width = '100%';
			apiKeyInput.style.marginTop = '8px';
			
			const helpText = inputWrapper.createDiv({ cls: 'ds-api-help' });
			helpText.innerHTML = 'Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a>. Your key is stored locally in Obsidian.';
		}

		// Buttons
		const footer = contentEl.createDiv({ cls: 'ds-focus-footer' });
		
		if (hasKey) {
			// If key exists, just continue with AI
			const continueBtn = footer.createEl('button', { text: 'Continue with AI', cls: 'ds-button-primary' });
			continueBtn.addEventListener('click', () => {
				this.close();
				this.onComplete(true);
			});
		} else {
			// If no key, offer to set it or skip
			const setKeyBtn = footer.createEl('button', { text: 'Set API Key & Continue', cls: 'ds-button-primary' });
			setKeyBtn.addEventListener('click', async () => {
				const key = apiKeyInput?.value?.trim();
				if (!key) {
					new Notice('Please enter a valid API key');
					return;
				}
				this.plugin.settings.openaiApiKey = key;
				await this.plugin.saveSettings();
				new Notice('✅ API key saved');
				this.close();
				this.onComplete(true);
			});
		}

		const skipBtn = footer.createEl('button', { text: 'Skip (Local Mode)', cls: 'ds-button-secondary' });
		skipBtn.addEventListener('click', () => {
			this.close();
			this.onComplete(false);
		});

		// Auto-focus the input if present
		if (apiKeyInput) {
			setTimeout(() => apiKeyInput?.focus(), 100);
		}
	}

	onClose() { 
		this.contentEl.empty(); 
	}
}

class DissertationSettingTab extends PluginSettingTab {
	plugin: DissertationSupportPlugin;

	constructor(app: App, plugin: DissertationSupportPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Dissertation Support Settings' });

		new Setting(containerEl)
			.setName('Reminder interval')
			.setDesc('How often to show proactive reminders (in minutes)')
			.addText(text => text
				.setPlaceholder('60')
				.setValue(this.plugin.settings.reminderInterval.toString())
				.onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.reminderInterval = num;
						await this.plugin.saveSettings();
						this.plugin.startProactiveReminders(); // Restart with new interval
					}
				}));

		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('Your OpenAI API key for AI-powered dissertation planning')
			.addText(text => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings.openaiApiKey)
				.onChange(async (value) => {
					this.plugin.settings.openaiApiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Dissertation Topic')
			.setDesc('What is your dissertation about? (for AI planning)')
			.addTextArea(text => text
				.setPlaceholder('e.g., "The impact of climate change on coastal ecosystems"')
				.setValue(this.plugin.settings.dissertationTopic)
				.onChange(async (value) => {
					this.plugin.settings.dissertationTopic = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Deadline')
			.setDesc('When is your dissertation due?')
			.addText(text => text
				.setPlaceholder('e.g., "May 2025" or "2025-05-15"')
				.setValue(this.plugin.settings.deadline)
				.onChange(async (value) => {
					this.plugin.settings.deadline = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Prospectus Deadline')
			.setDesc('Optional separate deadline for prospectus stage planning')
			.addText(text => text
				.setPlaceholder('e.g., "2025-01-15"')
				.setValue(this.plugin.settings.prospectusDeadline || '')
				.onChange(async (value) => {
					this.plugin.settings.prospectusDeadline = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Plan Output Folder')
			.setDesc('Optional: relative folder path to store generated plan files (leave blank for vault root)')
			.addText(text => text
				.setPlaceholder('e.g., Plans/Dissertation')
				.setValue(this.plugin.settings.planOutputFolder || '')
				.onChange(async (value) => {
					this.plugin.settings.planOutputFolder = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Target Word Count')
			.setDesc('Optional total dissertation target word count to shape pacing assumptions')
			.addText(text => text
				.setPlaceholder('e.g., 60000')
				.setValue(this.plugin.settings.targetWordCount ? String(this.plugin.settings.targetWordCount) : '')
				.onChange(async (value) => {
					const num = parseInt(value, 10);
					this.plugin.settings.targetWordCount = isNaN(num) ? undefined : num;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Proactive Reminders')
			.setDesc('Enable proactive reminders to work on your dissertation')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.isReminderActive)
				.onChange(async (value) => {
					this.plugin.settings.isReminderActive = value;
					await this.plugin.saveSettings();
					
					if (value) {
						this.plugin.startProactiveReminders();
					} else {
						this.plugin.stopProactiveReminders();
					}
				}));

		new Setting(containerEl)
			.setName('Notion-like visual style')
			.setDesc('Enable enhanced minimal “Notion” style for resume card and future UI components')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.notionStyleEnabled)
				.onChange(async (value) => {
					this.plugin.settings.notionStyleEnabled = value;
					await this.plugin.saveSettings();
				}));


	}
}



class ProjectDialogueModal extends Modal {
	private dialogueService: ProjectDialogueService;
	private onComplete: (plan: any) => Promise<void>;
	private currentSession: any = null;
	private questionContainer: HTMLElement;
	private progressBar: HTMLElement;
	private submitButton: HTMLButtonElement;
	private currentQuestion: any = null;

	constructor(app: App, dialogueService: ProjectDialogueService, onComplete: (plan: any) => Promise<void>) {
		super(app);
		this.dialogueService = dialogueService;
		this.onComplete = onComplete;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('ds-focus-modal');
		contentEl.addClass('ds-project-dialogue');
		
		// Header
		contentEl.createEl('h2', { text: '🚀 Start New Project' });
		contentEl.createDiv({ 
			text: 'Let\'s break down your project into manageable steps through a quick conversation.',
			cls: 'ds-dialogue-intro' 
		});

		// Show project type selection first
		await this.showProjectTypeSelection();
	}

	private async showProjectTypeSelection(): Promise<void> {
		const { contentEl } = this;
		
		// Project type selection
		const typeContainer = contentEl.createDiv({ cls: 'ds-project-type-selection' });
		typeContainer.createEl('h3', { text: 'What type of project are you working on?' });
		
		const projectTypes = [
			{ value: 'dissertation', label: '🎓 Dissertation', desc: 'Full dissertation project with AI-powered planning' },
			{ value: 'chapter', label: '📖 Dissertation Chapter', desc: 'Individual chapter or section' },
			{ value: 'proposal', label: '📋 Research Proposal', desc: 'Grant proposal or research plan' },
			{ value: 'paper', label: '📄 Academic Paper', desc: 'Journal article or conference paper' },
			{ value: 'other', label: '💼 Other Project', desc: 'General academic or research project' }
		];

		const typeButtonsContainer = typeContainer.createDiv({ cls: 'ds-type-buttons' });
		
		projectTypes.forEach(type => {
			const typeButton = typeButtonsContainer.createDiv({ cls: 'ds-type-button' });
			
			const typeHeader = typeButton.createDiv({ cls: 'ds-type-header' });
			typeHeader.createSpan({ text: type.label, cls: 'ds-type-label' });
			
			typeButton.createDiv({ text: type.desc, cls: 'ds-type-desc' });
			
			typeButton.addEventListener('click', async () => {
				// Highlight selected type
				typeButtonsContainer.querySelectorAll('.ds-type-button').forEach(btn => btn.removeClass('selected'));
				typeButton.addClass('selected');
				
				// Start dialogue with selected project type
				await this.startDialogueWithType(type.value);
			});
		});
	}

	private async startDialogueWithType(projectType: string): Promise<void> {
		const { contentEl } = this;
		
		// Clear the type selection and show progress UI
		contentEl.empty();
		
		// Header
		contentEl.createEl('h2', { text: '🚀 Start New Project' });
		contentEl.createDiv({ 
			text: `Setting up your ${projectType} project with tailored questions and planning.`,
			cls: 'ds-dialogue-intro' 
		});

		// Progress bar
		const progressContainer = contentEl.createDiv({ cls: 'ds-progress-container' });
		progressContainer.createDiv({ text: 'Progress:', cls: 'ds-progress-label' });
		this.progressBar = progressContainer.createDiv({ cls: 'ds-progress-bar' });
		this.progressBar.createDiv({ cls: 'ds-progress-fill' });

		// Question container
		this.questionContainer = contentEl.createDiv({ cls: 'ds-question-container' });

		// Start the dialogue with the selected project type
		try {
			this.currentSession = await this.dialogueService.startProjectDialogue({
				type: projectType as any
			});
			await this.showNextQuestion();
		} catch (error) {
			this.questionContainer.createEl('p', { 
				text: 'Sorry, there was an error starting the project dialogue. Please check your AI settings.',
				cls: 'ds-error'
			});
			console.error('[Project Dialogue] Failed to start:', error);
		}
	}

	private async showNextQuestion(): Promise<void> {
		if (!this.currentSession) return;

		// Update progress
		const progress = this.dialogueService.getSessionProgress(this.currentSession.id);
		if (progress) {
			const progressFill = this.progressBar.querySelector('.ds-progress-fill') as HTMLElement;
			if (progressFill) {
				progressFill.style.width = `${progress.percentage}%`;
			}
			
			const progressText = this.progressBar.parentElement?.querySelector('.ds-progress-label');
			if (progressText) {
				progressText.textContent = `Progress: ${progress.current}/${progress.total} (${progress.percentage}%)`;
			}
		}

		// Get next question
		try {
			this.currentQuestion = this.dialogueService.getNextQuestion(this.currentSession.id);
			if (!this.currentQuestion) {
				await this.completeDialogue();
				return;
			}

			// Clear previous question
			this.questionContainer.empty();

			// Show question
			const questionEl = this.questionContainer.createDiv({ cls: 'ds-question' });
			questionEl.createEl('h3', { text: this.currentQuestion.text });

			if (this.currentQuestion.context) {
				questionEl.createEl('p', { 
					text: this.currentQuestion.context,
					cls: 'ds-question-context'
				});
			}

			// Create input based on question type
			let inputEl: HTMLElement;
			
			if (this.currentQuestion.type === 'choice' && this.currentQuestion.choices) {
				// Multiple choice
				const choicesContainer = questionEl.createDiv({ cls: 'ds-choices' });
				this.currentQuestion.choices.forEach((choice: string) => {
					const choiceBtn = choicesContainer.createEl('button', { 
						text: choice,
						cls: 'ds-choice-button'
					});
					choiceBtn.addEventListener('click', () => {
						// Highlight selected choice
						choicesContainer.querySelectorAll('button').forEach(btn => btn.removeClass('selected'));
						choiceBtn.addClass('selected');
						if (this.submitButton) {
							this.submitButton.disabled = false;
						}
					});
				});
				inputEl = choicesContainer;
			} else {
				// Text input
				inputEl = questionEl.createEl('textarea', { 
					placeholder: this.currentQuestion.placeholder || 'Your answer...',
					cls: 'ds-text-input'
				});
				
				inputEl.addEventListener('input', () => {
					const value = (inputEl as HTMLTextAreaElement).value.trim();
					if (this.submitButton) {
						this.submitButton.disabled = value.length === 0;
					}
				});
			}

			// Submit button
			const buttonContainer = this.questionContainer.createDiv({ cls: 'ds-button-container' });
			this.submitButton = buttonContainer.createEl('button', {
				text: 'Next',
				cls: 'ds-submit-button'
			});
			this.submitButton.disabled = true;

			this.submitButton.addEventListener('click', async () => {
				let answer = '';
				
				if (this.currentQuestion.type === 'choice') {
					const selectedChoice = this.questionContainer.querySelector('.ds-choice-button.selected');
					answer = selectedChoice?.textContent || '';
				} else {
					answer = (inputEl as HTMLTextAreaElement).value.trim();
				}

				if (!answer) return;

				try {
					this.submitButton.disabled = true;
					this.submitButton.textContent = 'Processing...';
					
					const result = await this.dialogueService.submitAnswer(
						this.currentSession.id, 
						this.currentQuestion.id, 
						answer
					);

					if (result.isComplete) {
						await this.completeDialogue();
					} else {
						await this.showNextQuestion();
					}
				} catch (error) {
					console.error('[Project Dialogue] Failed to submit answer:', error);
					this.submitButton.disabled = false;
					this.submitButton.textContent = 'Next';
					new Notice('Failed to submit answer. Please try again.');
				}
			});

		} catch (error) {
			console.error('[Project Dialogue] Failed to get next question:', error);
			this.questionContainer.createEl('p', { 
				text: 'Sorry, there was an error getting the next question.',
				cls: 'ds-error'
			});
		}
	}

	private async completeDialogue(): Promise<void> {
		if (!this.currentSession) return;

		// First, show template options if available
		const templates = this.dialogueService.getSuggestedTemplates(this.currentSession.id);
		
		if (templates.length > 0) {
			this.questionContainer.empty();
			this.questionContainer.createEl('h3', { text: '📋 Choose a Template (Optional)' });
			this.questionContainer.createDiv({ 
				text: 'We found a template that matches your project. Would you like to use it for a structured start?',
				cls: 'ds-template-intro'
			});

			const templateContainer = this.questionContainer.createDiv({ cls: 'ds-template-options' });
			
			// Template option
			const template = templates[0]; // Use the first suggested template
			const templateCard = templateContainer.createDiv({ cls: 'ds-template-card' });
			templateCard.createEl('h4', { text: template.name });
			templateCard.createDiv({ text: template.description, cls: 'ds-template-description' });
			templateCard.createDiv({ 
				text: `${template.phases.length} phases • ~${template.estimatedWeeks} weeks • ${template.energyProfile} energy`,
				cls: 'ds-template-meta'
			});

			// Action buttons
			const buttonContainer = this.questionContainer.createDiv({ cls: 'ds-button-container' });
			
			const useTemplateBtn = buttonContainer.createEl('button', {
				text: `Use ${template.name} Template`,
				cls: 'ds-submit-button'
			});
			
			const skipTemplateBtn = buttonContainer.createEl('button', {
				text: 'Skip Template',
				cls: 'ds-secondary-button'
			});

			useTemplateBtn.addEventListener('click', async () => {
				await this.generatePlanWithTemplate(template.id);
			});

			skipTemplateBtn.addEventListener('click', async () => {
				await this.generatePlanWithoutTemplate();
			});
		} else {
			await this.generatePlanWithoutTemplate();
		}
	}

	private async generatePlanWithTemplate(templateId: string): Promise<void> {
		this.questionContainer.empty();
		this.questionContainer.createDiv({ 
			text: '🎯 Generating your structured project plan...',
			cls: 'ds-generating'
		});

		try {
			const plan = await this.dialogueService.applyTemplateToProject(this.currentSession.id, templateId);
			await this.onComplete(plan);
			this.close();
		} catch (error) {
			console.error('[Project Dialogue] Failed to generate template plan:', error);
			this.questionContainer.empty();
			this.questionContainer.createEl('p', { 
				text: 'Sorry, there was an error generating your template plan. Falling back to custom plan.',
				cls: 'ds-error'
			});
			// Fall back to regular plan generation
			setTimeout(() => this.generatePlanWithoutTemplate(), 2000);
		}
	}

	private async generatePlanWithoutTemplate(): Promise<void> {
		this.questionContainer.empty();
		this.questionContainer.createDiv({ 
			text: 'Great! Generating your custom project plan...',
			cls: 'ds-generating'
		});

		try {
			const plan = await this.dialogueService.generateProjectPlan(this.currentSession.id);
			await this.onComplete(plan);
			this.close();
		} catch (error) {
			console.error('[Project Dialogue] Failed to generate plan:', error);
			this.questionContainer.empty();
			this.questionContainer.createEl('p', { 
				text: 'Sorry, there was an error generating your project plan. Please try again.',
				cls: 'ds-error'
			});
		}
	}

	onClose() { 
		this.contentEl.empty(); 
	}
}

// --- Utilities ---
function escapeHtml(str: string): string {
	return str.replace(/[&<>"']/g, (ch) => {
		switch (ch) {
			case '&': return '&amp;';
			case '<': return '&lt;';
			case '>': return '&gt;';
			case '"': return '&quot;';
			case "'": return '&#39;';
			default: return ch;
		}
	});
}

// Welcome Guide View Type
export const WELCOME_GUIDE_VIEW_TYPE = 'dissertation-support-welcome-guide';

class WelcomeGuideView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return WELCOME_GUIDE_VIEW_TYPE;
	}

	getDisplayText() {
		return '🧠 ADHD Guide';
	}

	getIcon() {
		return 'help-circle';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('ds-welcome-guide-view');
		
		// Header
		const header = container.createDiv({ cls: 'ds-welcome-header' });
		header.createEl('h1', { text: '🧠 Dissertation Support Guide' });
		header.createDiv({ 
			text: 'ADHD-friendly academic productivity system',
			cls: 'ds-welcome-subtitle'
		});

		// Navigation tabs
		const tabContainer = container.createDiv({ cls: 'ds-welcome-tabs' });
		const tabs = [
			{ id: 'quickstart', label: '🚀 Quick Start', icon: '🚀' },
			{ id: 'features', label: '🎯 Features', icon: '🎯' },
			{ id: 'commands', label: '⌨️ Commands', icon: '⌨️' },
			{ id: 'tips', label: '💡 ADHD Tips', icon: '💡' }
		];

		const contentContainer = container.createDiv({ cls: 'ds-welcome-content' });
		let activeTab = 'quickstart';

		tabs.forEach(tab => {
			const tabBtn = tabContainer.createEl('button', {
				text: tab.label,
				cls: `ds-welcome-tab ${tab.id === activeTab ? 'active' : ''}`
			});
			tabBtn.addEventListener('click', () => {
				// Update active tab
				tabContainer.querySelectorAll('.ds-welcome-tab').forEach(t => t.removeClass('active'));
				tabBtn.addClass('active');
				activeTab = tab.id;
				this.renderTabContent(contentContainer, tab.id);
			});
		});

		// Render initial content
		this.renderTabContent(contentContainer, activeTab);

		// Footer actions
		const footer = container.createDiv({ cls: 'ds-welcome-footer' });
		const startBtn = footer.createEl('button', {
			text: '🚀 Start First Project',
			cls: 'ds-primary-button'
		});
		startBtn.addEventListener('click', () => {
			// Trigger the project dialogue
			(this.app as any).commands.executeCommandById('dissertation-support:start-new-project');
		});

		const settingsBtn = footer.createEl('button', {
			text: '⚙️ Open Settings',
			cls: 'ds-secondary-button'
		});
		settingsBtn.addEventListener('click', () => {
			(this.app as any).setting.open();
			(this.app as any).setting.openTabById('dissertation-support');
		});
	}

	private renderTabContent(container: HTMLElement, tabId: string) {
		container.empty();

		switch (tabId) {
			case 'quickstart':
				this.renderQuickStartTab(container);
				break;
			case 'features':
				this.renderFeaturesTab(container);
				break;
			case 'commands':
				this.renderCommandsTab(container);
				break;
			case 'tips':
				this.renderTipsTab(container);
				break;
		}
	}

	private renderQuickStartTab(container: HTMLElement) {
		const content = container.createDiv({ cls: 'ds-tab-content' });
		
		content.createEl('h2', { text: '🚀 Get Started in 5 Minutes' });
		
		const steps = [
			{
				title: '1. Basic Setup',
				items: [
					'Plugin is auto-activated ✅',
					'Go to Settings → Dissertation Support',
					'Add your OpenAI API Key'
				]
			},
			{
				title: '2. Start Your First Project',
				items: [
					'Click the 🧠 Brain icon in the ribbon',
					'Answer 5-7 conversational questions',
					'Choose from ADHD-optimized templates',
					'Get immediate micro-tasks (5-25 minutes each)'
				]
			},
			{
				title: '3. Work ADHD-Smart',
				items: [
					'Focus on 2-3 micro-tasks today',
					'Use the task board: Todo → Doing → Done',
					'Celebrate small wins 🎉',
					'Let proactive reminders guide you'
				]
			}
		];

		steps.forEach(step => {
			const stepEl = content.createDiv({ cls: 'ds-step' });
			stepEl.createEl('h3', { text: step.title });
			const list = stepEl.createEl('ul');
			step.items.forEach(item => {
				list.createEl('li', { text: item });
			});
		});

		// Quick actions
		const actionsDiv = content.createDiv({ cls: 'ds-quick-actions' });
		actionsDiv.createEl('h3', { text: '⚡ Quick Actions' });
		
		const actionBtn = actionsDiv.createEl('button', {
			text: '🚀 Start New Project Now',
			cls: 'ds-action-button'
		});
		actionBtn.addEventListener('click', () => {
			(this.app as any).commands.executeCommandById('dissertation-support:start-new-project');
		});
	}

	private renderFeaturesTab(container: HTMLElement) {
		const content = container.createDiv({ cls: 'ds-tab-content' });
		
		content.createEl('h2', { text: '🎯 Core Features' });

		const features = [
			{
				icon: '🤖',
				title: 'AI Project Dialogue',
				desc: 'Conversational project planning that breaks down overwhelming tasks into manageable steps'
			},
			{
				icon: '📋',
				title: 'Academic Templates',
				desc: '6 pre-built templates (dissertation, paper, proposal, etc.) with ADHD-optimized task sequences'
			},
			{
				icon: '✅',
				title: 'Micro-Task Board',
				desc: 'Today-focused task management with 5-25 minute chunks to prevent overwhelm'
			},
			{
				icon: '⏰',
				title: 'Proactive Reminders',
				desc: 'Gentle, context-aware nudges to maintain momentum without being overwhelming'
			},
			{
				icon: '🎯',
				title: 'Focus Panel',
				desc: 'Distraction-free workspace for deep work sessions with built-in timers'
			},
			{
				icon: '📊',
				title: 'Progress Tracking',
				desc: 'Visual progress indicators and automatic resume cards in daily notes'
			}
		];

		features.forEach(feature => {
			const featureEl = content.createDiv({ cls: 'ds-feature' });
			featureEl.createEl('div', { text: feature.icon, cls: 'ds-feature-icon' });
			const textDiv = featureEl.createDiv({ cls: 'ds-feature-text' });
			textDiv.createEl('h4', { text: feature.title });
			textDiv.createEl('p', { text: feature.desc });
		});
	}

	private renderCommandsTab(container: HTMLElement) {
		const content = container.createDiv({ cls: 'ds-tab-content' });
		
		content.createEl('h2', { text: '⌨️ Commands & Shortcuts' });

		const commands = [
			{ name: 'Start New Project', shortcut: 'Ctrl/Cmd+P → Search', desc: 'Launch AI project dialogue' },
			{ name: 'Plan dissertation with AI', shortcut: 'Command Palette', desc: 'Full dissertation planning' },
			{ name: 'Focus on today\'s plan', shortcut: 'Command Palette', desc: 'Open focus workspace' },
			{ name: 'Toggle reminders', shortcut: 'Command Palette', desc: 'Turn proactive nudges on/off' },
			{ name: 'Insert resume card', shortcut: 'Command Palette', desc: 'Add progress summary to daily note' }
		];

		const table = content.createEl('table', { cls: 'ds-commands-table' });
		const header = table.createEl('thead');
		const headerRow = header.createEl('tr');
		headerRow.createEl('th', { text: 'Command' });
		headerRow.createEl('th', { text: 'Access' });
		headerRow.createEl('th', { text: 'Description' });

		const tbody = table.createEl('tbody');
		commands.forEach(cmd => {
			const row = tbody.createEl('tr');
			row.createEl('td', { text: cmd.name, cls: 'ds-cmd-name' });
			row.createEl('td', { text: cmd.shortcut, cls: 'ds-cmd-shortcut' });
			row.createEl('td', { text: cmd.desc });
		});

		// Ribbon info
		const ribbonSection = content.createDiv({ cls: 'ds-ribbon-info' });
		ribbonSection.createEl('h3', { text: '🧠 Ribbon Icon' });
		ribbonSection.createEl('p', { text: 'Click the Brain icon in the left ribbon for quick access to project initiation and main features.' });
	}

	private renderTipsTab(container: HTMLElement) {
		const content = container.createDiv({ cls: 'ds-tab-content' });
		
		content.createEl('h2', { text: '🧠 ADHD-Specific Tips' });

		const categories = [
			{
				title: '🎯 Getting Started Right',
				tips: [
					'Start with ONE project, not everything at once',
					'Use templates - don\'t reinvent the wheel',
					'Answer dialogue questions honestly',
					'Celebrate completing your first 2-3 micro-tasks'
				]
			},
			{
				title: '⚡ Maintaining Momentum',
				tips: [
					'Check your resume card each morning',
					'Match high-energy tasks to when you feel alert',
					'Break tasks down if they feel too big',
					'Use focus mode to minimize distractions'
				]
			},
			{
				title: '🧠 Working with ADHD Brain',
				tips: [
					'Don\'t over-plan - start with templates, customize later',
					'Forgive breaks - re-entry is built in, just restart',
					'Use the visual task board actively',
					'Share your progress with accountability partners'
				]
			}
		];

		categories.forEach(category => {
			const categoryEl = content.createDiv({ cls: 'ds-tip-category' });
			categoryEl.createEl('h3', { text: category.title });
			const list = categoryEl.createEl('ul');
			category.tips.forEach(tip => {
				list.createEl('li', { text: tip });
			});
		});

		// Executive function support
		const execSection = content.createDiv({ cls: 'ds-exec-support' });
		execSection.createEl('h3', { text: '🎛️ Executive Function Support' });
		execSection.createEl('p', { text: 'This plugin is specifically designed to support:'});
		
		const supportList = execSection.createEl('ul');
		[
			'Working memory (visual progress, saved context)',
			'Task initiation (pre-structured templates)',
			'Attention regulation (focus mode, time limits)',
			'Emotional regulation (celebration of wins)'
		].forEach(item => {
			supportList.createEl('li', { text: item });
		});
	}

	async onClose() {
		// Clean up
	}
}