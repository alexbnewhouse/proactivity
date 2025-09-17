/**
 * ADHD-Friendly Card Edit Modal
 * 
 * Philosophy:
 * - Clean, focused interface that doesn't overwhelm
 * - Progressive disclosure - advanced options hidden until needed  
 * - Smart defaults and helpful suggestions
 * - Visual feedback for energy levels and time estimates
 */

import { Modal, Setting, TextAreaComponent, DropdownComponent } from 'obsidian';
import { KanbanCard, EnergyLevel, TimeEstimate } from './kanban-service';
import { MicroTask } from './task-service';
import DissertationSupportPlugin from '../main';

export class CardEditModal extends Modal {
	private card: KanbanCard;
	private onSave: (card: KanbanCard) => void;
	private plugin: DissertationSupportPlugin;
	
	// Form elements
	private titleInput: HTMLInputElement;
	private descriptionArea: TextAreaComponent;
	private energySelect: DropdownComponent;
	private prioritySelect: DropdownComponent;
	private tagsInput: HTMLInputElement;
	private focusNotesArea: TextAreaComponent;
	
	// Time estimate inputs
	private optimisticInput: HTMLInputElement;
	private realisticInput: HTMLInputElement;
	private pessimisticInput: HTMLInputElement;
	
	// Subtask management
	private subtaskContainer: HTMLElement;
	private subtasks: MicroTask[] = [];

	constructor(
		plugin: DissertationSupportPlugin,
		card: KanbanCard,
		onSave: (card: KanbanCard) => void
	) {
		super(plugin.app);
		this.plugin = plugin;
		this.card = { ...card }; // Work with copy
		this.subtasks = [...card.subtasks]; // Copy subtasks
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass('card-edit-modal');
		
		contentEl.createEl('h2', { text: 'Edit Task Card' });
		
		// Basic Information Section
		this.createBasicInfoSection();
		
		// ADHD-Optimized Metadata
		this.createADHDMetadataSection();
		
		// Time Estimation
		this.createTimeEstimationSection();
		
		// Subtasks Management
		this.createSubtasksSection();
		
		// Context & Notes
		this.createContextSection();
		
		// Action Buttons
		this.createActionButtons();
		
		// Focus on title input
		setTimeout(() => this.titleInput?.focus(), 100);
	}

	private createBasicInfoSection() {
		const section = this.contentEl.createDiv('card-edit-section');
		section.createEl('h3', { text: 'Basic Information' });
		
		// Title
		new Setting(section)
			.setName('Task Title')
			.setDesc('Clear, action-oriented description')
			.addText(text => {
				this.titleInput = text.inputEl;
				text.setValue(this.card.title)
					.onChange(value => {
						this.card.title = value;
					});
			});
		
		// Description
		new Setting(section)
			.setName('Description')
			.setDesc('Additional context and requirements')
			.addTextArea(text => {
				this.descriptionArea = text;
				text.setValue(this.card.description)
					.onChange(value => {
						this.card.description = value;
					});
				text.inputEl.style.minHeight = '80px';
			});
		
		// Tags
		new Setting(section)
			.setName('Tags')
			.setDesc('Comma-separated tags for organization')
			.addText(text => {
				this.tagsInput = text.inputEl;
				text.setValue(this.card.tags.join(', '))
					.onChange(value => {
						this.card.tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
					});
			});
	}

	private createADHDMetadataSection() {
		const section = this.contentEl.createDiv('card-edit-section');
		section.createEl('h3', { text: 'ADHD-Friendly Settings' });
		
		// Energy Level
		new Setting(section)
			.setName('Energy Level Required')
			.setDesc('Match this task to your current energy')
			.addDropdown(dropdown => {
				this.energySelect = dropdown;
				dropdown
					.addOption('low', '🔋 Low - Light, routine tasks')
					.addOption('medium', '🔋🔋 Medium - Standard work tasks')
					.addOption('high', '🔋🔋🔋 High - Complex, creative work')
					.setValue(this.card.energyLevel)
					.onChange(value => {
						this.card.energyLevel = value as EnergyLevel;
						this.updateTimeEstimates();
					});
			});
		
		// Priority
		new Setting(section)
			.setName('Priority')
			.setDesc('How urgent is this task?')
			.addDropdown(dropdown => {
				this.prioritySelect = dropdown;
				dropdown
					.addOption('low', '🟢 Low - Nice to have')
					.addOption('medium', '🟡 Medium - Important')
					.addOption('high', '🟠 High - Urgent')
					.addOption('urgent', '🔴 Urgent - Drop everything')
					.setValue(this.card.priority)
					.onChange(value => {
						this.card.priority = value as any;
					});
			});
	}

