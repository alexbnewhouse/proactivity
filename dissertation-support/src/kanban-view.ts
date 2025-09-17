import { ItemView, WorkspaceLeaf, TFile, Notice, App, Modal } from 'obsidian';
import { KanbanBoard, KanbanCard, KanbanColumn } from './kanban-service';
import { CardEditModal } from './card-edit-modal';
import DissertationSupportPlugin from '../main';

export const KANBAN_VIEW_TYPE = "kanban-view";

export class KanbanView extends ItemView {
	plugin: DissertationSupportPlugin;
	public currentBoard: KanbanBoard | null = null;
	private boardSelector: HTMLSelectElement | null = null;

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
		this.boardSelector = toolbar.createEl('select', { cls: 'kanban-board-select' });
		this.populateBoardSelector(this.boardSelector);
		
		this.boardSelector.addEventListener('change', () => {
			const selectedBoardId = this.boardSelector!.value;
			if (selectedBoardId) {
				this.loadBoard(selectedBoardId);
			}
		});
		
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

		settingsBtn.addEventListener('click', () => {
			this.showBoardSettings();
		});

		// Board container
		const boardContainer = container.createDiv('kanban-board');
		
		// Load saved board or show empty state
		await this.loadSavedBoard();
		
		if (!this.currentBoard) {
			this.showEmptyState(boardContainer);
		}

