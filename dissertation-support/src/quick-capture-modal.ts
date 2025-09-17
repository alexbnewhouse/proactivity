/**
 * Quick Capture Modal - ADHD-Friendly Thought Capture
 * 
 * Purpose: Instantly capture fleeting thoughts/tasks without losing focus
 * Design: Minimal UI, instant save, smart categorization
 */

import { Modal, App, Setting, Notice, TFile } from 'obsidian';
import DissertationSupportPlugin from '../main';

export interface QuickCaptureItem {
    text: string;
    type: 'task' | 'idea' | 'reference' | 'question' | 'note';
    priority: 'low' | 'medium' | 'high';
    projectId?: string;
    timestamp: number;
}

export class QuickCaptureModal extends Modal {
    private plugin: DissertationSupportPlugin;
    private inputEl: HTMLInputElement;
    private typeButtons: HTMLElement[] = [];
    private selectedType: QuickCaptureItem['type'] = 'task';
    private selectedPriority: QuickCaptureItem['priority'] = 'medium';

    constructor(app: App, plugin: DissertationSupportPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('ds-quick-capture');

        // Title
        contentEl.createEl('h3', { 
            text: '⚡ Quick Capture',
            cls: 'ds-quick-capture-title'
        });

        // Input field (auto-focused)
        this.inputEl = contentEl.createEl('input', {
            type: 'text',
            placeholder: 'What\'s on your mind? (Type and press Enter)',
            cls: 'ds-quick-capture-input'
        });

        // Type selection buttons
        const typeContainer = contentEl.createDiv('ds-capture-types');
        typeContainer.createEl('div', { text: 'Type:', cls: 'ds-capture-label' });
        
        const types = [
            { key: 'task', label: '✅ Task', desc: 'Something to do' },
            { key: 'idea', label: '💡 Idea', desc: 'Creative thought' },
            { key: 'reference', label: '📚 Reference', desc: 'Source to check' },
            { key: 'question', label: '❓ Question', desc: 'Something to explore' },
            { key: 'note', label: '📝 Note', desc: 'General capture' }
        ];

        const typeButtons = typeContainer.createDiv('ds-capture-type-buttons');
        types.forEach((type, index) => {
            const btn = typeButtons.createEl('button', {
                text: type.label,
                cls: type.key === this.selectedType ? 'ds-capture-type-btn active' : 'ds-capture-type-btn',
                attr: { title: type.desc }
            });
            
            btn.addEventListener('click', () => this.selectType(type.key as QuickCaptureItem['type']));
            this.typeButtons.push(btn);

            // Keyboard shortcuts for types (1-5)
            if (index < 5) {
                btn.setAttribute('data-key', (index + 1).toString());
            }
        });

        // Priority selection
        const priorityContainer = contentEl.createDiv('ds-capture-priority');
        priorityContainer.createEl('div', { text: 'Priority:', cls: 'ds-capture-label' });
        
        const priorityButtons = priorityContainer.createDiv('ds-capture-priority-buttons');
        ['low', 'medium', 'high'].forEach(priority => {
            const btn = priorityButtons.createEl('button', {
                text: priority === 'low' ? '🟢 Low' : priority === 'medium' ? '🟡 Med' : '🔴 High',
                cls: priority === this.selectedPriority ? 'ds-capture-priority-btn active' : 'ds-capture-priority-btn'
            });
            
            btn.addEventListener('click', () => this.selectPriority(priority as QuickCaptureItem['priority']));
        });

        // Action buttons
        const actions = contentEl.createDiv('ds-capture-actions');
        
        const saveBtn = actions.createEl('button', {
            text: '💾 Save (Enter)',
            cls: 'ds-capture-save-btn'
        });
        saveBtn.addEventListener('click', () => this.saveAndClose());

        const cancelBtn = actions.createEl('button', {
            text: '❌ Cancel (Esc)',
            cls: 'ds-capture-cancel-btn'
        });
        cancelBtn.addEventListener('click', () => this.close());

        // Set up keyboard handlers
        this.setupKeyboardHandlers();

        // Auto-focus input
        setTimeout(() => this.inputEl.focus(), 50);
    }

    private selectType(type: QuickCaptureItem['type']) {
        this.selectedType = type;
        this.typeButtons.forEach((btn, index) => {
            const types = ['task', 'idea', 'reference', 'question', 'note'];
            btn.className = types[index] === type ? 'ds-capture-type-btn active' : 'ds-capture-type-btn';
        });
    }

    private selectPriority(priority: QuickCaptureItem['priority']) {
        this.selectedPriority = priority;
        const priorityBtns = this.contentEl.querySelectorAll('.ds-capture-priority-btn');
        priorityBtns.forEach((btn, index) => {
            const priorities = ['low', 'medium', 'high'];
            btn.className = priorities[index] === priority ? 'ds-capture-priority-btn active' : 'ds-capture-priority-btn';
        });
    }