	private createTimeEstimationSection() {
		const section = this.contentEl.createDiv('card-edit-section');
		const header = section.createDiv('section-header-with-help');
		header.createEl('h3', { text: 'Time Estimation' });
		
		const helpIcon = header.createSpan('help-icon');
		helpIcon.textContent = '💡';
		helpIcon.title = 'ADHD Tip: Always add buffer time! Things usually take longer than expected.';
		
		section.createEl('p', { 
			text: 'Three-point estimation helps account for uncertainty and ADHD time blindness.',
			cls: 'setting-description'
		});
		
		// Create time estimation grid
		const timeGrid = section.createDiv('time-estimation-grid');
		
		this.createTimeInput(timeGrid, 'Optimistic', 'Best case scenario', 
			this.card.timeEstimate.optimistic, (value) => {
				this.card.timeEstimate.optimistic = value;
				this.updatePomodoroEstimate();
			});
			
		this.createTimeInput(timeGrid, 'Realistic', 'Most likely duration', 
			this.card.timeEstimate.realistic, (value) => {
				this.card.timeEstimate.realistic = value;
				this.updatePomodoroEstimate();
			});
			
		this.createTimeInput(timeGrid, 'Pessimistic', 'If everything goes wrong', 
			this.card.timeEstimate.pessimistic, (value) => {
				this.card.timeEstimate.pessimistic = value;
				this.updatePomodoroEstimate();
			});
		
		// Pomodoro estimate display
		const pomodoroDisplay = section.createDiv('pomodoro-estimate');
		pomodoroDisplay.createEl('span', { text: '🍅 Estimated Pomodoros: ' });
		const pomodoroValue = pomodoroDisplay.createEl('strong');
		pomodoroValue.textContent = Math.ceil(this.card.timeEstimate.realistic / 25).toString();
		pomodoroValue.id = 'pomodoro-count';
	}

	private createTimeInput(
		container: HTMLElement, 
		label: string, 
		description: string, 
		value: number,
		onChange: (value: number) => void
	) {
		const timeField = container.createDiv('time-field');
		timeField.createEl('label', { text: label });
		timeField.createEl('div', { text: description, cls: 'time-field-desc' });
		
		const input = timeField.createEl('input', {
			type: 'number',
			value: value.toString()
		});
		input.addEventListener('change', () => {
			onChange(parseInt(input.value) || 0);
		});
		
		timeField.createEl('span', { text: 'minutes', cls: 'time-unit' });
	}

	private createSubtasksSection() {
		const section = this.contentEl.createDiv('card-edit-section');
		const header = section.createDiv('section-header-with-action');
		header.createEl('h3', { text: 'Subtasks (5-25 minute chunks)' });
		
		const addBtn = header.createEl('button', {
			text: '+ Add Subtask',
			cls: 'card-edit-btn-small'
		});
		
		addBtn.addEventListener('click', () => this.addSubtask());
		
		this.subtaskContainer = section.createDiv('subtasks-container');
		this.renderSubtasks();
	}

	private createContextSection() {
		const section = this.contentEl.createDiv('card-edit-section');
		section.createEl('h3', { text: 'Context & Notes' });
		
		new Setting(section)
			.setName('Focus Notes')
			.setDesc('What should you remember when working on this? Key insights, blockers, next steps...')
			.addTextArea(text => {
				this.focusNotesArea = text;
				text.setValue(this.card.focusNotes || '')
					.onChange(value => {
						this.card.focusNotes = value;
					});
				text.inputEl.style.minHeight = '60px';
			});
	}