		// Add keyboard navigation
		this.setupKeyboardHandlers();
	}

	private setupKeyboardHandlers() {
		// Handle keyboard events for the entire view
		this.containerEl.addEventListener('keydown', (e) => {
			// Only handle if the view is focused and no input is active
			if (document.activeElement?.tagName === 'INPUT' || 
				document.activeElement?.tagName === 'TEXTAREA' ||
				document.activeElement?.tagName === 'SELECT') {
				return;
			}

			switch (e.key) {
				case 'n':
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();
						this.showQuickAddCard();
					}
					break;
				case 'r':
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();
						this.renderBoard();
					}
					break;
				case 'f':
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();
						this.focusSearch();
					}
					break;
				case 'Escape':
					this.clearSelection();
					break;
			}
		});

		// Make the container focusable
		this.containerEl.setAttribute('tabindex', '0');
	}

	private populateBoardSelector(selectElement: HTMLSelectElement) {
		selectElement.empty();
		selectElement.createEl('option', { text: 'Select a project...', value: '' });
		
		const allBoards = this.plugin.projectKanbanService.getAllBoards();
		allBoards.forEach(board => {
			const option = selectElement.createEl('option', { 
				text: board.title, 
				value: board.id 
			});
			if (this.currentBoard && board.id === this.currentBoard.id) {
				option.selected = true;
			}
		});
	}

	private async loadBoard(boardId: string) {
		const board = this.plugin.projectKanbanService.getBoard(boardId);
		if (board) {
			this.currentBoard = board;
			this.renderBoard();
			// Save as last opened board
			this.plugin.settings.lastOpenedBoardId = boardId;
			await this.plugin.saveSettings();
		}
	}

	private async loadSavedBoard() {
		// Try to load the last opened board
		const lastBoardId = this.plugin.settings.lastOpenedBoardId;
		if (lastBoardId) {
			const board = this.plugin.projectKanbanService.getBoard(lastBoardId);
			if (board) {
				this.currentBoard = board;
				return;
			}
		}

		// Fallback: load the most recently created board
		const allBoards = this.plugin.projectKanbanService.getAllBoards();
		if (allBoards.length > 0) {
			// Sort by creation time and take the most recent
			const mostRecent = allBoards.sort((a, b) => b.created - a.created)[0];
			this.currentBoard = mostRecent;
			
			// Update saved preference
			this.plugin.settings.lastOpenedBoardId = mostRecent.id;
			await this.plugin.saveSettings();
		}
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
			
			// Update board selector
			this.refreshBoardSelector();
			
			// Save as last opened board
			this.plugin.settings.lastOpenedBoardId = demoBoard.id;
			await this.plugin.saveSettings();
		}
	}

	public refreshBoardSelector() {
		if (this.boardSelector) {
			this.populateBoardSelector(this.boardSelector);
		}
	}

	private showQuickAddCard() {
		if (!this.currentBoard) return;
		
		// Create a floating input for quick card creation
		const quickInput = document.createElement('div');
		quickInput.className = 'kanban-quick-add-overlay';
		quickInput.innerHTML = `
			<div class="kanban-quick-add-modal">
				<h3>Quick Add Card</h3>
				<input type="text" placeholder="Enter card title and press Enter..." class="kanban-quick-input" />
				<div class="kanban-quick-columns">
					${this.currentBoard.columns.map(col => 
						`<button class="kanban-quick-column" data-column-id="${col.id}">${col.title}</button>`
					).join('')}
				</div>
				<div class="kanban-quick-help">
					<kbd>Enter</kbd> to add • <kbd>Escape</kbd> to cancel
				</div>
			</div>
		`;
		
		document.body.appendChild(quickInput);
		
		const input = quickInput.querySelector('.kanban-quick-input') as HTMLInputElement;
		const columns = quickInput.querySelectorAll('.kanban-quick-column');
		let selectedColumnId = this.currentBoard.columns[0]?.id || '';
		
		// Highlight first column by default
		if (columns.length > 0) {
			columns[0].classList.add('selected');
		}
		
		// Handle column selection
		columns.forEach(btn => {
			btn.addEventListener('click', () => {
				columns.forEach(c => c.classList.remove('selected'));
				btn.classList.add('selected');
				selectedColumnId = btn.getAttribute('data-column-id') || '';
				input.focus();
			});
		});
		
		// Handle input
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && input.value.trim()) {
				this.createQuickCard(input.value.trim(), selectedColumnId);
				document.body.removeChild(quickInput);
			} else if (e.key === 'Escape') {
				document.body.removeChild(quickInput);
			}
		});
		
		// Handle click outside to close
		quickInput.addEventListener('click', (e) => {
			if (e.target === quickInput) {
				document.body.removeChild(quickInput);
			}
		});
		
		// Focus input
		setTimeout(() => input.focus(), 100);
	}

	private async createQuickCard(title: string, columnId: string) {
		if (!this.currentBoard) return;
		
		const newCard = this.plugin.projectKanbanService.createQuickCard(
			this.currentBoard.id,
			columnId,
			title,
			''
		);
		
		if (newCard) {
			// Reload the board from the service
			const updatedBoard = this.plugin.projectKanbanService.getBoard(this.currentBoard.id);
			if (updatedBoard) {
				this.currentBoard = updatedBoard;
				this.renderBoard();
			}
		}
	}

	private focusSearch() {
		// Focus the board selector for now - in the future could add a search box
		if (this.boardSelector) {
			this.boardSelector.focus();
		}
	}

	private clearSelection() {
		// Clear any selected cards or active states
		const selectedCards = this.containerEl.querySelectorAll('.kanban-card.selected');
		selectedCards.forEach(card => card.removeClass('selected'));
		
		// Focus the main container
		this.containerEl.focus();
	}

	public renderBoard() {
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
		}).addEventListener('click', (e) => {
			e.stopPropagation();
			console.log('Edit button clicked for card:', card.title);
			this.editCard(card);
		});

		actions.createEl('button', { 
			text: '🔗',
			cls: 'kanban-card-action',
			attr: { title: 'Link to note' }
		}).addEventListener('click', (e) => {
			e.stopPropagation();
			console.log('Link button clicked for card:', card.title);
			this.linkCardToNote(card);
		});

		// Complete button (only show if not already completed)
		if (card.status !== 'completed') {
			actions.createEl('button', { 
				text: '✅',
				cls: 'kanban-card-action',
				attr: { title: 'Mark complete' }
			}).addEventListener('click', (e) => {
				e.stopPropagation();
				console.log('Complete button clicked for card:', card.title);
				this.completeCard(card);
			});
		}

		// Delete button
		actions.createEl('button', { 
			text: '🗑️',
			cls: 'kanban-card-action kanban-card-action-danger',
			attr: { title: 'Delete card' }
		}).addEventListener('click', (e) => {
			e.stopPropagation();
			console.log('Delete button clicked for card:', card.title);
			this.deleteCard(card);
		});

		// Drag & drop handlers
		this.setupCardDrag(cardEl, card);
		
		// Right-click context menu
		cardEl.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			this.showCardContextMenu(e, card);
		});
	}

	private showCardContextMenu(e: MouseEvent, card: KanbanCard) {
		const menu = document.createElement('div');
		menu.className = 'kanban-context-menu';
		menu.innerHTML = `
			<div class="kanban-context-item" data-action="edit">✏️ Edit Card</div>
			<div class="kanban-context-item" data-action="duplicate">📋 Duplicate</div>
			<div class="kanban-context-item" data-action="link">🔗 Link to Note</div>
			<div class="kanban-context-divider"></div>
			<div class="kanban-context-item kanban-context-danger" data-action="delete">🗑️ Delete</div>
		`;
		
		// Position menu at mouse
		menu.style.position = 'fixed';
		menu.style.left = e.clientX + 'px';
		menu.style.top = e.clientY + 'px';
		menu.style.zIndex = '10000';
		
		document.body.appendChild(menu);
		
		// Handle menu actions
		menu.addEventListener('click', async (menuEvent) => {
			const target = menuEvent.target as HTMLElement;
			const action = target.getAttribute('data-action');
			
			switch (action) {
				case 'edit':
					this.editCard(card);
					break;
				case 'duplicate':
					await this.duplicateCard(card);
					break;
				case 'link':
					this.linkCardToNote(card);
					break;
				case 'delete':
					await this.deleteCard(card);
					break;
			}
			
			document.body.removeChild(menu);
		});
		
		// Close menu on click outside
		const closeMenu = (event: Event) => {
			if (!menu.contains(event.target as Node)) {
				if (document.body.contains(menu)) {
					document.body.removeChild(menu);
				}
				document.removeEventListener('click', closeMenu);
			}
		};
		
		setTimeout(() => {
			document.addEventListener('click', closeMenu);
		}, 100);
	}

	private async duplicateCard(card: KanbanCard) {
		if (!this.currentBoard) return;
		
		const duplicateCard = this.plugin.projectKanbanService.createQuickCard(
			this.currentBoard.id,
			card.columnId,
			`${card.title} (Copy)`,
			card.description
		);
		
		if (duplicateCard) {
			// Copy additional properties
			duplicateCard.energyLevel = card.energyLevel;
			duplicateCard.priority = card.priority;
			duplicateCard.tags = [...card.tags];
			duplicateCard.timeEstimate = { ...card.timeEstimate };
			
			// Reload and render
			const updatedBoard = this.plugin.projectKanbanService.getBoard(this.currentBoard.id);
			if (updatedBoard) {
				this.currentBoard = updatedBoard;
				this.renderBoard();
			}
		}
	}

	private async deleteCard(card: KanbanCard) {
		if (!this.currentBoard) return;
		
		// Simple confirmation
		const confirmed = confirm(`Delete "${card.title}"?\n\nThis action cannot be undone.`);
		if (!confirmed) return;
		
		// Remove card from board
		const cardIndex = this.currentBoard.cards.findIndex(c => c.id === card.id);
		if (cardIndex !== -1) {
			this.currentBoard.cards.splice(cardIndex, 1);
			this.plugin.projectKanbanService.saveBoard(this.currentBoard);
			this.renderBoard();
		}
	}

	private async completeCard(card: KanbanCard) {
		if (!this.currentBoard) return;
		
		// Find the card and update its status
		const cardIndex = this.currentBoard.cards.findIndex(c => c.id === card.id);
		if (cardIndex !== -1) {
			this.currentBoard.cards[cardIndex].status = 'completed';
			this.currentBoard.cards[cardIndex].completed = Date.now();
			
			// Move to completed column if it exists
			const completedColumn = this.currentBoard.columns.find(
				col => col.title.toLowerCase().includes('complete') || 
				       col.title.toLowerCase().includes('done')
			);
			
			if (completedColumn) {
				this.currentBoard.cards[cardIndex].columnId = completedColumn.id;
			}
			
			// Save and re-render
			this.plugin.projectKanbanService.saveBoard(this.currentBoard);
			this.renderBoard();
		}
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
		if (!this.currentBoard) return;

		try {
			const newCard = this.plugin.projectKanbanService.createQuickCard(
				this.currentBoard.id,
				column.id,
				'New Task',
				'Click to edit this task...'
			);
			
			if (newCard) {
				// Reload the board from the service
				const updatedBoard = this.plugin.projectKanbanService.getBoard(this.currentBoard.id);
				if (updatedBoard) {
					this.currentBoard = updatedBoard;
					this.renderBoard();
					
					// Immediately open edit modal for new card
					setTimeout(() => {
						this.editCard(newCard);
					}, 100);
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
		const modal = new CardEditModal(this.plugin, card, (updatedCard) => {
			// Update card in current board
			if (this.currentBoard) {
				const cardIndex = this.currentBoard.cards.findIndex(c => c.id === card.id);
				if (cardIndex !== -1) {
					this.currentBoard.cards[cardIndex] = updatedCard;
					this.plugin.projectKanbanService.saveBoard(this.currentBoard);
					this.renderBoard(); // Re-render to show changes
				}
			}
		});
		modal.open();
	}

	private async linkCardToNote(card: KanbanCard) {
		// Create a new note for this card or link to existing
		const noteName = card.title.replace(/[^\w\s-]/g, '').trim();
		const fileName = `${noteName}.md`;
		
		try {
			// Check if note already exists
			const existingNote = this.app.vault.getAbstractFileByPath(fileName);
			
			if (existingNote) {
				// Open existing note
				await this.app.workspace.getLeaf().openFile(existingNote as TFile);
			} else {
				// Create new note with card content
				const noteContent = `# ${card.title}

${card.description}

## Task Details
- **Energy Level**: ${card.energyLevel || 'Not set'}
- **Priority**: ${card.priority || 'medium'}
- **Time Estimate**: ${card.timeEstimate?.realistic || 0} minutes
- **Status**: ${card.status}

## Subtasks
${card.subtasks.map(st => `- [${st.status === 'done' ? 'x' : ' '}] ${st.text}`).join('\n')}

## Notes
${card.focusNotes || ''}

---
*Generated from Kanban card*`;
				
				const newFile = await this.app.vault.create(fileName, noteContent);
				await this.app.workspace.getLeaf().openFile(newFile);
			}
		} catch (error) {
			console.error('Error linking card to note:', error);
			// Show user-friendly error
			new Notice('Could not create or open note. Please check your vault permissions.');
		}
	}

	private showBoardSettings() {
		if (!this.currentBoard) {
			new Notice('No board selected');
			return;
		}

		// Create a simple modal for board settings
		const modal = new BoardSettingsModal(this.app, this.currentBoard, (action, data) => {
			if (action === 'rename' && data) {
				this.currentBoard!.title = data.name;
				this.plugin.projectKanbanService.saveBoard(this.currentBoard!);
				this.populateBoardSelector(this.boardSelector!);
				this.renderBoard();
				new Notice(`Board renamed to "${data.name}"`);
			} else if (action === 'delete') {
				this.deleteCurrentBoard();
			}
		});
		modal.open();
	}

	private async deleteCurrentBoard() {
		if (!this.currentBoard) return;

		const boardName = this.currentBoard.title;
		
		// Confirm deletion
		const confirmed = await this.showConfirmDialog(
			'Delete Board',
			`Are you sure you want to delete "${boardName}"? This action cannot be undone.`
		);

		if (confirmed) {
			this.plugin.projectKanbanService.deleteBoard(this.currentBoard.id);
			this.currentBoard = null;
			this.populateBoardSelector(this.boardSelector!);
			
			// Show empty state
			const boardContainer = this.containerEl.querySelector('.kanban-board') as HTMLElement;
			if (boardContainer) {
				this.showEmptyState(boardContainer);
			}
			
			new Notice(`Board "${boardName}" deleted`);
		}
	}

	private showConfirmDialog(title: string, message: string): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new ConfirmModal(this.app, title, message, resolve);
			modal.open();
		});
	}

	async onClose() {
		// Save current board state
		// TODO: Implement board persistence
	}
}