    private setupKeyboardHandlers() {
        // Enter to save
        this.inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.saveAndClose();
            }
        });

        // Global key handlers
        this.contentEl.addEventListener('keydown', (e) => {
            // Number keys for type selection
            if (e.key >= '1' && e.key <= '5') {
                e.preventDefault();
                const typeIndex = parseInt(e.key) - 1;
                const types: QuickCaptureItem['type'][] = ['task', 'idea', 'reference', 'question', 'note'];
                this.selectType(types[typeIndex]);
            }
            
            // Escape to cancel
            if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
            }

            // Ctrl/Cmd + L/M/H for priority
            if ((e.ctrlKey || e.metaKey)) {
                if (e.key === 'l') {
                    e.preventDefault();
                    this.selectPriority('low');
                } else if (e.key === 'm') {
                    e.preventDefault();
                    this.selectPriority('medium');
                } else if (e.key === 'h') {
                    e.preventDefault();
                    this.selectPriority('high');
                }
            }
        });
    }

    private async saveAndClose() {
        const text = this.inputEl.value.trim();
        if (!text) {
            new Notice('Please enter some text to capture');
            this.inputEl.focus();
            return;
        }

        const item: QuickCaptureItem = {
            text,
            type: this.selectedType,
            priority: this.selectedPriority,
            timestamp: Date.now()
        };

        try {
            await this.processCapture(item);
            new Notice(`✅ Captured ${this.selectedType}: "${text}"`);
            this.close();
        } catch (error) {
            console.error('Quick Capture failed:', error);
            new Notice('❌ Failed to save capture. Try again.');
        }
    }

    private async processCapture(item: QuickCaptureItem) {
        // Route based on type
        switch (item.type) {
            case 'task':
                await this.captureAsTask(item);
                break;
            case 'idea':
            case 'question':
            case 'note':
                await this.captureToInbox(item);
                break;
            case 'reference':
                await this.captureToReferences(item);
                break;
        }
    }

    private async captureAsTask(item: QuickCaptureItem) {
        // Add to micro-task system
        this.plugin.createMicroTask(item.text);
        this.plugin.upsertTaskBoardInDailyNote(true);
    }

    private async captureToInbox(item: QuickCaptureItem) {
        // Create or append to daily inbox note
        const today = new Date().toISOString().split('T')[0];
        const inboxPath = `Inbox/${today}-quick-captures.md`;
        
        const emoji = {
            'idea': '💡',
            'question': '❓', 
            'note': '📝'
        }[item.type] || '📝';

        const priority = item.priority !== 'medium' ? ` [${item.priority}]` : '';
        const timestamp = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const content = `- ${emoji} ${item.text}${priority} *(${timestamp})*\n`;

        try {
            const file = this.app.vault.getAbstractFileByPath(inboxPath);
            if (file instanceof TFile) {
                // Append to existing file
                const currentContent = await this.app.vault.read(file);
                await this.app.vault.modify(file, currentContent + content);
            } else {
                // Create new file
                const header = `# Quick Captures - ${today}\n\n`;
                await this.app.vault.create(inboxPath, header + content);
            }
        } catch (error) {
            // Fallback: add to today's daily note
            console.warn('Failed to create inbox file, adding to daily note');
            await this.addToDailyNote(content);
        }
    }

    private async captureToReferences(item: QuickCaptureItem) {
        // Add to references note or daily note
        const content = `- 📚 ${item.text} *(${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})*\n`;
        await this.addToDailyNote(content, '## References');
    }

    private async addToDailyNote(content: string, section: string = '## Quick Captures') {
        // Basic daily note integration
        try {
            const today = new Date().toISOString().split('T')[0];
            const dailyNotePath = `Daily Notes/${today}.md`;
            
            const file = this.app.vault.getAbstractFileByPath(dailyNotePath);
            if (file instanceof TFile) {
                const currentContent = await this.app.vault.read(file);
                
                // Add section if it doesn't exist
                if (!currentContent.includes(section)) {
                    await this.app.vault.modify(file, currentContent + `\n\n${section}\n\n${content}`);
                } else {
                    // Append to existing section
                    const lines = currentContent.split('\n');
                    const sectionIndex = lines.findIndex(line => line.startsWith(section));
                    if (sectionIndex !== -1) {
                        lines.splice(sectionIndex + 1, 0, content.trim());
                        await this.app.vault.modify(file, lines.join('\n'));
                    }
                }
            } else {
                // Create new daily note
                const newContent = `# ${today}\n\n${section}\n\n${content}`;
                await this.app.vault.create(dailyNotePath, newContent);
            }
        } catch (error) {
            console.error('Failed to add to daily note:', error);
            // Ultimate fallback - just save to plugin data
            new Notice('Saved to plugin memory (restart to see in daily note)');
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}