import { ItemView, WorkspaceLeaf, Setting, Modal, App, Notice } from 'obsidian';
import { ProactivitySettings } from './main';
import { ObsidianIntegrationService } from './obsidian-integration-service';

export const VIEW_TYPE_PROACTIVITY = 'proactivity-view';

export class ProactivityView extends ItemView {
  private settings: ProactivitySettings;
  private integrationService: ObsidianIntegrationService;
  private currentEnergyLevel: string = 'moderate';
  private todaysTasks: any[] = [];
  private currentFocus: string = '';

  constructor(
    leaf: WorkspaceLeaf,
    settings: ProactivitySettings,
    integrationService: ObsidianIntegrationService
  ) {
    super(leaf);
    this.settings = settings;
    this.integrationService = integrationService;
  }

  getViewType() {
    return VIEW_TYPE_PROACTIVITY;
  }

  getDisplayText() {
    return 'Proactivity';
  }

  getIcon() {
    return 'brain-circuit';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('proactivity-view');

    this.renderMainInterface(container);
    await this.loadTodaysTasks();
  }

  async onClose() {
    // Clean up any intervals or subscriptions
  }

  private renderMainInterface(container: HTMLElement) {
    // Header with status
    const header = container.createEl('div', { cls: 'proactive-header' });
    const title = header.createEl('h2', { text: 'Proactivity Assistant' });

    // Energy Level Section
    this.renderEnergySection(container);

    // Current Focus Section
    this.renderFocusSection(container);

    // Task Suggestions Section
    this.renderTaskSuggestionsSection(container);

    // Progress Section
    this.renderProgressSection(container);

    // Quick Actions Section
    this.renderQuickActionsSection(container);

    // ADHD Support Section
    this.renderADHDSupportSection(container);
  }

  private renderEnergySection(container: HTMLElement) {
    const energySection = container.createEl('div', { cls: 'energy-section' });
    energySection.createEl('h3', { text: '⚡ Energy Level' });

    const energyDisplay = energySection.createEl('div', { cls: 'energy-display' });

    const energyLevels = [
      { level: 'high', emoji: '⚡', label: 'High' },
      { level: 'moderate', emoji: '🔋', label: 'Moderate' },
      { level: 'low', emoji: '🪫', label: 'Low' },
      { level: 'depleted', emoji: '😴', label: 'Depleted' }
    ];

    energyLevels.forEach(({ level, emoji, label }) => {
      const button = energyDisplay.createEl('button', {
        cls: `energy-button ${this.currentEnergyLevel === level ? 'active' : ''}`,
        text: `${emoji} ${label}`
      });

      button.onclick = async () => {
        await this.updateEnergyLevel(level);
        this.refreshEnergyDisplay();
      };
    });

    // Energy-based recommendations
    const recommendations = energySection.createEl('div', { cls: 'energy-recommendations' });
    this.updateEnergyRecommendations(recommendations);
  }

  private renderFocusSection(container: HTMLElement) {
    const focusSection = container.createEl('div', { cls: 'focus-section' });
    focusSection.createEl('h3', { text: '🎯 Current Focus' });

    const focusInput = focusSection.createEl('input', {
      type: 'text',
      placeholder: 'What are you working on right now?',
      value: this.currentFocus,
      cls: 'focus-input'
    });

    focusInput.addEventListener('change', (e) => {
      this.currentFocus = (e.target as HTMLInputElement).value;
      this.integrationService.updateCurrentFocus(this.currentFocus);
    });

    // Focus timer
    const timerSection = focusSection.createEl('div', { cls: 'focus-timer' });
    const startButton = timerSection.createEl('button', {
      text: '▶️ Start 25min Focus',
      cls: 'mod-cta'
    });

    startButton.onclick = () => {
      this.startFocusTimer(25);
    };
  }

