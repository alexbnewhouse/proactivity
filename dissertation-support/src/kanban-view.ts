import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import { KanbanBoard, KanbanCard, KanbanColumn } from './kanban-service';
import DissertationSupportPlugin from '../main';

export const KANBAN_VIEW_TYPE = "kanban-view";

export class KanbanView extends ItemView {
	plugin: DissertationSupportPlugin;
	currentBoard: KanbanBoard | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: DissertationSupportPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return KANBAN_VIEW_TYPE;
	}

	getDisplayText() {
		return "Project Kanban";
	}

	getIcon() {
		return "kanban-square";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('kanban-view-container');

		// Create header
		const header = container.createDiv('kanban-header');
		header.createEl('h2', { text: 'Project Kanban Board', cls: 'kanban-title' });
		
		const toolbar = header.createDiv('kanban-toolbar');
		
		// Board selector
		const boardSelect = toolbar.createEl('select', { cls: 'kanban-board-select' });
		boardSelect.createEl('option', { text: 'Select a project...', value: '' });
		
		// New board button
		const newBoardBtn = toolbar.createEl('button', { 
			text: '+ New Board',
			cls: 'kanban-btn kanban-btn-primary'
		});
		
		newBoardBtn.addEventListener('click', () => {
			this.createNewBoard();
		});

		// Settings button
		const settingsBtn = toolbar.createEl('button', {
			text: '⚙️',
			cls: 'kanban-btn kanban-btn-secondary'
		});

		// Board container
		const boardContainer = container.createDiv('kanban-board');
		
		// Load saved board or show empty state
		await this.loadSavedBoard();
		
		if (!this.currentBoard) {
			this.showEmptyState(boardContainer);
		}
	}

	private async loadSavedBoard() {
		// TODO: Load last opened board from settings
		// For now, show empty state
	}

	private showEmptyState(container: HTMLElement) {
		container.empty();
		
		const emptyState = container.createDiv('kanban-empty-state');
		emptyState.createEl('h3', { text: '📋 No Project Board Selected' });
		emptyState.createEl('p', { 
			text: 'Create a new Kanban board to visualize your academic project progress with ADHD-friendly features.'
		});
		
		const features = emptyState.createDiv('kanban-features');
		features.createEl('h4', { text: 'ADHD-Optimized Features:' });
		
		const featureList = features.createEl('ul');
		featureList.createEl('li', { text: '🎯 Focus views to reduce overwhelm' });
		featureList.createEl('li', { text: '⚡ Energy-level matching for tasks' });
		featureList.createEl('li', { text: '⏱️ Realistic time estimates with buffers' });
		featureList.createEl('li', { text: '🔄 Smart task breakdown suggestions' });
		featureList.createEl('li', { text: '📊 Visual progress tracking' });
		
		const startBtn = emptyState.createEl('button', {
			text: 'Start Your First Board',
			cls: 'kanban-btn kanban-btn-cta'
		});
		
		startBtn.addEventListener('click', () => {
			this.createNewBoard();
		});
	}

	private async createNewBoard() {
		// For now, create a simple demo board
		// TODO: Implement proper board creation modal
		const demoBoard = this.plugin.projectKanbanService.createDemoBoard();
		if (demoBoard) {
			this.currentBoard = demoBoard;
			this.renderBoard();
		}
	}

	private renderBoard() {
		if (!this.currentBoard) return;

		const container = this.containerEl.querySelector('.kanban-board') as HTMLElement;
		if (!container) return;

		container.empty();
		container.addClass('kanban-board-active');

		// Board header
		const boardHeader = container.createDiv('kanban-board-header');
		boardHeader.createEl('h3', { 
			text: this.currentBoard.title,
			cls: 'kanban-board-title'
		});

		// Progress indicator
		const progress = this.calculateProgress();
		const progressBar = boardHeader.createDiv('kanban-progress');
		progressBar.createEl('div', {
			cls: 'kanban-progress-fill',
			attr: { style: `width: ${progress}%` }
		});
		progressBar.createSpan({ 
			text: `${Math.round(progress)}% Complete`,
			cls: 'kanban-progress-text'
		});

		// Columns container
		const columnsContainer = container.createDiv('kanban-columns');
		
		this.currentBoard.columns.forEach(column => {
			this.renderColumn(columnsContainer, column);
		});
	}

	private renderColumn(container: HTMLElement, column: KanbanColumn) {
		const columnEl = container.createDiv('kanban-column');
		
		// Get cards for this column
		const columnCards = this.currentBoard?.cards.filter(card => card.columnId === column.id) || [];
		
		// Column header
		const header = columnEl.createDiv('kanban-column-header');
		header.createEl('h4', { 
			text: column.title,
			cls: 'kanban-column-title'
		});
		
		// Card count and WIP limit
		const cardCount = header.createSpan({
			text: `${columnCards.length}`,
			cls: 'kanban-card-count'
		});
		
		if (column.cardLimit) {
			cardCount.appendText(` / ${column.cardLimit}`);
			if (columnCards.length > column.cardLimit) {
				cardCount.addClass('kanban-wip-exceeded');
			}
		}

		// Add card button
		const addBtn = header.createEl('button', {
			text: '+',
			cls: 'kanban-add-card-btn'
		});
		
		addBtn.addEventListener('click', () => {
			this.addNewCard(column);
		});

		// Cards container
		const cardsContainer = columnEl.createDiv('kanban-cards');
		
		// Render cards
		columnCards.forEach(card => {
			this.renderCard(cardsContainer, card);
		});

		// Drop zone for drag & drop
		this.setupDropZone(cardsContainer, column);
	}

	private renderCard(container: HTMLElement, card: KanbanCard) {
		const cardEl = container.createDiv('kanban-card');
		cardEl.draggable = true;
		cardEl.dataset.cardId = card.id;

		// Card title
		const title = cardEl.createEl('div', {
			text: card.title,
			cls: 'kanban-card-title'
		});

		// Card metadata
		const metadata = cardEl.createDiv('kanban-card-metadata');
		
		// Energy level indicator
		if (card.energyLevel) {
			const energyEl = metadata.createSpan({
				cls: `kanban-energy kanban-energy-${card.energyLevel}`
			});
			const energyEmoji = {
				low: '🟢',
				medium: '🟡', 
				high: '🔴'
			}[card.energyLevel];
			energyEl.textContent = energyEmoji;
		}

		// Time estimate
		if (card.timeEstimate) {
			metadata.createSpan({
				text: `⏱️ ${card.timeEstimate.realistic}min`,
				cls: 'kanban-time-estimate'
			});
		}

		// Priority
		if (card.priority && card.priority !== 'medium') {
			const priorityEl = metadata.createSpan({
				cls: `kanban-priority kanban-priority-${card.priority}`
			});
			priorityEl.textContent = card.priority === 'high' ? '🔥' : '📌';
		}

		// Progress bar for cards with subtasks
		if (card.subtasks && card.subtasks.length > 0) {
			const completedSubtasks = card.subtasks.filter(st => st.status === 'done').length;
			const progress = (completedSubtasks / card.subtasks.length) * 100;
			
			const progressBar = cardEl.createDiv('kanban-card-progress');
			const progressFill = progressBar.createDiv('kanban-card-progress-fill');
			progressFill.style.width = `${progress}%`;
		}

		// Card actions
		const actions = cardEl.createDiv('kanban-card-actions');
		actions.createEl('button', { 
			text: '✏️',
			cls: 'kanban-card-action',
			attr: { title: 'Edit card' }
		}).addEventListener('click', () => this.editCard(card));

		actions.createEl('button', { 
			text: '🔗',
			cls: 'kanban-card-action',
			attr: { title: 'Link to note' }
		}).addEventListener('click', () => this.linkCardToNote(card));

		// Drag & drop handlers
		this.setupCardDrag(cardEl, card);
	}

	private setupDropZone(container: HTMLElement, column: KanbanColumn) {
		container.addEventListener('dragover', (e) => {
			e.preventDefault();
			container.addClass('kanban-drop-active');
		});

		container.addEventListener('dragleave', () => {
			container.removeClass('kanban-drop-active');
		});

		container.addEventListener('drop', (e) => {
			e.preventDefault();
			container.removeClass('kanban-drop-active');
			
			const cardId = e.dataTransfer?.getData('text/card-id');
			if (cardId && this.currentBoard) {
				this.moveCard(cardId, column.id);
			}
		});
	}

	private setupCardDrag(cardEl: HTMLElement, card: KanbanCard) {
		cardEl.addEventListener('dragstart', (e) => {
			e.dataTransfer?.setData('text/card-id', card.id);
			cardEl.addClass('kanban-card-dragging');
		});

		cardEl.addEventListener('dragend', () => {
			cardEl.removeClass('kanban-card-dragging');
		});
	}

	private calculateProgress(): number {
		if (!this.currentBoard) return 0;
		
		const allCards = this.currentBoard.cards;
		if (allCards.length === 0) return 0;

		const completedCards = allCards.filter(card => 
			card.status === 'completed'
		);
		
		return (completedCards.length / allCards.length) * 100;
	}

	private async moveCard(cardId: string, targetColumnId: string) {
		if (!this.currentBoard) return;

		try {
			const success = this.plugin.projectKanbanService.moveCard(
				this.currentBoard.id,
				cardId,
				targetColumnId
			);
			
			if (success) {
				// Reload the board from the service
				const updatedBoard = this.plugin.projectKanbanService.getBoard(this.currentBoard.id);
				if (updatedBoard) {
					this.currentBoard = updatedBoard;
					this.renderBoard();
				}
			}
			
		} catch (error) {
			console.error('Failed to move card:', error);
		}
	}

	private async addNewCard(column: KanbanColumn) {
		// Simple inline card creation
		const cardTitle = await this.promptForCardTitle();
		if (!cardTitle || !this.currentBoard) return;

		try {
			const newCard = this.plugin.projectKanbanService.addCard(
				this.currentBoard.id,
				cardTitle,
				'', // description
				column.id
			);
			
			if (newCard) {
				// Reload the board from the service
				const updatedBoard = this.plugin.projectKanbanService.getBoard(this.currentBoard.id);
				if (updatedBoard) {
					this.currentBoard = updatedBoard;
					this.renderBoard();
				}
			}
			
		} catch (error) {
			console.error('Failed to add card:', error);
		}
	}

	private async promptForCardTitle(): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = document.createElement('div');
			modal.className = 'modal mod-dim';
			modal.innerHTML = `
				<div class="modal-container mod-confirmation">
					<div class="modal-header">
						<div class="modal-title">Add New Card</div>
					</div>
					<div class="modal-content">
						<input type="text" placeholder="Enter card title..." class="card-title-input" style="width: 100%; padding: 8px; margin-bottom: 16px;">
					</div>
					<div class="modal-button-container">
						<button class="mod-cta">Add Card</button>
						<button class="mod-cancel">Cancel</button>
					</div>
				</div>
			`;

			document.body.appendChild(modal);
			const input = modal.querySelector('.card-title-input') as HTMLInputElement;
			const addBtn = modal.querySelector('.mod-cta') as HTMLButtonElement;
			const cancelBtn = modal.querySelector('.mod-cancel') as HTMLButtonElement;

			input.focus();

			const cleanup = () => {
				document.body.removeChild(modal);
			};

			addBtn.addEventListener('click', () => {
				cleanup();
				resolve(input.value.trim() || null);
			});

			cancelBtn.addEventListener('click', () => {
				cleanup();
				resolve(null);
			});

			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					cleanup();
					resolve(input.value.trim() || null);
				} else if (e.key === 'Escape') {
					cleanup();
					resolve(null);
				}
			});
		});
	}

	private async editCard(card: KanbanCard) {
		// TODO: Open detailed card editor modal
		console.log('Edit card:', card.title);
	}

	private async linkCardToNote(card: KanbanCard) {
		// TODO: Link card to an Obsidian note
		console.log('Link card to note:', card.title);
	}

	async onClose() {
		// Save current board state
		// TODO: Implement board persistence
	}
}