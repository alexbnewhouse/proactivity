import { App, Modal, Setting, Notice, TFile } from 'obsidian';
import { ProactivitySettings } from './main';
import { ObsidianIntegrationService } from './obsidian-integration-service';

export class TaskBreakdownModal extends Modal {
  private settings: ProactivitySettings;
  private integrationService: ObsidianIntegrationService;
  private sourceFile: TFile | null;
  private selectedText: string = '';
  private taskInput: HTMLInputElement;
  private contextInput: HTMLTextAreaElement;
  private depthSlider: HTMLInputElement;
  private energySelect: HTMLSelectElement;
  private timeInput: HTMLInputElement;
  private breakdownContainer: HTMLElement;
  private isProcessing: boolean = false;

  constructor(
    app: App,
    settings: ProactivitySettings,
    integrationService: ObsidianIntegrationService,
    sourceFile?: TFile
  ) {
    super(app);
    this.settings = settings;
    this.integrationService = integrationService;
    this.sourceFile = sourceFile || null;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('proactive-task-breakdown-modal');

    // Get selected text if available
    this.selectedText = await this.integrationService.getSelectedText() || '';

    this.createHeader();
    this.createTaskInputSection();
    this.createContextSection();
    this.createOptionsSection();
    this.createActionButtons();
    this.createBreakdownDisplay();

    // Auto-populate if we have context
    if (this.selectedText) {
      this.taskInput.value = `Work on: "${this.selectedText.substring(0, 100)}..."`;
      this.contextInput.value = `Selected text from ${this.sourceFile?.name || 'current file'}`;
    } else if (this.sourceFile) {
      this.taskInput.value = `Continue work on ${this.sourceFile.name}`;
      this.contextInput.value = `Working on file: ${this.sourceFile.path}`;
    }
  }

  private createHeader() {
    const { contentEl } = this;

    const header = contentEl.createEl('div', { cls: 'modal-header' });
    header.createEl('h2', { text: '🔨 AI Task Breakdown' });
    header.createEl('p', {
      text: 'Break down overwhelming tasks into ADHD-friendly micro-steps',
      cls: 'modal-subtitle'
    });
  }

  private createTaskInputSection() {
    const { contentEl } = this;

    const section = contentEl.createEl('div', { cls: 'input-section' });
    section.createEl('label', { text: 'What do you want to work on?' });

    this.taskInput = section.createEl('input', {
      type: 'text',
      placeholder: 'e.g., "Write the methodology section" or "Analyze survey data"',
      cls: 'task-input'
    });

    // Add quick suggestions
    const suggestions = section.createEl('div', { cls: 'quick-suggestions' });
    suggestions.createEl('span', { text: 'Quick suggestions: ' });

    const suggestionItems = [
      'Write one paragraph',
      'Review one paper',
      'Organize notes',
      'Plan next section'
    ];

    suggestionItems.forEach(suggestion => {
      const button = suggestions.createEl('button', {
        text: suggestion,
        cls: 'suggestion-btn'
      });
      button.onclick = () => {
        this.taskInput.value = suggestion;
      };
    });
  }

  private createContextSection() {
    const { contentEl } = this;

    const section = contentEl.createEl('div', { cls: 'input-section' });
    section.createEl('label', { text: 'Additional context (optional)' });

    this.contextInput = section.createEl('textarea', {
      placeholder: 'Any relevant details, constraints, or background information...',
      cls: 'context-input'
    });
  }