  private renderTaskSuggestionsSection(container: HTMLElement) {
    const tasksSection = container.createEl('div', { cls: 'tasks-section' });
    tasksSection.createEl('h3', { text: '📝 Smart Task Suggestions' });

    const tasksContainer = tasksSection.createEl('div', { cls: 'tasks-container' });

    // Refresh button
    const refreshButton = tasksSection.createEl('button', {
      text: '🔄 Get New Suggestions',
      cls: 'refresh-tasks-btn'
    });

    refreshButton.onclick = () => {
      this.refreshTaskSuggestions();
    };

    this.renderTaskList(tasksContainer);
  }

  private renderProgressSection(container: HTMLElement) {
    const progressSection = container.createEl('div', { cls: 'progress-section' });
    progressSection.createEl('h3', { text: '📊 Today\'s Progress' });

    // Progress visualization
    const progressBar = progressSection.createEl('div', { cls: 'progress-bar' });
    const progressFill = progressBar.createEl('div', { cls: 'progress-fill' });

    // Progress stats
    const stats = progressSection.createEl('div', { cls: 'progress-stats' });
    stats.createEl('div', { cls: 'stat-item', text: '🎯 0 tasks completed' });
    stats.createEl('div', { cls: 'stat-item', text: '⏱️ 0 minutes focused' });
    stats.createEl('div', { cls: 'stat-item', text: '📝 0 words written' });

    // Celebration button
    const celebrateButton = progressSection.createEl('button', {
      text: '🎉 Celebrate Progress',
      cls: 'celebrate-btn'
    });

    celebrateButton.onclick = () => {
      this.celebrateProgress();
    };
  }

  private renderQuickActionsSection(container: HTMLElement) {
    const actionsSection = container.createEl('div', { cls: 'quick-actions-section' });
    actionsSection.createEl('h3', { text: '⚡ Quick Actions' });

    const actionsGrid = actionsSection.createEl('div', { cls: 'actions-grid' });

    const actions = [
      {
        icon: '🔨',
        text: 'Break Down Task',
        action: () => this.openTaskBreakdown()
      },
      {
        icon: '🤝',
        text: 'Body Doubling',
        action: () => this.startBodyDoubling()
      },
      {
        icon: '🧘',
        text: 'Quick Breathing',
        action: () => this.startBreathingExercise()
      },
      {
        icon: '📝',
        text: 'Quick Note',
        action: () => this.createQuickNote()
      },
      {
        icon: '🎲',
        text: 'Random Task',
        action: () => this.getRandomTask()
      },
      {
        icon: '💡',
        text: 'Motivation Boost',
        action: () => this.getMotivationBoost()
      }
    ];

    actions.forEach(({ icon, text, action }) => {
      const button = actionsGrid.createEl('button', {
        cls: 'action-button',
        text: `${icon} ${text}`
      });
      button.onclick = action;
    });
  }

  private renderADHDSupportSection(container: HTMLElement) {
    const supportSection = container.createEl('div', { cls: 'adhd-support-section' });
    supportSection.createEl('h3', { text: '🧠 ADHD Support' });

    // Pattern recognition display
    const patternsDiv = supportSection.createEl('div', { cls: 'patterns-display' });
    patternsDiv.createEl('p', { text: 'No patterns detected yet. I\'ll learn your rhythms over time.' });

    // Support tools
    const supportTools = supportSection.createEl('div', { cls: 'support-tools' });

    const tools = [
      {
        name: 'Procrastination Help',
        icon: '🆘',
        action: () => this.triggerProcrastinationHelp()
      },
      {
        name: 'Time Anchor',
        icon: '⏰',
        action: () => this.showTimeAnchor()
      },
      {
        name: 'Overwhelm Reset',
        icon: '🔄',
        action: () => this.overwhelmReset()
      }
    ];

    tools.forEach(({ name, icon, action }) => {
      const toolButton = supportTools.createEl('button', {
        cls: 'support-tool-btn',
        text: `${icon} ${name}`
      });
      toolButton.onclick = action;
    });
  }

  // Event handlers and actions

  private async updateEnergyLevel(level: string) {
    this.currentEnergyLevel = level;
    await this.integrationService.updateEnergyLevel(level);
    await this.refreshTaskSuggestions();
    this.updateEnergyRecommendations();
  }

