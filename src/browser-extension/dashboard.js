// Enhanced Dashboard with Kanban Board Support
class ProactivityDashboard {
  constructor() {
    this.tasks = [];
    this.currentEnergyLevel = 3;
    this.currentView = 'list'; // 'list', 'kanban', or 'gantt'
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      focusTime: 0,
      streakDays: 0
    };
    this.timerMinutes = 25;
    this.timerSeconds = 0;
    this.timerInterval = null;
    this.isTimerRunning = false;
    
    // Gantt chart configuration
    this.ganttConfig = {
      timeScale: 'day', // 'hour', 'day', 'week'
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    };
  }

  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.updateUI();
    this.startPeriodicUpdates();
    console.log('Proactivity Dashboard initialized');
  }

  async loadData() {
    try {
      const data = await chrome.storage.local.get([
        'tasks', 
        'currentEnergyLevel', 
        'dailyStats',
        'currentSession',
        'streakData',
        'dashboardView'
      ]);

      this.tasks = data.tasks || [];
      this.currentEnergyLevel = data.currentEnergyLevel || 3;
      this.currentView = data.dashboardView || 'list';
      
      // Load current session data and daily focus time
      const today = new Date().toDateString();
      const dailyStats = data.dailyStats || {};
      const todayStats = dailyStats[today] || { focusTime: 0 };
      
      let sessionFocusTime = 0;
      if (data.currentSession) {
        this.timerMinutes = data.currentSession.remainingMinutes || 25;
        this.timerSeconds = data.currentSession.remainingSeconds || 0;
        sessionFocusTime = Math.floor((data.currentSession.focusTime || 0) / (1000 * 60));
      }

      this.stats.focusTime = Math.max(todayStats.focusTime, sessionFocusTime);

      // Load streak data
      const streakData = data.streakData || {};
      this.stats.streakDays = this.calculateStreak(streakData);
      
      // Calculate stats
      this.calculateStats();
      
      console.log('Loaded data - Tasks:', this.tasks.length, 'Energy:', this.currentEnergyLevel, 'Focus Time:', this.stats.focusTime);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  setupEventListeners() {
    // View switcher
    document.getElementById('listViewBtn').addEventListener('click', () => {
      this.switchView('list');
    });

    document.getElementById('kanbanViewBtn').addEventListener('click', () => {
      this.switchView('kanban');
    });

    document.getElementById('ganttViewBtn').addEventListener('click', () => {
      this.switchView('gantt');
    });

    // Header actions
    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    document.getElementById('syncBtn').addEventListener('click', () => {
      this.performFullSync();
    });

    // Energy level buttons
    document.querySelectorAll('.energy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setEnergyLevel(parseInt(e.currentTarget.dataset.energy));
      });
    });

    // Timer controls
    document.getElementById('startTimer').addEventListener('click', () => {
      this.startTimer();
    });

    document.getElementById('pauseTimer').addEventListener('click', () => {
      this.pauseTimer();
    });

    document.getElementById('stopTimer').addEventListener('click', () => {
      this.stopTimer();
    });

    // Task management
    document.getElementById('addTaskBtn').addEventListener('click', () => {
      this.showTaskInput();
    });

    document.getElementById('aiHelperBtn').addEventListener('click', () => {
      this.showAiHelper();
    });

    document.getElementById('saveTaskBtn').addEventListener('click', () => {
      this.addTask();
    });

    document.getElementById('cancelTaskBtn').addEventListener('click', () => {
      this.hideTaskInput();
    });

    document.getElementById('taskInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addTask();
      }
      if (e.key === 'Escape') {
        this.hideTaskInput();
      }
    });
  }

  async switchView(view) {
    this.currentView = view;
    
    // Update button states
    document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
    document.getElementById('kanbanViewBtn').classList.toggle('active', view === 'kanban');
    document.getElementById('ganttViewBtn').classList.toggle('active', view === 'gantt');
    
    // Show/hide views
    document.getElementById('listView').classList.toggle('hidden', view !== 'list');
    document.getElementById('kanbanView').classList.toggle('hidden', view !== 'kanban');
    document.getElementById('ganttView').classList.toggle('hidden', view !== 'gantt');
    
    // Save preference
    await chrome.storage.local.set({ dashboardView: view });
    
    // Update the appropriate view
    if (view === 'list') {
      this.updateTasksList();
    } else if (view === 'kanban') {
      this.updateKanbanBoard();
      this.setupDragAndDrop();
    } else if (view === 'gantt') {
      this.updateGanttChart();
    }
  }

  showTaskInput() {
    document.getElementById('taskInputRow').classList.remove('hidden');
    document.getElementById('taskInput').focus();
  }

  hideTaskInput() {
    document.getElementById('taskInputRow').classList.add('hidden');
    document.getElementById('taskInput').value = '';
    document.getElementById('taskPriority').value = 'medium';
  }

  async addTask() {
    const title = document.getElementById('taskInput').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const startTimeInput = document.getElementById('taskStartTime');
    const endTimeInput = document.getElementById('taskEndTime');
    const estimatedMinutes = parseInt(document.getElementById('taskEstimatedMinutes').value) || 30;
    
    if (!title) return;

    const now = new Date();
    const scheduledStartTime = startTimeInput ? new Date(startTimeInput.value) : null;
    const scheduledEndTime = endTimeInput ? new Date(endTimeInput.value) : null;

    const newTask = {
      id: Date.now().toString(),
      title: title,
      description: '',
      priority: priority,
      status: 'todo',
      completed: false,
      
      // Time tracking for Gantt charts
      startTime: null,
      endTime: null,
      scheduledStartTime: scheduledStartTime ? scheduledStartTime.toISOString() : null,
      scheduledEndTime: scheduledEndTime ? scheduledEndTime.toISOString() : null,
      estimatedMinutes: estimatedMinutes,
      actualMinutes: 0,
      
      // Metadata
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: null,
      energyLevel: this.currentEnergyLevel,
      
      // ADHD-specific
      procrastinationScore: 0,
      motivationBooster: this.getRandomMotivation(),
      adhdOptimized: true,
      
      // Sync metadata
      source: 'manual',
      syncStatus: 'pending',
      lastSyncTime: now.toISOString(),
      
      // Dependencies
      dependencies: [],
      blocked: false,
      blockingReason: ''
    };

    this.tasks.unshift(newTask);
    await chrome.storage.local.set({ tasks: this.tasks });
    
    // Queue for sync
    chrome.runtime.sendMessage({
      action: 'updateTasks',
      tasks: this.tasks
    });
    
    this.hideTaskInput();
    this.calculateStats();
    this.updateUI();
    
    // Show success notification
    this.showNotification('✅ Task Added', `Added "${title}" to your task list`);
  }

  async toggleTask(taskId, newStatus = null) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (newStatus !== null) {
      // Kanban status change
      task.status = newStatus;
      task.completed = newStatus === 'done';
      if (task.completed && !task.completedAt) {
        task.completedAt = new Date().toISOString();
      }
    } else {
      // Simple toggle (list view)
      task.completed = !task.completed;
      if (task.completed) {
        task.completedAt = new Date().toISOString();
        task.status = 'done';
      } else {
        delete task.completedAt;
        task.status = 'todo';
      }
    }

    await chrome.storage.local.set({ tasks: this.tasks });
    
    this.calculateStats();
    this.updateUI();
    
    // Check if this triggers enforcement lifting
    const response = await chrome.runtime.sendMessage({
      action: 'updateTasks',
      tasks: this.tasks
    });

    if (task.completed) {
      this.showNotification('🎉 Task Completed!', `Great job on "${task.title}"`);
    }
  }

  async deleteTask(taskId) {
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    await chrome.storage.local.set({ tasks: this.tasks });
    
    this.calculateStats();
    this.updateUI();
    
    this.showNotification('🗑️ Task Deleted', 'Task removed from your list');
  }

  updateTasksList() {
    const tasksList = document.getElementById('tasksList');
    
    if (this.tasks.length === 0) {
      tasksList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <div class="empty-state-title">No tasks yet</div>
          <div class="empty-state-text">Add your first task to get started with productivity tracking</div>
          <button class="btn btn-primary" onclick="document.getElementById('addTaskBtn').click()">➕ Add Task</button>
        </div>
      `;
      return;
    }

    tasksList.innerHTML = this.tasks.map(task => `
      <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
        <div class="task-checkbox ${task.completed ? 'completed' : ''}" 
             onclick="dashboard.toggleTask('${task.id}')"></div>
        <div class="task-content">
          <div class="task-title ${task.completed ? 'completed' : ''}">${this.escapeHtml(task.title)}</div>
          <div class="task-meta">
            <span class="badge priority-${task.priority}">${task.priority}</span>
            <span class="text-xs" style="color: var(--color-gray-500);">
              ${this.formatDate(task.createdAt)}
            </span>
          </div>
        </div>
        <div class="task-actions">
          <button class="task-action" onclick="dashboard.deleteTask('${task.id}')" title="Delete task">
            🗑️
          </button>
        </div>
      </div>
    `).join('');
  }

  updateKanbanBoard() {
    const todoTasks = this.tasks.filter(t => t.status === 'todo' || (!t.status && !t.completed));
    const inProgressTasks = this.tasks.filter(t => t.status === 'in-progress');
    const doneTasks = this.tasks.filter(t => t.status === 'done' || t.completed);

    // Update counts
    document.getElementById('todoCount').textContent = todoTasks.length;
    document.getElementById('inProgressCount').textContent = inProgressTasks.length;
    document.getElementById('doneCount').textContent = doneTasks.length;

    // Update columns
    this.renderKanbanColumn('todoTasks', todoTasks);
    this.renderKanbanColumn('inProgressTasks', inProgressTasks);
    this.renderKanbanColumn('doneTasks', doneTasks);
  }

  renderKanbanColumn(containerId, tasks) {
    const container = document.getElementById(containerId);
    
    container.innerHTML = tasks.map(task => `
      <div class="kanban-task" data-task-id="${task.id}" draggable="true">
        <div class="task-title">${this.escapeHtml(task.title)}</div>
        <div class="task-meta">
          <span class="badge priority-${task.priority}">${task.priority}</span>
          <span class="text-xs" style="color: var(--color-gray-500);">
            ${this.formatDate(task.createdAt)}
          </span>
        </div>
      </div>
    `).join('');
  }

  setupDragAndDrop() {
    // Add drag event listeners to tasks
    document.querySelectorAll('.kanban-task').forEach(task => {
      task.addEventListener('dragstart', this.handleDragStart.bind(this));
      task.addEventListener('dragend', this.handleDragEnd.bind(this));
    });

    // Add drop event listeners to drop zones
    document.querySelectorAll('.kanban-drop-zone').forEach(zone => {
      zone.addEventListener('dragover', this.handleDragOver.bind(this));
      zone.addEventListener('drop', this.handleDrop.bind(this));
      zone.addEventListener('dragenter', this.handleDragEnter.bind(this));
      zone.addEventListener('dragleave', this.handleDragLeave.bind(this));
    });
  }

  handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
    e.target.classList.add('dragging');
  }

  handleDragEnd(e) {
    e.target.classList.remove('dragging');
  }

  handleDragOver(e) {
    e.preventDefault();
  }

  handleDragEnter(e) {
    e.preventDefault();
    e.target.classList.add('drag-over');
  }

  handleDragLeave(e) {
    e.target.classList.remove('drag-over');
  }

  async handleDrop(e) {
    e.preventDefault();
    e.target.classList.remove('drag-over');
    
    const taskId = e.dataTransfer.getData('text/plain');
    const newStatus = e.target.dataset.status;
    
    if (taskId && newStatus) {
      await this.toggleTask(taskId, newStatus);
    }
  }

  async setEnergyLevel(level) {
    this.currentEnergyLevel = level;
    
    // Update UI
    this.updateEnergyDisplay();
    
    // Save to storage
    await chrome.storage.local.set({ currentEnergyLevel: level });
    
    // Sync with backend/background
    chrome.runtime.sendMessage({
      action: 'updateEnergyLevel',
      energyLevel: level
    });
    
    this.showNotification('⚡ Energy Updated', `Energy level set to ${this.getEnergyLabel(level)}`);
  }

  updateEnergyDisplay() {
    const energyLabels = ['', 'Depleted', 'Low', 'Medium', 'High', 'Peak'];
    document.getElementById('currentEnergyDisplay').textContent = energyLabels[this.currentEnergyLevel];
    
    document.querySelectorAll('.energy-btn').forEach(btn => {
      btn.classList.toggle('active', 
        parseInt(btn.dataset.energy) === this.currentEnergyLevel);
    });
  }

  getEnergyLabel(level) {
    const labels = ['', 'Depleted', 'Low', 'Medium', 'High', 'Peak'];
    return labels[level] || 'Medium';
  }

  startTimer() {
    if (this.isTimerRunning) return;
    
    this.isTimerRunning = true;
    this.timerInterval = setInterval(() => {
      if (this.timerSeconds === 0) {
        if (this.timerMinutes === 0) {
          this.completeTimer();
          return;
        }
        this.timerMinutes--;
        this.timerSeconds = 59;
      } else {
        this.timerSeconds--;
      }
      this.updateTimerDisplay();
    }, 1000);
    
    this.showNotification('🎯 Timer Started', 'Focus session is now active');
  }

  pauseTimer() {
    this.isTimerRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.showNotification('⏸️ Timer Paused', 'Focus session paused');
  }

  stopTimer() {
    this.isTimerRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.timerMinutes = 25;
    this.timerSeconds = 0;
    this.updateTimerDisplay();
    this.showNotification('⏹️ Timer Stopped', 'Focus session ended');
  }

  completeTimer() {
    this.isTimerRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    // Add focus time to stats
    this.stats.focusTime += 25;
    this.updateStats();
    
    this.timerMinutes = 25;
    this.timerSeconds = 0;
    this.updateTimerDisplay();
    
    this.showNotification('🎉 Pomodoro Complete!', 'Great focus session! Time for a break.');
  }

  updateTimerDisplay() {
    const display = document.getElementById('timerDisplay');
    const minutes = this.timerMinutes.toString().padStart(2, '0');
    const seconds = this.timerSeconds.toString().padStart(2, '0');
    display.textContent = `${minutes}:${seconds}`;
  }

  calculateStats() {
    this.stats.totalTasks = this.tasks.length;
    this.stats.completedTasks = this.tasks.filter(t => t.completed).length;
    // Focus time is loaded from storage in loadData method
  }

  calculateStreak(streakData) {
    let streak = 0;
    let currentDate = new Date();
    
    while (true) {
      const dateStr = currentDate.toDateString();
      if (streakData[dateStr] && streakData[dateStr].completed > 0) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  }

  updateUI() {
    this.updateStats();
    this.updateEnergyDisplay();
    this.updateTimerDisplay();
    
    if (this.currentView === 'list') {
      this.updateTasksList();
    } else {
      this.updateKanbanBoard();
      this.setupDragAndDrop();
    }
    
    // Apply current view state
    this.switchView(this.currentView);
  }

  updateStats() {
    document.getElementById('totalTasks').textContent = this.stats.totalTasks;
    document.getElementById('completedTasks').textContent = this.stats.completedTasks;
    document.getElementById('focusTime').textContent = `${this.stats.focusTime}m`;
    document.getElementById('streakDays').textContent = this.stats.streakDays;
  }

  async performFullSync() {
    this.showNotification('🔄 Syncing...', 'Synchronizing with backend services');
    
    try {
      await this.loadData();
      this.calculateStats();
      this.updateUI();
      
      chrome.runtime.sendMessage({
        action: 'fullSync',
        data: {
          tasks: this.tasks,
          energyLevel: this.currentEnergyLevel,
          stats: this.stats
        }
      });
      
      this.showNotification('✅ Sync Complete', 'All data synchronized successfully');
    } catch (error) {
      this.showNotification('❌ Sync Failed', 'Could not sync with backend services');
      console.error('Sync error:', error);
    }
  }

  showNotification(title, message) {
    // Create a simple toast notification
    const notification = document.createElement('div');
    
    notification.style.cssText = `
      position: fixed;
      top: var(--space-4);
      right: var(--space-4);
      background: var(--color-primary-600);
      color: var(--color-gray-0);
      padding: var(--space-4) var(--space-5);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      z-index: var(--z-toast);
      max-width: 350px;
      font-size: var(--text-sm);
      line-height: var(--leading-normal);
      animation: slideIn var(--transition-normal);
    `;
    
    notification.innerHTML = `
      <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-1);">${title}</div>
      <div style="opacity: 0.9;">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut var(--transition-normal)';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 200);
      }
    }, 4000);
    
    // Click to dismiss
    notification.addEventListener('click', () => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut var(--transition-normal)';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 200);
      }
    });
  }

  startPeriodicUpdates() {
    // Update data every 30 seconds
    setInterval(async () => {
      await this.loadData();
      this.calculateStats();
      this.updateStats();
    }, 30000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  }

  updateGanttChart() {
    const ganttContainer = document.getElementById('ganttChart');
    
    if (this.tasks.length === 0) {
      ganttContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-title">No scheduled tasks</div>
          <div class="empty-state-text">Add tasks with start/end times to see your project timeline</div>
          <button class="btn btn-primary" onclick="document.getElementById('addTaskBtn').click()">➕ Schedule Task</button>
        </div>
      `;
      return;
    }

    // Filter tasks with timing information
    const scheduledTasks = this.tasks.filter(task => 
      task.scheduledStartTime || task.startTime
    );

    if (scheduledTasks.length === 0) {
      ganttContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⏰</div>
          <div class="empty-state-title">No scheduled tasks</div>
          <div class="empty-state-text">Add start and end times to existing tasks to see the Gantt chart</div>
        </div>
      `;
      return;
    }

    // Calculate date range
    const allDates = scheduledTasks.flatMap(task => [
      new Date(task.scheduledStartTime || task.startTime),
      new Date(task.scheduledEndTime || task.endTime || task.scheduledStartTime || task.startTime)
    ]).filter(date => !isNaN(date));

    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    
    // Ensure we show at least a week
    const timeDiff = maxDate - minDate;
    if (timeDiff < 7 * 24 * 60 * 60 * 1000) {
      maxDate.setTime(minDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // Generate time scale
    const timeScale = this.generateTimeScale(minDate, maxDate);
    
    // Render Gantt chart
    ganttContainer.innerHTML = `
      <div class="gantt-header">
        <div class="gantt-controls">
          <div class="gantt-scale-selector">
            <button class="btn btn-sm ${this.ganttConfig.timeScale === 'day' ? 'active' : ''}" 
                    onclick="dashboard.setGanttTimeScale('day')">Days</button>
            <button class="btn btn-sm ${this.ganttConfig.timeScale === 'week' ? 'active' : ''}" 
                    onclick="dashboard.setGanttTimeScale('week')">Weeks</button>
          </div>
        </div>
        <div class="gantt-timeline">
          <div class="gantt-timeline-header">
            ${timeScale.map(date => `
              <div class="gantt-timeline-cell">
                <div class="gantt-date">${this.formatGanttDate(date)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="gantt-body">
        ${scheduledTasks.map(task => this.renderGanttTask(task, minDate, maxDate, timeScale.length)).join('')}
      </div>
    `;
  }

  generateTimeScale(startDate, endDate) {
    const timeScale = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      timeScale.push(new Date(current));
      
      if (this.ganttConfig.timeScale === 'day') {
        current.setDate(current.getDate() + 1);
      } else if (this.ganttConfig.timeScale === 'week') {
        current.setDate(current.getDate() + 7);
      }
    }
    
    return timeScale;
  }

  renderGanttTask(task, minDate, maxDate, timeScaleLength) {
    const taskStart = new Date(task.scheduledStartTime || task.startTime);
    const taskEnd = new Date(task.scheduledEndTime || task.endTime || taskStart.getTime() + task.estimatedMinutes * 60 * 1000);
    
    // Calculate position and width as percentages
    const totalDuration = maxDate - minDate;
    const taskStartOffset = ((taskStart - minDate) / totalDuration) * 100;
    const taskDuration = ((taskEnd - taskStart) / totalDuration) * 100;
    
    // Determine status color
    const statusColors = {
      'todo': 'var(--color-gray-300)',
      'in-progress': 'var(--color-primary-500)',
      'blocked': 'var(--color-red-500)',
      'review': 'var(--color-yellow-500)',
      'done': 'var(--color-green-500)'
    };
    
    const color = statusColors[task.status] || statusColors['todo'];
    
    return `
      <div class="gantt-row" data-task-id="${task.id}">
        <div class="gantt-task-info">
          <div class="gantt-task-title">${this.escapeHtml(task.title)}</div>
          <div class="gantt-task-meta">
            <span class="badge priority-${task.priority}">${task.priority}</span>
            <span class="badge status-${task.status}">${task.status}</span>
            <span class="text-xs">${task.estimatedMinutes}m</span>
          </div>
        </div>
        <div class="gantt-timeline-row">
          <div class="gantt-bar" 
               style="left: ${taskStartOffset}%; width: ${Math.max(taskDuration, 2)}%; background-color: ${color};"
               title="${task.title} (${this.formatGanttDate(taskStart)} - ${this.formatGanttDate(taskEnd)})">
            <div class="gantt-bar-content">
              ${task.title}
            </div>
            ${task.actualMinutes > 0 ? `
              <div class="gantt-progress" style="width: ${Math.min((task.actualMinutes / task.estimatedMinutes) * 100, 100)}%"></div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  formatGanttDate(date) {
    if (this.ganttConfig.timeScale === 'day') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (this.ganttConfig.timeScale === 'week') {
      return `Week ${this.getWeekNumber(date)}`;
    }
    return date.toLocaleDateString();
  }

  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  setGanttTimeScale(scale) {
    this.ganttConfig.timeScale = scale;
    if (this.currentView === 'gantt') {
      this.updateGanttChart();
    }
  }

  getRandomMotivation() {
    const motivations = [
      "You've got this! One step at a time. 🌟",
      "Progress, not perfection. Keep going! 💪",
      "Small actions lead to big results. ✨",
      "Your future self will thank you! 🚀",
      "Every task completed is a victory! 🏆",
      "You're building momentum with each step! ⚡",
      "Consistency is your superpower! 💫",
      "You're capable of amazing things! 🌈"
    ];
    
    return motivations[Math.floor(Math.random() * motivations.length)];
  }

  // AI Helper Methods
  showAiHelper() {
    document.getElementById('aiHelperModal').classList.remove('hidden');
    document.getElementById('aiTaskInput').focus();
  }

  hideAiHelper() {
    document.getElementById('aiHelperModal').classList.add('hidden');
    this.clearAiForm();
  }

  clearAiForm() {
    document.getElementById('aiTaskInput').value = '';
    document.getElementById('aiAvailableTime').value = '30';
    document.getElementById('aiEnergyLevel').value = '3';
    document.getElementById('aiComplexity').value = 'simple';
    document.querySelectorAll('.ai-challenges-grid input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });
  }

  async generateAiTasks() {
    const taskInput = document.getElementById('aiTaskInput').value.trim();
    if (!taskInput) {
      this.showNotification('⚠️ Input Required', 'Please describe the task you need help with');
      return;
    }

    const generateBtn = document.getElementById('generateAiTasksBtn');
    const originalText = generateBtn.textContent;
    generateBtn.textContent = '🤖 Generating...';
    generateBtn.disabled = true;

    try {
      // Gather context
      const context = {
        availableTime: parseInt(document.getElementById('aiAvailableTime').value),
        currentEnergyLevel: parseInt(document.getElementById('aiEnergyLevel').value),
        preferredComplexity: document.getElementById('aiComplexity').value,
        executiveFunctionChallenges: Array.from(
          document.querySelectorAll('.ai-challenges-grid input[type="checkbox"]:checked')
        ).map(cb => cb.value)
      };

      // Call backend AI service
      const response = await fetch('http://localhost:3001/api/tasks/breakdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalTask: taskInput,
          context: context
        })
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data?.tasks) {
        this.showAiResults(result.data.tasks, taskInput);
        this.hideAiHelper();
      } else {
        throw new Error(result.message || 'No tasks generated');
      }

    } catch (error) {
      console.error('AI task generation error:', error);
      
      // Fallback to local breakdown
      const fallbackTasks = this.generateFallbackTasks(taskInput);
      this.showAiResults(fallbackTasks, taskInput);
      this.hideAiHelper();
      
      this.showNotification('⚠️ Using Fallback', 'AI service unavailable, using local task breakdown');
      
    } finally {
      generateBtn.textContent = originalText;
      generateBtn.disabled = false;
    }
  }

  generateFallbackTasks(originalTask) {
    // Simple local fallback task breakdown
    const baseSteps = [
      'Gather all necessary materials and resources',
      'Create a detailed outline or plan',
      'Break down into smaller, manageable pieces',
      'Complete the first section/part',
      'Review and revise the completed work',
      'Finalize and prepare for submission/next steps'
    ];

    return baseSteps.map((step, index) => ({
      id: `fallback_${Date.now()}_${index}`,
      title: step,
      description: `Step ${index + 1} for: ${originalTask}`,
      priority: index === 0 ? 'high' : 'medium',
      estimatedMinutes: 25,
      complexity: 'simple',
      energyLevel: 3,
      adhdOptimized: true,
      motivationBooster: this.getRandomMotivation(),
      tags: ['ai-generated', 'fallback']
    }));
  }

  showAiResults(tasks, originalTask) {
    const resultsContent = document.getElementById('aiResultsContent');
    const selectedTasks = new Set();

    resultsContent.innerHTML = `
      <div class="ai-results-header">
        <h4>Task Breakdown for: "${originalTask}"</h4>
        <p class="text-sm" style="color: var(--color-gray-600); margin-bottom: var(--space-6);">
          Generated ${tasks.length} ADHD-friendly micro-tasks. Click to select tasks you want to add to your dashboard.
        </p>
      </div>
      
      <div class="ai-results-tasks">
        ${tasks.map((task, index) => `
          <div class="ai-results-task" data-task-index="${index}" onclick="dashboard.toggleTaskSelection(${index})">
            <div class="ai-task-title">${this.escapeHtml(task.title)}</div>
            <div class="ai-task-meta">
              <span class="badge priority-${task.priority}">${task.priority}</span>
              <span class="badge complexity-${task.complexity}">${task.complexity}</span>
              <span class="text-xs">~${task.estimatedMinutes}min</span>
            </div>
            ${task.description ? `
              <div class="ai-task-description">${this.escapeHtml(task.description)}</div>
            ` : ''}
            ${task.motivationBooster ? `
              <div class="ai-motivation" style="font-style: italic; color: var(--color-primary-600); margin-top: var(--space-2);">
                💡 ${this.escapeHtml(task.motivationBooster)}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;

    // Store tasks for later addition
    this.aiGeneratedTasks = tasks;
    this.selectedAiTasks = selectedTasks;

    document.getElementById('aiResultsModal').classList.remove('hidden');
  }

  toggleTaskSelection(index) {
    const taskElement = document.querySelector(`[data-task-index="${index}"]`);
    const isSelected = this.selectedAiTasks.has(index);

    if (isSelected) {
      this.selectedAiTasks.delete(index);
      taskElement.classList.remove('selected');
    } else {
      this.selectedAiTasks.add(index);
      taskElement.classList.add('selected');
    }

    // Update add button text
    const addBtn = document.getElementById('addAiTasksBtn');
    const count = this.selectedAiTasks.size;
    addBtn.textContent = count > 0 ? `➕ Add ${count} Selected Task${count > 1 ? 's' : ''}` : '➕ Add Selected Tasks';
    addBtn.disabled = count === 0;
  }

  hideAiResults() {
    document.getElementById('aiResultsModal').classList.add('hidden');
    this.aiGeneratedTasks = null;
    this.selectedAiTasks = new Set();
  }

  async addAiGeneratedTasks() {
    if (!this.aiGeneratedTasks || this.selectedAiTasks.size === 0) {
      this.showNotification('⚠️ No Tasks Selected', 'Please select at least one task to add');
      return;
    }

    const tasksToAdd = Array.from(this.selectedAiTasks).map(index => {
      const aiTask = this.aiGeneratedTasks[index];
      const now = new Date();
      
      return {
        ...aiTask,
        id: Date.now().toString() + '_' + index,
        status: 'todo',
        completed: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        completedAt: null,
        startTime: null,
        endTime: null,
        scheduledStartTime: null,
        scheduledEndTime: null,
        actualMinutes: 0,
        source: 'ai',
        syncStatus: 'pending',
        lastSyncTime: now.toISOString(),
        dependencies: [],
        blocked: false,
        blockingReason: ''
      };
    });

    // Add tasks to beginning of list
    this.tasks.unshift(...tasksToAdd);
    await chrome.storage.local.set({ tasks: this.tasks });

    // Sync with backend
    chrome.runtime.sendMessage({
      action: 'updateTasks',
      tasks: this.tasks
    });

    this.hideAiResults();
    this.calculateStats();
    this.updateUI();

    this.showNotification('🎉 Tasks Added!', `Added ${tasksToAdd.length} AI-generated tasks to your dashboard`);
  }
}

// Initialize dashboard
const dashboard = new ProactivityDashboard();
document.addEventListener('DOMContentLoaded', () => {
  dashboard.init();
});

// Export for debugging
window.dashboard = dashboard;