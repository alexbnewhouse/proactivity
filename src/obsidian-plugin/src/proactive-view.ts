import { ItemView, WorkspaceLeaf, Setting, Modal, App, Notice } from 'obsidian';
import { ProactivitySettings } from './main';
import { ObsidianIntegrationService } from './obsidian-integration-service';
import { ProactivityApiClient } from './api-client';

export const VIEW_TYPE_PROACTIVITY = 'proactivity-view';

export class ProactivityView extends ItemView {
  private settings: ProactivitySettings;
  public integrationService: ObsidianIntegrationService;
  private apiClient: ProactivityApiClient;
  public currentEnergyLevel: string = 'moderate';
  private todaysTasks: any[] = [];
  private currentFocus: string = '';
  private syncInterval: NodeJS.Timeout;

  constructor(
    leaf: WorkspaceLeaf,
    settings: ProactivitySettings,
    integrationService: ObsidianIntegrationService
  ) {
    super(leaf);
    this.settings = settings;
    this.integrationService = integrationService;
    this.apiClient = new ProactivityApiClient(settings);
  }

  getViewType() {
    return VIEW_TYPE_PROACTIVITY;
  }

  getDisplayText() {
    return 'Proactivity';
  }

  getIcon() {
    return 'brain';
  }

  async onOpen() {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('proactivity-view');

    this.renderMainInterface(container);
    await this.loadTodaysTasks();

    // Start sync with browser extension
    if (this.settings.browserExtensionSync.enableSync) {
      this.startBrowserSync();
    }
  }