  private refreshEnergyDisplay() {
    const energyButtons = this.containerEl.querySelectorAll('.energy-button');
    energyButtons.forEach((button, index) => {
      const levels = ['high', 'moderate', 'low', 'depleted'];
      button.removeClass('active');
      if (levels[index] === this.currentEnergyLevel) {
        button.addClass('active');
      }
    });
  }

  private updateEnergyRecommendations(container?: HTMLElement) {
    if (!container) {
      container = this.containerEl.querySelector('.energy-recommendations') as HTMLElement;
    }
    if (!container) return;

    container.empty();

    const recommendations = this.getEnergyBasedRecommendations();
    recommendations.forEach(rec => {
      const recEl = container.createEl('div', {
        cls: 'energy-recommendation',
        text: `💡 ${rec}`
      });
    });
  }

  private getEnergyBasedRecommendations(): string[] {
    switch (this.currentEnergyLevel) {
      case 'high':
        return [
          'Perfect time for complex writing or analysis',
          'Consider tackling that difficult section',
          'Great for creative brainstorming'
        ];
      case 'moderate':
        return [
          'Good for steady writing progress',
          'Ideal for reviewing and editing',
          'Try organizing your notes'
        ];
      case 'low':
        return [
          'Perfect for simple, routine tasks',
          'Try reading and highlighting',
          'Organize files or references'
        ];
      case 'depleted':
        return [
          'Time for rest and self-care',
          'Light tasks like email checking',
          'Consider a short break or nap'
        ];
      default:
        return ['Update your energy level for personalized suggestions'];
    }
  }

  private async refreshTaskSuggestions() {
    const suggestions = await this.integrationService.getTaskSuggestions(this.currentEnergyLevel);
    const container = this.containerEl.querySelector('.tasks-container') as HTMLElement;
    if (container) {
      this.renderTaskList(container, suggestions);
    }
  }

  private renderTaskList(container: HTMLElement, tasks?: any[]) {
    container.empty();

    const tasksToShow = tasks || this.getDefaultTasks();

    if (tasksToShow.length === 0) {
      container.createEl('p', {
        text: 'No tasks available. Try breaking down a larger goal!',
        cls: 'no-tasks-message'
      });
      return;
    }

    tasksToShow.forEach((task, index) => {
      const taskEl = container.createEl('div', { cls: 'task-item' });

      const taskHeader = taskEl.createEl('div', { cls: 'task-header' });
      taskHeader.createEl('span', { cls: 'task-title', text: task.title });
      taskHeader.createEl('span', { cls: 'task-time', text: `⏱️ ${task.estimatedMinutes}min` });

      if (task.description) {
        taskEl.createEl('p', { cls: 'task-description', text: task.description });
      }

      const taskActions = taskEl.createEl('div', { cls: 'task-actions' });

      const startButton = taskActions.createEl('button', {
        text: '▶️ Start',
        cls: 'task-start-btn'
      });
      startButton.onclick = () => this.startTask(task);

      const breakdownButton = taskActions.createEl('button', {
        text: '🔨 Break Down',
        cls: 'task-breakdown-btn'
      });
      breakdownButton.onclick = () => this.breakdownTask(task);
    });
  }

  private getDefaultTasks() {
    return [
      {
        id: 'default-1',
        title: 'Review today\'s writing goals',
        description: 'Quick 5-minute check of what you want to accomplish',
        estimatedMinutes: 5,
        complexity: 'micro'
      },
      {
        id: 'default-2',
        title: 'Organize one reference',
        description: 'Add one paper to your reference manager',
        estimatedMinutes: 10,
        complexity: 'simple'
      },
      {
        id: 'default-3',
        title: 'Write one paragraph',
        description: 'Draft one paragraph for any section',
        estimatedMinutes: 15,
        complexity: 'simple'
      }
    ];
  }

  private startFocusTimer(minutes: number) {
    // Implementation for Pomodoro-style timer
    console.log(`Starting ${minutes} minute focus timer`);
  }

  private async startTask(task: any) {
    this.currentFocus = task.title;
    await this.integrationService.startTask(task);

    // Update focus display
    const focusInput = this.containerEl.querySelector('.focus-input') as HTMLInputElement;
    if (focusInput) {
      focusInput.value = this.currentFocus;
    }
  }

