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
    
    // Header with controls
    const header = dashboardSection.createEl('div', { cls: 'dashboard-header' });
    header.createEl('h3', { text: '📋 Task Dashboard' });
    
    const headerControls = header.createEl('div', { cls: 'header-controls' });
    const syncBtn = headerControls.createEl('button', { cls: 'sync-btn', text: '🔄' });
    const filterBtn = headerControls.createEl('button', { cls: 'filter-btn', text: '🏷️' });
    
    // Enhanced stats row with more metrics
    const statsRow = dashboardSection.createEl('div', { cls: 'stats-row' });

    const completedStat = statsRow.createEl('div', { cls: 'stat-card completed' });
    completedStat.createEl('div', { cls: 'stat-number', text: '0' });
    completedStat.createEl('div', { cls: 'stat-label', text: 'Completed Today' });

    const activeStat = statsRow.createEl('div', { cls: 'stat-card active' });
    activeStat.createEl('div', { cls: 'stat-number', text: '0' });
    activeStat.createEl('div', { cls: 'stat-label', text: 'In Progress' });

    const urgentStat = statsRow.createEl('div', { cls: 'stat-card urgent' });
    urgentStat.createEl('div', { cls: 'stat-number', text: '0' });
    urgentStat.createEl('div', { cls: 'stat-label', text: 'High Priority' });

    const totalTimeStat = statsRow.createEl('div', { cls: 'stat-card time' });
    totalTimeStat.createEl('div', { cls: 'stat-number', text: '0h' });
    totalTimeStat.createEl('div', { cls: 'stat-label', text: 'Est. Time' });

    // Enhanced task input section
    const inputSection = dashboardSection.createEl('div', { cls: 'task-input-section' });
    
    const inputRow = inputSection.createEl('div', { cls: 'input-row' });
    const taskInput = inputRow.createEl('input', {
      cls: 'task-input',
      placeholder: 'What would you like to accomplish?',
      type: 'text'
    }) as HTMLInputElement;

    const prioritySelect = inputRow.createEl('select', { cls: 'priority-select' }) as HTMLSelectElement;
    prioritySelect.innerHTML = `
      <option value="low">Low Priority</option>
      <option value="medium" selected>Medium Priority</option>
      <option value="high">High Priority</option>
    `;

    const timeInput = inputRow.createEl('input', {
      cls: 'time-input',
      type: 'number',
      placeholder: '25',
      title: 'Estimated minutes'
    }) as HTMLInputElement;
    timeInput.value = '25';

    const addButton = inputRow.createEl('button', {
      cls: 'add-task-btn',
      text: '+ Add Task'
    });

    // Quick action buttons
    const quickActions = dashboardSection.createEl('div', { cls: 'quick-actions-bar' });
    
    const planningBtn = quickActions.createEl('button', { cls: 'quick-btn planning', text: '🤖 AI Planning' });
    const breakdownBtn = quickActions.createEl('button', { cls: 'quick-btn breakdown', text: '🔨 Break Down' });
    const bulkBtn = quickActions.createEl('button', { cls: 'quick-btn bulk', text: '⚡ Bulk Actions' });
    const importBtn = quickActions.createEl('button', { cls: 'quick-btn import', text: '📥 Import' });

    // Filter and view controls
    const viewControls = dashboardSection.createEl('div', { cls: 'view-controls' });
    
    const filterTabs = viewControls.createEl('div', { cls: 'filter-tabs' });
    const allTab = filterTabs.createEl('button', { cls: 'filter-tab active', text: 'All Tasks' });
    const todoTab = filterTabs.createEl('button', { cls: 'filter-tab', text: 'To Do' });
    const inProgressTab = filterTabs.createEl('button', { cls: 'filter-tab', text: 'In Progress' });
    const completedTab = filterTabs.createEl('button', { cls: 'filter-tab', text: 'Completed' });
    
    const viewModes = viewControls.createEl('div', { cls: 'view-modes' });
    const listViewBtn = viewModes.createEl('button', { cls: 'view-btn active', text: '📋' });
    const timelineViewBtn = viewModes.createEl('button', { cls: 'view-btn', text: '📅' });
    const kanbanViewBtn = viewModes.createEl('button', { cls: 'view-btn', text: '📊' });

    // Enhanced task list container
    const taskListContainer = dashboardSection.createEl('div', { cls: 'task-list-container' });
    
    // Task list header
    const taskListHeader = taskListContainer.createEl('div', { cls: 'task-list-header' });
    const selectAllCheckbox = taskListHeader.createEl('input', { type: 'checkbox', cls: 'select-all-checkbox' });
    const headerTitle = taskListHeader.createEl('div', { cls: 'header-title', text: 'Task' });
    const headerPriority = taskListHeader.createEl('div', { cls: 'header-priority', text: 'Priority' });
    const headerTime = taskListHeader.createEl('div', { cls: 'header-time', text: 'Time' });
    const headerActions = taskListHeader.createEl('div', { cls: 'header-actions', text: 'Actions' });

    const taskList = taskListContainer.createEl('div', { cls: 'task-list' });

    // Load external tasks (from browser extension)
    this.loadExternalTasks(taskList);

    // Event handlers
    const addTask = () => {
      const taskText = taskInput.value.trim();
      const priority = prioritySelect.value as 'low' | 'medium' | 'high';
      const estimatedMinutes = parseInt(timeInput.value) || 25;
      
      if (taskText) {
        this.addNewTask(taskText, taskList, estimatedMinutes, priority);
        taskInput.value = '';
        timeInput.value = '25';
        prioritySelect.value = 'medium';
        this.updateTaskStats();
      }
    };

    // Add event listeners
    addButton.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addTask();
      }
    });

    // Sync button functionality
    syncBtn.addEventListener('click', async () => {
      syncBtn.textContent = '⏳';
      syncBtn.disabled = true;
      
      try {
        await this.performManualSync();
        this.refreshTaskList(taskList);
        new Notice('✅ Tasks synced successfully');
      } catch (error) {
        new Notice('❌ Sync failed');
        console.error('Sync failed:', error);
      } finally {
        syncBtn.textContent = '🔄';
        syncBtn.disabled = false;
      }
    });

    // Filter tab functionality
    [allTab, todoTab, inProgressTab, completedTab].forEach((tab, index) => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs
        filterTabs.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Apply filter
        const filters = ['all', 'todo', 'in-progress', 'completed'];
        this.filterTasks(taskList, filters[index]);
      });
    });

    // Quick action handlers
    planningBtn.addEventListener('click', () => {
      const modal = new (require('./task-breakdown-modal').TaskBreakdownModal)(
        this.app,
        this.settings,
        this.integrationService
      );
      modal.open();
    });

    breakdownBtn.addEventListener('click', () => {
      this.showBulkBreakdownInterface(taskList);
    });

    bulkBtn.addEventListener('click', () => {
      this.showBulkActionsInterface(taskList);
    });

    importBtn.addEventListener('click', () => {
      this.showImportInterface();
    });

    // Load existing tasks
    this.loadTasksFromVault(taskList);
    this.updateTaskStats();
  }

  private async addNewTask(taskText: string, taskList: HTMLElement, estimatedMinutes: number = 25, priority: string = 'medium') {
    const now = new Date();
    
    // Create a task object that matches extension format
    const taskObject = {
      id: Date.now().toString(),
      title: taskText,
      description: '',
      priority: priority,
      status: 'todo',
      completed: false,
      
      // Time tracking (compatible with extension)
      startTime: null,
      endTime: null,
      scheduledStartTime: null,
      scheduledEndTime: null,
      estimatedMinutes: estimatedMinutes,
      actualMinutes: 0,
      
      // Metadata
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: null,
      energyLevel: this.currentEnergyLevel,
      
      // ADHD-specific (compatible with extension)
      procrastinationScore: 0,
      motivationBooster: 'You\'ve got this! 💪',
      adhdOptimized: true,
      
      // Sync metadata
      source: 'obsidian',
      syncStatus: 'pending',
      lastSyncTime: now.toISOString(),
      
      // Dependencies
      dependencies: [],
      blocked: false,
      blockingReason: ''
    };

    // Add to local tasks array
    this.todaysTasks.unshift(taskObject);

    // Create task element
    const taskItem = taskList.createEl('div', { cls: 'task-item' });
    taskItem.dataset.taskId = taskObject.id;
    
    const checkbox = taskItem.createEl('input', { type: 'checkbox', cls: 'task-checkbox' });
    const taskContent = taskItem.createEl('div', { cls: 'task-content' });
    const taskTitle = taskContent.createEl('div', { cls: 'task-title', text: taskText });
    const taskMeta = taskContent.createEl('div', { cls: 'task-meta' });

    // Priority and time estimate
    const prioritySpan = taskMeta.createEl('span', { cls: `task-priority priority-${priority}`, text: priority.charAt(0).toUpperCase() + priority.slice(1) });
    const timeEstimate = taskMeta.createEl('span', { cls: 'task-time', text: `~${estimatedMinutes}min` });

    // Actions
    const actions = taskItem.createEl('div', { cls: 'task-actions' });
    const breakdownBtn = actions.createEl('button', { cls: 'task-action-btn', text: '🔨', title: 'Break down task' });
    const editBtn = actions.createEl('button', { cls: 'task-action-btn', text: '✏️', title: 'Edit task' });
    const deleteBtn = actions.createEl('button', { cls: 'task-action-btn delete', text: '🗑️', title: 'Delete task' });

    // Event handlers
    checkbox.addEventListener('change', async () => {
      if (checkbox.checked) {
        taskItem.classList.add('completed');
        taskObject.completed = true;
        taskObject.status = 'done';
        taskObject.completedAt = new Date().toISOString();
        taskObject.updatedAt = new Date().toISOString();
        this.completeTask(taskText);
      } else {
        taskItem.classList.remove('completed');
        taskObject.completed = false;
        taskObject.status = 'todo';
        taskObject.completedAt = null;
        taskObject.updatedAt = new Date().toISOString();
      }
      
      // Update local storage and sync
      await this.syncTaskUpdate(taskObject);
      this.updateTaskStats();
    });

    breakdownBtn.addEventListener('click', () => {
      this.breakdownTask(taskText);
    });

    editBtn.addEventListener('click', async () => {
      const newTitle = await this.showTaskEditModal(taskObject);
      if (newTitle && newTitle !== taskObject.title) {
        taskObject.title = newTitle;
        taskObject.updatedAt = new Date().toISOString();
        taskTitle.textContent = newTitle;
        await this.syncTaskUpdate(taskObject);
      }
    });

    deleteBtn.addEventListener('click', async () => {
      if (confirm(`Delete task: "${taskText}"?`)) {
        taskItem.remove();
        this.todaysTasks = this.todaysTasks.filter(t => t.id !== taskObject.id);
        await this.syncTaskDelete(taskObject);
        this.updateTaskStats();
      }
    });

    // Sync with backend and browser extension
    try {
      await this.syncTaskUpdate(taskObject);
      await this.integrationService.addTaskToVault(taskText, priority);
    } catch (error) {
      console.error('Failed to sync new task:', error);
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
        
        // Display the subtasks in a dedicated section
        this.displayTaskBreakdown(taskTitle, breakdown);
      }
    } catch (error) {
      console.error('Failed to breakdown task:', error);
      new Notice('Failed to breakdown task. Check your OpenAI API key.');
    }
  }

  private displayTaskBreakdown(originalTask: string, breakdown: any) {
    // Find or create the breakdown display section
    const container = this.containerEl.children[1] as HTMLElement;
    let breakdownSection = container.querySelector('.task-breakdown-section') as HTMLElement;
    
    if (!breakdownSection) {
      // Create new breakdown section
      breakdownSection = container.createEl('div', { cls: 'task-breakdown-section' });
      breakdownSection.createEl('h3', { text: '🔨 Task Breakdown' });
    } else {
      // Clear existing breakdown content
      const content = breakdownSection.querySelector('.breakdown-content');
      if (content) content.remove();
    }

    const breakdownContent = breakdownSection.createEl('div', { cls: 'breakdown-content' });
    
    // Original task title
    const originalTaskEl = breakdownContent.createEl('div', { cls: 'original-task' });
    originalTaskEl.createEl('h4', { text: `Original Task: ${originalTask}` });
    
    // Motivation (if provided)
    if (breakdown.motivation) {
      const motivationEl = breakdownContent.createEl('div', { cls: 'breakdown-motivation' });
      motivationEl.createEl('p', { 
        text: `💪 ${breakdown.motivation}`,
        cls: 'motivation-text'
      });
    }
    
    // Subtasks list
    const subtasksList = breakdownContent.createEl('div', { cls: 'subtasks-list' });
    subtasksList.createEl('h4', { text: 'Subtasks:' });
    
    breakdown.steps.forEach((step: any, index: number) => {
      const stepEl = subtasksList.createEl('div', { cls: 'subtask-item' });
      
      // Step number and title
      const stepHeader = stepEl.createEl('div', { cls: 'subtask-header' });
      stepHeader.createEl('span', { 
        text: `${index + 1}. ${step.title || step.description || step}`,
        cls: 'subtask-title'
      });
      
      // Step details if available
      if (step.description && step.title !== step.description) {
        stepEl.createEl('p', { 
          text: step.description,
          cls: 'subtask-description'
        });
      }
      
      // Time estimate if available
      if (step.estimatedMinutes || step.timeEstimate) {
        const timeEstimate = step.estimatedMinutes || step.timeEstimate;
        stepEl.createEl('span', { 
          text: `⏱️ ~${timeEstimate} min`,
          cls: 'subtask-time'
        });
      }
      
      // Action buttons for each subtask
      const actions = stepEl.createEl('div', { cls: 'subtask-actions' });
      
      // Add to tasks button
      const addBtn = actions.createEl('button', { 
        text: '➕ Add to Tasks',
        cls: 'subtask-action-btn'
      });
      addBtn.addEventListener('click', async () => {
        await this.addSubtaskToTasks(step);
        new Notice(`Added "${step.title || step.description || step}" to your task list`);
      });
      
      // Mark complete button
      const completeBtn = actions.createEl('button', { 
        text: '✅ Complete',
        cls: 'subtask-action-btn'
      });
      completeBtn.addEventListener('click', () => {
        stepEl.classList.add('completed');
        completeBtn.disabled = true;
        completeBtn.textContent = '✅ Done';
      });
    });
    
    // Clear breakdown button
    const clearBtn = breakdownContent.createEl('button', { 
      text: '🗑️ Clear Breakdown',
      cls: 'clear-breakdown-btn'
    });
    clearBtn.addEventListener('click', () => {
      breakdownSection.remove();
    });
  }

  private async addSubtaskToTasks(step: any) {
    const task = {
      id: Date.now().toString(),
      title: step.title || step.description || step,
      description: step.description && step.title !== step.description ? step.description : '',
      priority: 'medium',
      status: 'todo',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedMinutes: step.estimatedMinutes || step.timeEstimate || 30,
      source: 'obsidian-breakdown'
    };

    // Add to local task list
    this.todaysTasks.unshift(task);
    
    // Sync with backend and extension
    try {
      // Add to Obsidian vault
      await this.integrationService.addTaskToVault(task.title, task.priority);
    } catch (error) {
      console.error('Failed to sync subtask:', error);
    }
    
    // Refresh the UI
    await this.loadTodaysTasks();
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
    // Open task breakdown modal/interface
    const modal = new (require('./task-breakdown-modal').TaskBreakdownModal)(
      this.app,
      this.settings,
      this.integrationService
    );
    modal.open();
  }

  private startBodyDoubling() {
    // Activate body doubling mode - show encouragement and set up gentle reminders
    new Notice('🤝 Body doubling mode activated! I\'ll check on you periodically.', 5000);
    
    // Set up gentle check-ins every 15 minutes
    const checkInInterval = setInterval(() => {
      const encouragements = [
        'Still working hard! 🎯',
        'You\'re doing great! Keep going! 💪',
        'I\'m here with you. Stay focused! 🤝',
        'Making progress one step at a time! 🌟',
        'Your effort is paying off! 📈'
      ];
      
      const message = encouragements[Math.floor(Math.random() * encouragements.length)];
      new Notice(message, 3000);
    }, 15 * 60 * 1000); // 15 minutes
    
    // Stop after 2 hours
    setTimeout(() => {
      clearInterval(checkInInterval);
      new Notice('Body doubling session complete! Great work today! 🎉', 5000);
    }, 2 * 60 * 60 * 1000);
  }

  private startBreathingExercise() {
    // Guide through breathing exercise
    const energyLevel = typeof this.currentEnergyLevel === 'string' ? 3 : this.currentEnergyLevel;
    const modal = new BreathingModal(this.app, this.integrationService, energyLevel);
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
    // Trigger procrastination intervention with ADHD-friendly strategies
    const helpStrategies = [
      {
        title: '2-Minute Rule',
        message: 'If it takes less than 2 minutes, do it now! What\'s one tiny step you can take?',
        action: 'Start the smallest possible piece'
      },
      {
        title: 'Body Reset',
        message: 'Stand up, stretch, or do 5 jumping jacks to reset your energy!',
        action: 'Physical movement first'
      },
      {
        title: 'Timer Trick',
        message: 'Set a 10-minute timer and work on ANYTHING related to your task.',
        action: 'Just 10 minutes'
      },
      {
        title: 'Accountability',
        message: 'Text someone what you\'re about to work on. Commitment helps!',
        action: 'Tell someone your next step'
      },
      {
        title: 'Environment Change',
        message: 'Move to a different location - even a different chair can help!',
        action: 'Change your physical space'
      }
    ];

    const strategy = helpStrategies[Math.floor(Math.random() * helpStrategies.length)];
    
    // Create a helping modal or notice
    new Notice(`🆘 ${strategy.title}: ${strategy.message}`, 8000);
    
    // Log for pattern detection
    console.log('Procrastination help triggered:', strategy.title);
  }

  private showTimeAnchor() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    new Notice(`🕐 Time anchor: It's currently ${timeString}`);
  }

  private overwhelmReset() {
    // Help user reset when overwhelmed with ADHD-friendly techniques
    new Notice('🔄 Taking a moment to reset... Breathe deeply.', 3000);
    
    // Simple reset protocol
    setTimeout(() => {
      new Notice('💭 What\'s ONE thing that feels manageable right now?', 5000);
    }, 3000);
    
    setTimeout(() => {
      const resetPrompts = [
        'Remember: You don\'t have to do everything at once',
        'Your brain works differently, and that\'s your superpower',
        'Progress over perfection, always',
        'It\'s okay to take breaks when you need them',
        'You\'ve handled tough moments before'
      ];
      
      const prompt = resetPrompts[Math.floor(Math.random() * resetPrompts.length)];
      new Notice(`💝 ${prompt}`, 7000);
    }, 8000);
    
    // Offer to break down the overwhelming task
    setTimeout(() => {
      new Notice('💡 Would you like me to help break down a task into smaller steps?', 6000);
    }, 15000);
  }

  private celebrateProgress() {
    // Celebrate user's progress
    console.log('Celebrating progress');
  }

  private async loadTodaysTasks() {
    this.todaysTasks = await this.integrationService.getTodaysTasks();
  }

  // Sync helper methods
  private async syncTaskUpdate(taskObject: any) {
    try {
      // Store in local browser extension format for sync
      const browserTasks = JSON.parse(localStorage.getItem('proactivity-obsidian-tasks') || '[]');
      const existingIndex = browserTasks.findIndex((t: any) => t.id === taskObject.id);
      
      if (existingIndex >= 0) {
        browserTasks[existingIndex] = taskObject;
      } else {
        browserTasks.unshift(taskObject);
      }
      
      localStorage.setItem('proactivity-obsidian-tasks', JSON.stringify(browserTasks));
      
      // Also sync to backend if available
      if (this.apiClient) {
        // Note: We'll need to implement backend sync in the API client
        console.log('Syncing task to backend:', taskObject.title);
      }
    } catch (error) {
      console.error('Failed to sync task update:', error);
    }
  }

  private async syncTaskDelete(taskObject: any) {
    try {
      // Remove from local storage
      const browserTasks = JSON.parse(localStorage.getItem('proactivity-obsidian-tasks') || '[]');
      const filtered = browserTasks.filter((t: any) => t.id !== taskObject.id);
      localStorage.setItem('proactivity-obsidian-tasks', JSON.stringify(filtered));
      
      console.log('Syncing task deletion:', taskObject.title);
    } catch (error) {
      console.error('Failed to sync task deletion:', error);
    }
  }

  private async showTaskEditModal(taskObject: any): Promise<string | null> {
    const newTitle = prompt('Edit task title:', taskObject.title);
    return newTitle && newTitle.trim() !== '' ? newTitle.trim() : null;
  }

  // Dashboard helper methods
  private async loadExternalTasks(taskList: HTMLElement) {
    try {
      // Load tasks from browser extension storage
      const browserTasks = JSON.parse(localStorage.getItem('proactivity-obsidian-tasks') || '[]');
      
      // Also try to fetch from backend
      if (this.apiClient) {
        try {
          const response = await fetch('http://localhost:3001/api/sync/pull?source=obsidian');
          if (response.ok) {
            const result = await response.json();
            const backendTasks = result.data || [];
            
            // Merge browser and backend tasks
            const allExternalTasks = [...browserTasks];
            backendTasks.forEach((backendTask: any) => {
              const exists = allExternalTasks.find(t => t.id === backendTask.id);
              if (!exists) {
                allExternalTasks.push(this.convertBackendTaskToLocal(backendTask));
              }
            });
            
            this.displayExternalTasks(allExternalTasks, taskList);
          }
        } catch (error) {
          console.warn('Backend not available, showing local tasks only');
          this.displayExternalTasks(browserTasks, taskList);
        }
      } else {
        this.displayExternalTasks(browserTasks, taskList);
      }
    } catch (error) {
      console.error('Failed to load external tasks:', error);
    }
  }

  private convertBackendTaskToLocal(backendTask: any): any {
    return {
      id: backendTask.id,
      title: backendTask.title,
      description: backendTask.description,
      priority: backendTask.priority || 'medium',
      status: backendTask.completed ? 'done' : 'todo',
      completed: backendTask.completed || false,
      estimatedMinutes: backendTask.estimatedMinutes || 30,
      actualMinutes: backendTask.actualMinutes || 0,
      createdAt: backendTask.createdAt,
      updatedAt: backendTask.updatedAt,
      source: backendTask.source || 'extension',
      syncStatus: 'synced'
    };
  }

  private displayExternalTasks(tasks: any[], taskList: HTMLElement) {
    tasks.forEach(task => {
      if (!task.completed || task.status !== 'done') { // Only show non-completed tasks
        this.addTaskToList(task, taskList);
      }
    });
  }

  private addTaskToList(taskObject: any, taskList: HTMLElement) {
    const taskItem = taskList.createEl('div', { cls: 'task-item enhanced-task' });
    taskItem.dataset.taskId = taskObject.id;
    
    // Checkbox
    const checkbox = taskItem.createEl('input', { type: 'checkbox', cls: 'task-checkbox' });
    checkbox.checked = taskObject.completed;
    if (taskObject.completed) taskItem.classList.add('completed');
    
    // Task content
    const taskContent = taskItem.createEl('div', { cls: 'task-content' });
    const taskTitle = taskContent.createEl('div', { cls: 'task-title', text: taskObject.title });
    
    if (taskObject.description) {
      const taskDesc = taskContent.createEl('div', { cls: 'task-description', text: taskObject.description });
    }
    
    // Priority badge
    const priority = taskItem.createEl('div', { cls: `priority-badge priority-${taskObject.priority}` });
    priority.textContent = (taskObject.priority || 'medium').charAt(0).toUpperCase();
    
    // Time estimate
    const timeEstimate = taskItem.createEl('div', { cls: 'time-estimate' });
    timeEstimate.textContent = `${taskObject.estimatedMinutes || 25}m`;
    
    // Actions
    const actions = taskItem.createEl('div', { cls: 'task-actions' });
    const editBtn = actions.createEl('button', { cls: 'task-action-btn', text: '✏️', title: 'Edit' });
    const breakdownBtn = actions.createEl('button', { cls: 'task-action-btn', text: '🔨', title: 'Break down' });
    const deleteBtn = actions.createEl('button', { cls: 'task-action-btn delete', text: '🗑️', title: 'Delete' });
    
    // Source indicator
    if (taskObject.source && taskObject.source !== 'obsidian') {
      const sourceIndicator = taskItem.createEl('div', { cls: 'source-indicator' });
      sourceIndicator.textContent = taskObject.source === 'extension' ? '🌐' : '📱';
      sourceIndicator.title = `From ${taskObject.source}`;
    }

    // Event handlers
    checkbox.addEventListener('change', async () => {
      taskObject.completed = checkbox.checked;
      taskObject.status = checkbox.checked ? 'done' : 'todo';
      taskObject.updatedAt = new Date().toISOString();
      
      if (checkbox.checked) {
        taskItem.classList.add('completed');
        taskObject.completedAt = new Date().toISOString();
      } else {
        taskItem.classList.remove('completed');
        taskObject.completedAt = null;
      }
      
      await this.syncTaskUpdate(taskObject);
    });
    
    editBtn.addEventListener('click', async () => {
      const newTitle = await this.showTaskEditModal(taskObject);
      if (newTitle && newTitle !== taskObject.title) {
        taskObject.title = newTitle;
        taskObject.updatedAt = new Date().toISOString();
        taskTitle.textContent = newTitle;
        await this.syncTaskUpdate(taskObject);
      }
    });
    
    breakdownBtn.addEventListener('click', () => {
      this.breakdownTask(taskObject.title);
    });
    
    deleteBtn.addEventListener('click', async () => {
      if (confirm(`Delete "${taskObject.title}"?`)) {
        taskItem.remove();
        await this.syncTaskDelete(taskObject);
      }
    });
  }

  private async performManualSync() {
    // Trigger sync with browser extension backend
    try {
      const response = await fetch('http://localhost:3001/api/sync/status');
      if (response.ok) {
        console.log('Backend sync available');
        // Refresh external tasks
        const taskList = this.containerEl.querySelector('.task-list') as HTMLElement;
        if (taskList) {
          // Clear and reload
          const externalTasks = taskList.querySelectorAll('.enhanced-task');
          externalTasks.forEach(task => task.remove());
          await this.loadExternalTasks(taskList);
        }
      }
    } catch (error) {
      throw new Error('Sync backend not available');
    }
  }

  private refreshTaskList(taskList: HTMLElement) {
    // Clear and reload all tasks
    taskList.innerHTML = '';
    this.loadTasksFromVault(taskList);
    this.loadExternalTasks(taskList);
    this.updateTaskStats();
  }

  private filterTasks(taskList: HTMLElement, filter: string) {
    const taskItems = taskList.querySelectorAll('.task-item');
    
    taskItems.forEach((item: HTMLElement) => {
      const isCompleted = item.classList.contains('completed');
      const taskId = item.dataset.taskId;
      const task = this.todaysTasks.find(t => t.id === taskId);
      
      let show = true;
      
      switch (filter) {
        case 'todo':
          show = !isCompleted;
          break;
        case 'in-progress':
          show = task && task.status === 'in-progress';
          break;
        case 'completed':
          show = isCompleted;
          break;
        case 'all':
        default:
          show = true;
      }
      
      item.style.display = show ? 'block' : 'none';
    });
  }

  private showBulkBreakdownInterface(taskList: HTMLElement) {
    new Notice('💡 Select tasks and use the breakdown button for bulk operations');
    // For now, just show a notice. Could implement full bulk interface later.
  }

  private showBulkActionsInterface(taskList: HTMLElement) {
    new Notice('⚡ Bulk actions: Complete, Delete, Change Priority - coming soon!');
    // Placeholder for bulk actions
  }

  private showImportInterface() {
    new Notice('📥 Import from: Todoist, CSV, or paste text - feature in development');
    // Placeholder for import functionality
  }
}

// Simple breathing exercise modal
class BreathingModal extends Modal {
  constructor(
    app: App, 
    private integrationService?: any,
    private currentEnergyLevel: number = 3
  ) {
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