	private createActionButtons() {
		const buttonContainer = this.contentEl.createDiv('card-edit-actions');
		
		const saveBtn = buttonContainer.createEl('button', {
			text: 'Save Changes',
			cls: 'card-edit-btn card-edit-btn-primary'
		});
		
		const cancelBtn = buttonContainer.createEl('button', {
			text: 'Cancel',
			cls: 'card-edit-btn card-edit-btn-secondary'
		});
		
		saveBtn.addEventListener('click', () => this.save());
		cancelBtn.addEventListener('click', () => this.close());
	}

	private addSubtask() {
		const newSubtask: MicroTask = {
			id: `subtask-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			text: '',
			status: 'todo',
			order: this.subtasks.length,
			created: Date.now(),
			updated: Date.now()
		};
		
		this.subtasks.push(newSubtask);
		this.renderSubtasks();
	}

	private renderSubtasks() {
		this.subtaskContainer.empty();
		
		this.subtasks.forEach((subtask, index) => {
			const subtaskEl = this.subtaskContainer.createDiv('subtask-item');
			
			// Drag handle
			subtaskEl.createDiv('subtask-drag-handle').textContent = '⋮⋮';
			
			// Checkbox
			const checkbox = subtaskEl.createEl('input', { type: 'checkbox' });
			checkbox.checked = subtask.status === 'done';
			checkbox.addEventListener('change', () => {
				subtask.status = checkbox.checked ? 'done' : 'todo';
				subtask.updated = Date.now();
			});
			
			// Title input
			const titleInput = subtaskEl.createEl('input', {
				type: 'text',
				value: subtask.text,
				placeholder: 'Quick task (5-25 minutes)...'
			});
			titleInput.addEventListener('input', () => {
				subtask.text = titleInput.value;
				subtask.updated = Date.now();
			});
			
			// Time display (simplified since MicroTask doesn't have time estimates)
			const timeDisplay = subtaskEl.createEl('span', { 
				text: '~15min',
				cls: 'subtask-time-estimate'
			});
			
			// Delete button
			const deleteBtn = subtaskEl.createEl('button', {
				text: '🗑️',
				cls: 'subtask-delete'
			});
			deleteBtn.addEventListener('click', () => {
				this.subtasks.splice(index, 1);
				this.renderSubtasks();
			});
		});
		
		if (this.subtasks.length === 0) {
			const emptyState = this.subtaskContainer.createDiv('subtasks-empty');
			emptyState.textContent = 'Break this task into smaller 5-25 minute chunks for better focus.';
		}
	}

	private updateTimeEstimates() {
		// Auto-adjust time estimates based on energy level
		const energyMultiplier = {
			'low': 1.5,    // Takes longer when tired
			'medium': 1.0, // Standard estimates
			'high': 0.8    // Faster when energized
		};
		
		const multiplier = energyMultiplier[this.card.energyLevel];
		// Could implement smart time adjustment here
	}

	private updatePomodoroEstimate() {
		const pomodoroCount = Math.ceil(this.card.timeEstimate.realistic / 25);
		const pomodoroEl = this.contentEl.querySelector('#pomodoro-count');
		if (pomodoroEl) {
			pomodoroEl.textContent = pomodoroCount.toString();
		}
	}

	private save() {
		// Update subtasks in card
		this.card.subtasks = this.subtasks;
		this.card.updated = Date.now();
		
		// Calculate completion percentage based on subtasks
		const completedSubtasks = this.subtasks.filter(st => st.status === 'done').length;
		if (this.subtasks.length > 0) {
			this.card.completionPercentage = Math.round((completedSubtasks / this.subtasks.length) * 100);
		}
		
		// Update estimated pomodoros
		this.card.estimatedPomodoros = Math.ceil(this.card.timeEstimate.realistic / 25);
		
		this.onSave(this.card);
		this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}