  private async breakdownTask(task: any) {
    // Open task breakdown modal or integrate with TaskBreakdownService
    console.log('Breaking down task:', task);
  }

  private openTaskBreakdown() {
    // Open task breakdown interface
    console.log('Opening task breakdown');
  }

  private startBodyDoubling() {
    // Activate body doubling mode
    console.log('Starting body doubling');
  }

  private startBreathingExercise() {
    // Guide through breathing exercise
    const modal = new BreathingModal(this.app);
    modal.open();
  }

  private createQuickNote() {
    // Create a quick note in Obsidian
    this.integrationService.createQuickNote();
  }

  private getRandomTask() {
    // Get a random task suggestion
    const randomTasks = this.getDefaultTasks();
    const randomTask = randomTasks[Math.floor(Math.random() * randomTasks.length)];
    this.startTask(randomTask);
  }

  private getMotivationBoost() {
    const motivations = [
      'You\'re doing important work! 🌟',
      'Every word counts toward your goal! 📝',
      'Your ADHD brain brings unique insights! 🧠',
      'Progress over perfection! 💪',
      'You\'ve overcome challenges before! 🎯'
    ];

    const motivation = motivations[Math.floor(Math.random() * motivations.length)];
    new Notice(motivation);
  }

  private triggerProcrastinationHelp() {
    // Trigger procrastination intervention
    console.log('Triggering procrastination help');
  }

  private showTimeAnchor() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    new Notice(`🕐 Time anchor: It's currently ${timeString}`);
  }

  private overwhelmReset() {
    // Help user reset when overwhelmed
    console.log('Overwhelm reset triggered');
  }

  private celebrateProgress() {
    // Celebrate user's progress
    console.log('Celebrating progress');
  }

  private async loadTodaysTasks() {
    this.todaysTasks = await this.integrationService.getTodaysTasks();
  }
}

// Simple breathing exercise modal
class BreathingModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: '🧘 Quick Breathing Exercise' });

    const instructions = contentEl.createEl('div', { cls: 'breathing-instructions' });
    instructions.createEl('p', { text: 'Follow along with this simple breathing pattern:' });

    const breathingPattern = contentEl.createEl('div', { cls: 'breathing-pattern' });
    const breathingCircle = breathingPattern.createEl('div', { cls: 'breathing-circle' });

    const instructionText = contentEl.createEl('p', {
      cls: 'breathing-instruction',
      text: 'Get ready...'
    });

    // Start breathing sequence
    this.startBreathingSequence(instructionText, breathingCircle);

    const closeButton = contentEl.createEl('button', {
      text: 'Close',
      cls: 'mod-cta'
    });
    closeButton.onclick = () => this.close();
  }

  private startBreathingSequence(instructionEl: HTMLElement, circleEl: HTMLElement) {
    const sequence = [
      { text: 'Breathe in...', duration: 4000, action: 'expand' },
      { text: 'Hold...', duration: 2000, action: 'hold' },
      { text: 'Breathe out...', duration: 6000, action: 'contract' },
      { text: 'Pause...', duration: 2000, action: 'hold' }
    ];

    let cycleCount = 0;
    const maxCycles = 3;

    const runCycle = () => {
      if (cycleCount >= maxCycles) {
        instructionEl.textContent = 'Great job! You\'re centered and ready to focus. 🌟';
        return;
      }

      let stepIndex = 0;
      const runStep = () => {
        if (stepIndex >= sequence.length) {
          cycleCount++;
          setTimeout(runCycle, 500);
          return;
        }

        const step = sequence[stepIndex];
        instructionEl.textContent = step.text;

        // Animate circle
        circleEl.removeClass('expand', 'contract');
        if (step.action === 'expand') {
          circleEl.addClass('expand');
        } else if (step.action === 'contract') {
          circleEl.addClass('contract');
        }

        stepIndex++;
        setTimeout(runStep, step.duration);
      };

      runStep();
    };

    setTimeout(runCycle, 1000);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}