  private createOptionsSection() {
    const { contentEl } = this;

    const section = contentEl.createEl('div', { cls: 'options-section' });

    // Breakdown depth
    const depthContainer = section.createEl('div', { cls: 'option-container' });
    depthContainer.createEl('label', { text: 'Breakdown detail level' });

    this.depthSlider = depthContainer.createEl('input', {
      type: 'range',
      min: '1',
      max: '5',
      value: this.settings.defaultBreakdownDepth.toString(),
      cls: 'depth-slider'
    });

    const depthLabel = depthContainer.createEl('span', {
      text: this.getDepthLabel(this.settings.defaultBreakdownDepth),
      cls: 'depth-label'
    });

    this.depthSlider.oninput = () => {
      const depth = parseInt(this.depthSlider.value);
      depthLabel.textContent = this.getDepthLabel(depth);
    };

    // Current energy level
    const energyContainer = section.createEl('div', { cls: 'option-container' });
    energyContainer.createEl('label', { text: 'Your current energy level' });

    this.energySelect = energyContainer.createEl('select', { cls: 'energy-select' });
    const energyOptions = [
      { value: 'high', text: '⚡ High - Ready for complex tasks' },
      { value: 'moderate', text: '🔋 Moderate - Normal capacity' },
      { value: 'low', text: '🪫 Low - Simple tasks only' },
      { value: 'depleted', text: '😴 Depleted - Need rest/micro-tasks' }
    ];

    energyOptions.forEach(option => {
      const optionEl = this.energySelect.createEl('option', {
        value: option.value,
        text: option.text
      });
      if (option.value === 'moderate') {
        optionEl.selected = true;
      }
    });

    // Available time
    const timeContainer = section.createEl('div', { cls: 'option-container' });
    timeContainer.createEl('label', { text: 'Available time (minutes)' });

    this.timeInput = timeContainer.createEl('input', {
      type: 'number',
      min: '5',
      max: '180',
      value: '30',
      cls: 'time-input'
    });
  }

  private createActionButtons() {
    const { contentEl } = this;

    const buttonContainer = contentEl.createEl('div', { cls: 'button-container' });

    const breakdownBtn = buttonContainer.createEl('button', {
      text: '🤖 Break Down Task',
      cls: 'mod-cta breakdown-btn'
    });
    breakdownBtn.onclick = () => this.performBreakdown();

    const cancelBtn = buttonContainer.createEl('button', {
      text: 'Cancel',
      cls: 'cancel-btn'
    });
    cancelBtn.onclick = () => this.close();
  }

  private createBreakdownDisplay() {
    const { contentEl } = this;

    this.breakdownContainer = contentEl.createEl('div', { cls: 'breakdown-container' });
  }

  private getDepthLabel(depth: number): string {
    const labels = {
      1: 'Basic (2-3 steps)',
      2: 'Simple (3-5 steps)',
      3: 'Detailed (5-8 steps)',
      4: 'Very Detailed (8-12 steps)',
      5: 'Micro-steps (12+ steps)'
    };
    return labels[depth] || 'Detailed';
  }

  private async performBreakdown() {
    if (this.isProcessing) return;

    const task = this.taskInput.value.trim();
    if (!task) {
      new Notice('Please enter a task to break down');
      return;
    }

    this.isProcessing = true;
    this.showProcessingState();

    try {
      const breakdown = await this.requestTaskBreakdown({
        task,
        context: this.contextInput.value.trim(),
        depth: parseInt(this.depthSlider.value),
        energyLevel: this.energySelect.value,
        availableTime: parseInt(this.timeInput.value),
        sourceFile: this.sourceFile?.path,
        selectedText: this.selectedText
      });

      this.displayBreakdown(breakdown);
    } catch (error) {
      console.error('Task breakdown error:', error);
      this.showError('Failed to break down task. Please try again.');
    } finally {
      this.isProcessing = false;
    }
  }

  private showProcessingState() {
    this.breakdownContainer.empty();
    this.breakdownContainer.addClass('processing');

    const processing = this.breakdownContainer.createEl('div', { cls: 'processing-message' });
    processing.createEl('div', { cls: 'spinner' });
    processing.createEl('p', { text: '🤖 Breaking down your task into ADHD-friendly steps...' });
    processing.createEl('p', {
      text: 'This usually takes 10-15 seconds',
      cls: 'processing-subtitle'
    });
  }