  async onClose() {
    // Clean up sync interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  private renderMainInterface(container: HTMLElement) {
    // Header with status
    const header = container.createEl('div', { cls: 'proactive-header' });
    const title = header.createEl('h2', { text: 'Proactivity Assistant' });

    // Energy Level Section
    this.renderEnergySection(container);

    // Current Focus Section
    this.renderFocusSection(container);

    // Task Dashboard Section
    this.renderTaskDashboardSection(container);

    // Task Suggestions Section
    this.renderTaskSuggestionsSection(container);

    // Progress Section
    this.renderProgressSection(container);

    // Browser Sync Section
    this.renderBrowserSyncSection(container);

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

  private renderTaskDashboardSection(container: HTMLElement) {
    const dashboardSection = container.createEl('div', { cls: 'task-dashboard-section' });
    dashboardSection.createEl('h3', { text: '📋 Task Dashboard' });

    // Stats row
    const statsRow = dashboardSection.createEl('div', { cls: 'stats-row' });

    const completedStat = statsRow.createEl('div', { cls: 'stat-card completed' });
    completedStat.createEl('div', { cls: 'stat-number', text: '0' });
    completedStat.createEl('div', { cls: 'stat-label', text: 'Completed' });

    const activeStat = statsRow.createEl('div', { cls: 'stat-card active' });
    activeStat.createEl('div', { cls: 'stat-number', text: '0' });
    activeStat.createEl('div', { cls: 'stat-label', text: 'Active' });

    const urgentStat = statsRow.createEl('div', { cls: 'stat-card urgent' });
    urgentStat.createEl('div', { cls: 'stat-number', text: '0' });
    urgentStat.createEl('div', { cls: 'stat-label', text: 'Urgent' });

    // Task input section
    const inputSection = dashboardSection.createEl('div', { cls: 'task-input-section' });
    const taskInput = inputSection.createEl('input', {
      cls: 'task-input',
      placeholder: 'Add a new task...',
      type: 'text'
    }) as HTMLInputElement;

    const addButton = inputSection.createEl('button', {
      cls: 'add-task-btn',
      text: '+ Add'
    });

    // AI Project Planning button
    const planningSection = dashboardSection.createEl('div', { cls: 'planning-section' });
    const planningButton = planningSection.createEl('button', {
      cls: 'ai-planning-btn',
      text: '🤖 AI Project Planning'
    });

    // Task list container
    const taskListContainer = dashboardSection.createEl('div', { cls: 'task-list-container' });
    const taskList = taskListContainer.createEl('div', { cls: 'task-list' });

    // Event handlers
    const addTask = () => {
      const taskText = taskInput.value.trim();
      if (taskText) {
        this.addNewTask(taskText, taskList);
        taskInput.value = '';
        this.updateTaskStats();
      }
    };

    addButton.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addTask();
      }
    });

    planningButton.addEventListener('click', () => {
      this.openAIProjectPlanningModal();
    });

    // Load existing tasks
    this.loadTasksFromVault(taskList);
    this.updateTaskStats();
  }

  private async addNewTask(taskText: string, taskList: HTMLElement) {
    // Create task element
    const taskItem = taskList.createEl('div', { cls: 'task-item' });
    const checkbox = taskItem.createEl('input', { type: 'checkbox', cls: 'task-checkbox' });
    const taskContent = taskItem.createEl('div', { cls: 'task-content' });
    const taskTitle = taskContent.createEl('div', { cls: 'task-title', text: taskText });
    const taskMeta = taskContent.createEl('div', { cls: 'task-meta' });

    // Priority and time estimate
    const priority = taskMeta.createEl('span', { cls: 'task-priority', text: 'Normal' });
    const timeEstimate = taskMeta.createEl('span', { cls: 'task-time', text: '~25min' });

    // Actions
    const actions = taskItem.createEl('div', { cls: 'task-actions' });
    const breakdownBtn = actions.createEl('button', { cls: 'task-action-btn', text: '🔨' });
    const deleteBtn = actions.createEl('button', { cls: 'task-action-btn delete', text: '🗑️' });

    // Event handlers
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        taskItem.classList.add('completed');
        this.completeTask(taskText);
      } else {
        taskItem.classList.remove('completed');
      }
      this.updateTaskStats();
    });

    breakdownBtn.addEventListener('click', () => {
      this.breakdownTask(taskText);
    });

    deleteBtn.addEventListener('click', () => {
      taskItem.remove();
      this.updateTaskStats();
    });

    // Add to vault as a task
    try {
      await this.integrationService.addTaskToVault(taskText);
    } catch (error) {
      console.error('Failed to add task to vault:', error);
    }
  }

  private async loadTasksFromVault(taskList: HTMLElement) {
    try {
      const tasks = await this.integrationService.getTodaysTasks();
      tasks.forEach(task => {
        // Create task elements similar to addNewTask but for existing tasks
        this.renderExistingTask(task, taskList);
      });
    } catch (error) {
      console.error('Failed to load tasks from vault:', error);
    }
  }

  private renderExistingTask(task: any, taskList: HTMLElement) {
    const taskItem = taskList.createEl('div', { cls: 'task-item' });
    if (task.completed) taskItem.classList.add('completed');

    const checkbox = taskItem.createEl('input', {
      type: 'checkbox',
      cls: 'task-checkbox'
    }) as HTMLInputElement;
    checkbox.checked = task.completed;
    const taskContent = taskItem.createEl('div', { cls: 'task-content' });
    const taskTitle = taskContent.createEl('div', { cls: 'task-title', text: task.title });

    const taskMeta = taskContent.createEl('div', { cls: 'task-meta' });
    taskMeta.createEl('span', { cls: 'task-priority', text: task.priority || 'Normal' });
    taskMeta.createEl('span', { cls: 'task-time', text: `~${task.estimatedMinutes || 25}min` });

    // Actions
    const actions = taskItem.createEl('div', { cls: 'task-actions' });
    const breakdownBtn = actions.createEl('button', { cls: 'task-action-btn', text: '🔨' });
    const deleteBtn = actions.createEl('button', { cls: 'task-action-btn delete', text: '🗑️' });

    // Event handlers
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        taskItem.classList.add('completed');
        this.completeTask(task.title);
      } else {
        taskItem.classList.remove('completed');
      }
      this.updateTaskStats();
    });

    breakdownBtn.addEventListener('click', () => {
      this.breakdownTask(task.title);
    });

    deleteBtn.addEventListener('click', () => {
      taskItem.remove();
      this.updateTaskStats();
    });
  }

  private updateTaskStats() {
    const taskItems = this.containerEl.querySelectorAll('.task-item');
    const completedTasks = this.containerEl.querySelectorAll('.task-item.completed');
    const activeTasks = taskItems.length - completedTasks.length;

    // Calculate urgent tasks (you can define urgency logic)
    const urgentTasks = this.containerEl.querySelectorAll('.task-item .task-priority').length; // placeholder

    // Update stat displays
    const statCards = this.containerEl.querySelectorAll('.stat-card');
    if (statCards.length >= 3) {
      (statCards[0].querySelector('.stat-number') as HTMLElement).textContent = completedTasks.length.toString();
      (statCards[1].querySelector('.stat-number') as HTMLElement).textContent = activeTasks.toString();
      (statCards[2].querySelector('.stat-number') as HTMLElement).textContent = '0'; // urgent placeholder
    }
  }

  private async completeTask(taskTitle: string) {
    try {
      await this.integrationService.completeTask(taskTitle);
      new Notice(`✅ Task completed: ${taskTitle}`);
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  }

  private async breakdownTask(taskTitle: string) {
    try {
      const breakdown = await this.integrationService.breakdownTask(taskTitle, {
        energyLevel: this.currentEnergyLevel,
        depth: 2
      });

      if (breakdown && breakdown.steps) {
        new Notice(`🔨 Task broken down into ${breakdown.steps.length} steps`);
        // You could add the sub-tasks to the list here
      }
    } catch (error) {
      console.error('Failed to breakdown task:', error);
      new Notice('Failed to breakdown task. Check your OpenAI API key.');
    }
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

  private renderBrowserSyncSection(container: HTMLElement) {
    const syncSection = container.createEl('div', { cls: 'browser-sync-section' });
    syncSection.createEl('h3', { text: '🔄 Browser Extension Sync' });

    // Sync status indicator
    const statusDiv = syncSection.createEl('div', { cls: 'sync-status' });
    const statusIcon = statusDiv.createEl('span', { cls: 'sync-status-icon', text: '🟡' });
    const statusText = statusDiv.createEl('span', { cls: 'sync-status-text', text: 'Checking sync status...' });

    // Sync info box
    const infoBox = syncSection.createEl('div', { cls: 'sync-info-box' });
    const infoTitle = infoBox.createEl('div', { cls: 'sync-info-title', text: 'How Browser Sync Works' });
    const infoList = infoBox.createEl('ul', { cls: 'sync-info-list' });

    infoList.createEl('li', { text: '✅ Tasks sync automatically between Obsidian and browser extension' });
    infoList.createEl('li', { text: '🔋 Energy levels are shared across both platforms' });
    infoList.createEl('li', { text: '⏱️ Focus sessions sync in real-time' });
    infoList.createEl('li', { text: '🎯 Enforcement settings apply to both apps' });

    // Manual sync button
    const syncButton = syncSection.createEl('button', {
      cls: 'sync-button',
      text: '🔄 Sync Now'
    });

    // Last sync time display
    const lastSyncDiv = syncSection.createEl('div', { cls: 'last-sync' });
    lastSyncDiv.createEl('span', {
      cls: 'last-sync-text',
      text: 'Last sync: Never'
    });

    // Event handler for manual sync
    syncButton.addEventListener('click', async () => {
      syncButton.textContent = '🔄 Syncing...';
      syncButton.disabled = true;

      try {
        // Trigger manual sync
        await this.performBrowserSync();

        // Update UI
        statusIcon.textContent = '🟢';
        statusText.textContent = 'Sync successful';
        lastSyncDiv.querySelector('.last-sync-text')!.textContent =
          `Last sync: ${new Date().toLocaleTimeString()}`;

        // Show success feedback
        new Notice('✅ Browser extension sync completed');
      } catch (error) {
        statusIcon.textContent = '🔴';
        statusText.textContent = 'Sync failed';
        console.error('Manual sync failed:', error);
        new Notice('❌ Sync failed. Check console for details.');
      } finally {
        syncButton.textContent = '🔄 Sync Now';
        syncButton.disabled = false;
      }
    });

    // Check initial sync status
    this.checkSyncStatus(statusIcon, statusText, lastSyncDiv);
  }

  private async performBrowserSync() {
    // Get current state from Obsidian
    const obsidianData = {
      tasks: await this.integrationService.getTodaysTasks(),
      energyLevel: this.currentEnergyLevel,
      timestamp: Date.now(),
      source: 'obsidian'
    };

    // Store in localStorage for browser extension to read
    try {
      localStorage.setItem('proactivity-obsidian-sync', JSON.stringify(obsidianData));

      // Also try to read any data from browser extension
      const browserData = localStorage.getItem('proactivity-browser-sync');
      if (browserData) {
        const parsed = JSON.parse(browserData);
        console.log('Received data from browser extension:', parsed);

        // Merge browser extension tasks if they're newer
        if (parsed.timestamp > (obsidianData.timestamp - 60000)) { // Within last minute
          // Could merge tasks here if needed
          console.log('Browser extension data is recent, considering merge');
        }
      }

      // Send to backend if available
      if (this.apiClient) {
        await this.apiClient.updateEnergyLevel(this.currentEnergyLevel);
      }

      console.log('Browser sync completed successfully');
    } catch (error) {
      console.error('Browser sync failed:', error);
      throw error;
    }
  }

  private startBrowserSync() {
    console.log('Starting browser extension sync in ProactivityView...');

    // Initial sync
    this.readBrowserExtensionData();

    // Set up periodic sync
    const syncIntervalMs = this.settings.browserExtensionSync.syncInterval * 60 * 1000;
    this.syncInterval = setInterval(() => {
      this.readBrowserExtensionData();
    }, syncIntervalMs);
  }

  private async readBrowserExtensionData() {
    try {
      const browserData = localStorage.getItem('proactivity-browser-sync');
      if (browserData) {
        const parsed = JSON.parse(browserData);

        // Only process recent data (within last 5 minutes)
        if (parsed.timestamp && (Date.now() - parsed.timestamp) < 300000) {
          console.log('Reading recent data from browser extension:', parsed);

          // Update tasks if browser extension has newer data
          if (parsed.tasks && Array.isArray(parsed.tasks)) {
            // Add browser tasks to our task list
            for (const browserTask of parsed.tasks) {
              if (!browserTask.id || browserTask.source === 'obsidian') continue;

              try {
                await this.integrationService.addTaskToVault(browserTask.title || browserTask.text, browserTask.priority);
                console.log(`Added task from browser: ${browserTask.title}`);
              } catch (error) {
                console.error('Failed to add browser task to vault:', error);
              }
            }

            // Refresh the task list in UI
            this.loadTasksFromVault(this.containerEl.querySelector('.task-list'));
            this.updateTaskStats();
          }

          // Update energy level if different
          if (parsed.energyLevel && parsed.energyLevel !== this.currentEnergyLevel) {
            this.currentEnergyLevel = parsed.energyLevel;
            console.log(`Updated energy level from browser: ${parsed.energyLevel}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to read browser extension data:', error);
    }
  }

  private checkSyncStatus(statusIcon: HTMLElement, statusText: HTMLElement, lastSyncDiv: HTMLElement) {
    try {
      const syncData = localStorage.getItem('proactivity-obsidian-sync');
      if (syncData) {
        const parsed = JSON.parse(syncData);
        const lastSync = new Date(parsed.timestamp);
        const minutesAgo = Math.floor((Date.now() - parsed.timestamp) / (1000 * 60));

        if (minutesAgo < 5) {
          statusIcon.textContent = '🟢';
          statusText.textContent = 'Recently synced';
        } else if (minutesAgo < 30) {
          statusIcon.textContent = '🟡';
          statusText.textContent = 'Sync available';
        } else {
          statusIcon.textContent = '🟠';
          statusText.textContent = 'Sync recommended';
        }

        lastSyncDiv.querySelector('.last-sync-text')!.textContent =
          `Last sync: ${lastSync.toLocaleTimeString()}`;
      } else {
        statusIcon.textContent = '🔴';
        statusText.textContent = 'Never synced';
        lastSyncDiv.querySelector('.last-sync-text')!.textContent = 'Last sync: Never';
      }
    } catch (error) {
      statusIcon.textContent = '❓';
      statusText.textContent = 'Sync status unknown';
      console.error('Failed to check sync status:', error);
    }
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

  private openAIProjectPlanningModal() {
    const modal = new Modal(this.app);

    modal.onOpen = () => {
        const { contentEl } = modal;
        contentEl.empty();
        contentEl.addClass('ai-planning-modal');

        // Add custom styles
        const style = contentEl.createEl('style');
        style.textContent = `
          .ai-planning-modal {
            max-width: 700px !important;
            max-height: 80vh !important;
          }
          .planning-header {
            text-align: center;
            margin-bottom: 24px;
          }
          .planning-input {
            width: 100%;
            min-height: 120px;
            padding: 16px;
            border: 2px solid var(--background-modifier-border);
            border-radius: 8px;
            font-size: 14px;
            font-family: inherit;
            resize: vertical;
            margin-bottom: 16px;
          }
          .planning-input:focus {
            border-color: var(--interactive-accent);
            box-shadow: 0 0 0 3px rgba(var(--interactive-accent-rgb), 0.1);
          }
          .planning-buttons {
            display: flex;
            gap: 12px;
            justify-content: center;
          }
          .planning-btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          .planning-btn.primary {
            background: var(--interactive-accent);
            color: white;
          }
          .planning-btn.primary:hover {
            background: var(--interactive-accent-hover);
          }
          .planning-btn.secondary {
            background: var(--background-secondary);
            color: var(--text-normal);
          }
          .planning-btn.secondary:hover {
            background: var(--background-modifier-hover);
          }
          .planning-output {
            margin-top: 24px;
            padding: 16px;
            background: var(--background-secondary);
            border-radius: 8px;
            white-space: pre-wrap;
            max-height: 300px;
            overflow-y: auto;
          }
        `;

        // Header
        const header = contentEl.createEl('div', { cls: 'planning-header' });
        header.createEl('h2', { text: '🤖 AI Project Planning Assistant' });
        header.createEl('p', { text: 'Describe your project or goal and I\'ll help you break it down into actionable steps.' });

        // Input area
        const inputArea = contentEl.createEl('textarea', {
          cls: 'planning-input',
          placeholder: 'Describe your project in natural language...\n\nFor example:\n• "I need to write my dissertation chapter on machine learning"\n• "I want to build a mobile app for tracking habits"\n• "I need to organize a team retreat for 20 people"'
        }) as HTMLTextAreaElement;

        // Buttons
        const buttonsDiv = contentEl.createEl('div', { cls: 'planning-buttons' });
        const planButton = buttonsDiv.createEl('button', { cls: 'planning-btn primary', text: '🚀 Create Project Plan' });
        const cancelButton = buttonsDiv.createEl('button', { cls: 'planning-btn secondary', text: 'Cancel' });

        // Output area (initially hidden)
        let outputDiv: HTMLDivElement;

        // Event handlers
        const self = this;
        planButton.onclick = async () => {
          const projectDescription = inputArea.value.trim();
          if (!projectDescription) {
            new Notice('Please describe your project first');
            inputArea.focus();
            return;
          }

          // Show loading state
          planButton.textContent = '🤖 AI is planning...';
          planButton.disabled = true;

          try {
            // Call AI planning service
            const planResult = await self.integrationService.generateProjectPlan(
              projectDescription,
              self.currentEnergyLevel
            );

            // Create output area if it doesn't exist
            if (!outputDiv) {
              outputDiv = contentEl.createEl('div', { cls: 'planning-output' });
            }

            // Display the AI-generated plan
            outputDiv.innerHTML = `
              <h3>📋 Generated Project Plan</h3>
              <p><strong>Project:</strong> ${planResult.title || projectDescription}</p>
              ${planResult.motivation ? `<p><strong>Motivation:</strong> ${planResult.motivation}</p>` : ''}

              <h4>🎯 Action Steps:</h4>
              <ol>
                ${planResult.steps.map(step => `
                  <li>
                    <strong>${step.title}</strong>
                    <em>(${step.estimatedMinutes} min)</em>
                    ${step.description ? `<br><small>${step.description}</small>` : ''}
                  </li>
                `).join('')}
              </ol>

              <div style="margin-top: 16px;">
                <button class="planning-btn primary" id="add-all-steps">📋 Add All Steps to Vault</button>
              </div>
            `;

            // Add handler for adding steps to vault
            outputDiv.querySelector('#add-all-steps')?.addEventListener('click', async () => {
              try {
                for (const step of planResult.steps) {
                  await self.integrationService.addTaskToVault(
                    `${step.title} (${step.estimatedMinutes}min)`,
                    step.priority || 'medium'
                  );
                }
                new Notice(`Added ${planResult.steps.length} tasks to your vault!`);
                modal.close();
              } catch (error) {
                console.error('Failed to add tasks to vault:', error);
                new Notice('Failed to add tasks to vault');
              }
            });

          } catch (error) {
            console.error('AI planning failed:', error);
            new Notice('AI planning failed. Please check your API key in settings.');

            if (!outputDiv) {
              outputDiv = contentEl.createEl('div', { cls: 'planning-output' });
            }
            outputDiv.textContent = '❌ AI planning failed. Please check your OpenAI API key in plugin settings and try again.';
          } finally {
            // Reset button
            planButton.textContent = '🚀 Create Project Plan';
            planButton.disabled = false;
          }
        };

        cancelButton.onclick = () => modal.close();

        // Auto-focus input
        setTimeout(() => inputArea.focus(), 100);
    };

    modal.onClose = () => {
      const { contentEl } = modal;
      contentEl.empty();
    };

    modal.open();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}