// Simple modal classes for board management
class BoardSettingsModal extends Modal {
	board: KanbanBoard;
	callback: (action: string, data?: any) => void;

	constructor(app: App, board: KanbanBoard, callback: (action: string, data?: any) => void) {
		super(app);
		this.board = board;
		this.callback = callback;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('board-settings-modal');

		contentEl.createEl('h2', { text: 'Board Settings' });

		// Rename section
		const renameSection = contentEl.createDiv('setting-section');
		renameSection.createEl('h3', { text: 'Rename Board' });
		
		const inputContainer = renameSection.createDiv('input-container');
		const nameInput = inputContainer.createEl('input', { 
			type: 'text',
			value: this.board.title,
			placeholder: 'Board name'
		});

		const renameBtn = inputContainer.createEl('button', {
			text: 'Rename',
			cls: 'mod-cta'
		});

		renameBtn.onclick = () => {
			const newName = nameInput.value.trim();
			if (newName && newName !== this.board.title) {
				this.callback('rename', { name: newName });
				this.close();
			}
		};

		// Delete section
		const deleteSection = contentEl.createDiv('setting-section danger-section');
		deleteSection.createEl('h3', { text: 'Danger Zone' });
		deleteSection.createEl('p', { 
			text: 'Deleting a board is permanent and cannot be undone.',
			cls: 'setting-description'
		});

		const deleteBtn = deleteSection.createEl('button', {
			text: 'Delete Board',
			cls: 'mod-warning'
		});

		deleteBtn.onclick = () => {
			this.callback('delete');
			this.close();
		};

		// Handle Enter key on input
		nameInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				renameBtn.click();
			}
		});

		// Focus input
		nameInput.focus();
		nameInput.select();
	}
}

class ConfirmModal extends Modal {
	title: string;
	message: string;
	callback: (confirmed: boolean) => void;

	constructor(app: App, title: string, message: string, callback: (confirmed: boolean) => void) {
		super(app);
		this.title = title;
		this.message = message;
		this.callback = callback;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('confirm-modal');

		contentEl.createEl('h2', { text: this.title });
		contentEl.createEl('p', { text: this.message });

		const buttonContainer = contentEl.createDiv('modal-button-container');
		
		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel'
		});

		const confirmBtn = buttonContainer.createEl('button', {
			text: 'Confirm',
			cls: 'mod-warning'
		});

		cancelBtn.onclick = () => {
			this.callback(false);
			this.close();
		};

		confirmBtn.onclick = () => {
			this.callback(true);
			this.close();
		};

		// Handle Escape key
		this.contentEl.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				cancelBtn.click();
			}
		});
	}
}