  private showError(message: string) {
    this.breakdownContainer.empty();
    this.breakdownContainer.removeClass('processing');

    const error = this.breakdownContainer.createEl('div', { cls: 'error-message' });
    error.createEl('p', { text: '❌ ' + message });

    const retryBtn = error.createEl('button', {
      text: 'Try Again',
      cls: 'retry-btn'
    });
    retryBtn.onclick = () => this.performBreakdown();
  }

  private displayBreakdown(breakdown: any) {
    this.breakdownContainer.empty();
    this.breakdownContainer.removeClass('processing');

    if (!breakdown || !breakdown.steps || breakdown.steps.length === 0) {
      this.showError('No breakdown steps received');
      return;
    }

    // Header
    const header = this.breakdownContainer.createEl('div', { cls: 'breakdown-header' });
    header.createEl('h3', { text: '✨ Your ADHD-Friendly Task Breakdown' });

    if (breakdown.motivation) {
      header.createEl('p', {
        text: breakdown.motivation,
        cls: 'motivation-message'
      });
    }

    // Steps
    const stepsList = this.breakdownContainer.createEl('div', { cls: 'steps-list' });

    breakdown.steps.forEach((step: any, index: number) => {
      const stepEl = stepsList.createEl('div', { cls: 'breakdown-step' });

      const stepHeader = stepEl.createEl('div', { cls: 'step-header' });
      stepHeader.createEl('span', {
        text: `${index + 1}.`,
        cls: 'step-number'
      });
      stepHeader.createEl('h4', {
        text: step.title,
        cls: 'step-title'
      });
      stepHeader.createEl('span', {
        text: `⏱️ ${step.estimatedMinutes}min`,
        cls: 'step-time'
      });

      if (step.description) {
        stepEl.createEl('p', {
          text: step.description,
          cls: 'step-description'
        });
      }

      if (step.tips && step.tips.length > 0) {
        const tipsList = stepEl.createEl('ul', { cls: 'step-tips' });
        step.tips.forEach((tip: string) => {
          tipsList.createEl('li', { text: tip });
        });
      }

      // Action buttons
      const stepActions = stepEl.createEl('div', { cls: 'step-actions' });

      const startBtn = stepActions.createEl('button', {
        text: '▶️ Start',
        cls: 'step-start-btn'
      });
      startBtn.onclick = () => this.startStep(step);

      const addToVaultBtn = stepActions.createEl('button', {
        text: '📝 Add to Daily Note',
        cls: 'step-add-btn'
      });
      addToVaultBtn.onclick = () => this.addStepToVault(step);
    });

    // Footer actions
    const footer = this.breakdownContainer.createEl('div', { cls: 'breakdown-footer' });

    const addAllBtn = footer.createEl('button', {
      text: '📋 Add All Steps to Daily Note',
      cls: 'mod-cta'
    });
    addAllBtn.onclick = () => this.addAllStepsToVault(breakdown.steps);

    const newBreakdownBtn = footer.createEl('button', {
      text: '🔄 Try Different Breakdown',
      cls: 'secondary-btn'
    });
    newBreakdownBtn.onclick = () => {
      this.breakdownContainer.empty();
    };
  }

  private async requestTaskBreakdown(params: any) {
    // In a real implementation, this would call the backend API
    // For now, return a mock breakdown
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call

    return {
      motivation: "Great choice! Breaking this down will make it much more manageable. 🎯",
      steps: [
        {
          title: "Set up your workspace",
          description: "Clear your desk and open necessary files",
          estimatedMinutes: 5,
          complexity: "micro",
          tips: ["Put away distractions", "Have water nearby"]
        },
        {
          title: "Create a rough outline",
          description: "Jot down 3-5 main points you want to cover",
          estimatedMinutes: 10,
          complexity: "simple",
          tips: ["Don't worry about perfection", "Use bullet points"]
        },
        {
          title: "Write the first paragraph",
          description: "Focus on just the opening paragraph",
          estimatedMinutes: 15,
          complexity: "moderate",
          tips: ["Start with any sentence", "You can edit later"]
        }
      ]
    };
  }

  private async startStep(step: any) {
    await this.integrationService.startTask({
      title: step.title,
      description: step.description,
      estimatedMinutes: step.estimatedMinutes,
      complexity: step.complexity
    });

    new Notice(`Started: ${step.title} (${step.estimatedMinutes}min)`);
    this.close();
  }

  private async addStepToVault(step: any) {
    const dailyNotePath = await this.getDailyNotePath();
    if (!dailyNotePath) {
      new Notice('Unable to find daily note');
      return;
    }

    try {
      const file = await this.getOrCreateFile(dailyNotePath);
      const content = await this.app.vault.read(file);

      const taskEntry = `- [ ] ${step.title} (${step.estimatedMinutes}min)${step.description ? ` - ${step.description}` : ''}\n`;
      const updatedContent = this.updateTasksSection(content, taskEntry);

      await this.app.vault.modify(file, updatedContent);
      new Notice(`Added "${step.title}" to daily note`);
    } catch (error) {
      console.error('Error adding step to vault:', error);
      new Notice('Error adding step to daily note');
    }
  }

  private async addAllStepsToVault(steps: any[]) {
    const dailyNotePath = await this.getDailyNotePath();
    if (!dailyNotePath) {
      new Notice('Unable to find daily note');
      return;
    }

    try {
      const file = await this.getOrCreateFile(dailyNotePath);
      const content = await this.app.vault.read(file);

      const taskEntries = steps.map(step =>
        `- [ ] ${step.title} (${step.estimatedMinutes}min)${step.description ? ` - ${step.description}` : ''}`
      ).join('\n') + '\n';

      const updatedContent = this.updateTasksSection(content, taskEntries);

      await this.app.vault.modify(file, updatedContent);
      new Notice(`Added ${steps.length} tasks to daily note`);
      this.close();
    } catch (error) {
      console.error('Error adding steps to vault:', error);
      new Notice('Error adding tasks to daily note');
    }
  }

  private async getDailyNotePath(): Promise<string | null> {
    const today = new Date().toISOString().split('T')[0];
    const dailyNoteFolder = this.settings.obsidianIntegration.dailyNotePath;
    return `${dailyNoteFolder}/${today}.md`;
  }

  private async getOrCreateFile(path: string): Promise<TFile> {
    let file = this.app.vault.getAbstractFileByPath(path);

    if (!file) {
      const template = this.createDailyNoteTemplate();
      file = await this.app.vault.create(path, template);
    }

    return file as TFile;
  }

  private createDailyNoteTemplate(): string {
    const today = new Date().toLocaleDateString();
    return `# Daily Note - ${today}

${this.settings.obsidianIntegration.taskTagPrefix}/daily-note

## Energy Tracking

## Current Focus

## Tasks

## Progress

## Celebrations

## Reflections

---
*Generated by Proactivity*`;
  }

  private updateTasksSection(content: string, newTasks: string): string {
    const tasksSection = '## Tasks';
    const sectionRegex = new RegExp(`(${tasksSection}\\n)[\\s\\S]*?(?=\\n## |\\n---|\$)`, 'i');

    if (sectionRegex.test(content)) {
      return content.replace(sectionRegex, `${tasksSection}\n\n${newTasks}`);
    } else {
      // If section doesn't exist, append it before the final divider or at the end
      const dividerIndex = content.lastIndexOf('\n---');
      if (dividerIndex !== -1) {
        return content.slice(0, dividerIndex) + `\n${tasksSection}\n\n${newTasks}\n` + content.slice(dividerIndex);
      } else {
        return content + `\n\n${tasksSection}\n\n${newTasks}`;
      }
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}