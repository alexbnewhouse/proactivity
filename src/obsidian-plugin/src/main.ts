import { App, Plugin, PluginSettingTab, Setting, Notice, WorkspaceLeaf, ItemView, Modal, MarkdownView, TFile } from 'obsidian';
import { ProactivityView, VIEW_TYPE_PROACTIVITY } from './proactive-view';
import { TaskBreakdownModal } from './task-breakdown-modal';
import { ADHDPatternDetector } from './adhd-pattern-detector';
import { ObsidianIntegrationService } from './obsidian-integration-service';

// Default settings based on ADHD research
export interface ProactivitySettings {
  apiKey: string;
  serverUrl: string;
  enableProactiveNotifications: boolean;
  maxDailyNotifications: number;
  defaultBreakdownDepth: number;
  enablePatternDetection: boolean;
  enableHyperfocusProtection: boolean;
  procrastinationThreshold: number; // minutes
  energyCheckInterval: number; // minutes
  // Browser extension sync settings
  browserExtensionSync: {
    enableSync: boolean;
    syncInterval: number; // minutes
    lastSyncTimestamp: number;
    syncTasks: boolean;
    syncEnergyLevels: boolean;
    syncFocusSessions: boolean;
    syncEnforcementSettings: boolean;
  };
  // Enhanced enforcement settings
  enforcement: {
    enableStrictMode: boolean;
    blockAllWebsites: boolean;
    requireDailyTaskCompletion: boolean;
    allowedDomains: string[];
    enforcementStartTime: string; // "09:00"
    enforcementEndTime: string; // "17:00"
  };
  obsidianIntegration: {
    enableTaskSync: boolean;
    enableProgressTracking: boolean;
    enableSmartLinking: boolean;
    dissertationFolderPath: string;
    dailyNotePath: string;
    taskTagPrefix: string;
  };
  adhdSupport: {
    useGentleTone: boolean;
    includeMotivation: boolean;
    limitCognitiveLoad: boolean;
    enableBodyDoubling: boolean;
    timeBlindnessSupport: boolean;
  };
}

const DEFAULT_SETTINGS: ProactivitySettings = {
  apiKey: '',
  serverUrl: 'http://localhost:3002',
  enableProactiveNotifications: true,
  maxDailyNotifications: 12,
  defaultBreakdownDepth: 3,
  enablePatternDetection: true,
  enableHyperfocusProtection: true,
  procrastinationThreshold: 30,
  energyCheckInterval: 120,
  browserExtensionSync: {
    enableSync: true,
    syncInterval: 5, // minutes
    lastSyncTimestamp: 0,
    syncTasks: true,
    syncEnergyLevels: true,
    syncFocusSessions: true,
    syncEnforcementSettings: true,
  },
  enforcement: {
    enableStrictMode: false,
    blockAllWebsites: false,
    requireDailyTaskCompletion: false,
    allowedDomains: ['localhost', 'obsidian.md', 'github.com'],
    enforcementStartTime: '09:00',
    enforcementEndTime: '17:00',
  },
  obsidianIntegration: {
    enableTaskSync: true,
    enableProgressTracking: true,
    enableSmartLinking: true,
    dissertationFolderPath: 'Dissertation',
    dailyNotePath: 'Daily Notes',
    taskTagPrefix: '#proactivity'
  },
  adhdSupport: {
    useGentleTone: true,
    includeMotivation: true,
    limitCognitiveLoad: true,
    enableBodyDoubling: false,
    timeBlindnessSupport: true
  }
};

export default class ProactivityPlugin extends Plugin {
  settings: ProactivitySettings;
  patternDetector: ADHDPatternDetector;
  integrationService: ObsidianIntegrationService;
  private statusBarItem: HTMLElement;
  private notificationInterval: NodeJS.Timeout;
  syncInterval: NodeJS.Timeout;

  async onload() {
    await this.loadSettings();

    // Initialize core services
    this.integrationService = new ObsidianIntegrationService(this.app, this.settings);
    this.patternDetector = new ADHDPatternDetector(this.app, this.settings);

    // Test backend connection
    await this.testBackendConnection();

    // Register view for main interface
    this.registerView(
      VIEW_TYPE_PROACTIVITY,
      (leaf) => new ProactivityView(leaf, this.settings, this.integrationService)
    );

    // Add ribbon icon for quick access
    this.addRibbonIcon('brain-circuit', 'Proactivity', () => {
      this.activateView();
    });

    // Add status bar item for energy/focus state
    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar('Ready');

    // Register commands
    this.registerCommands();

    // Start pattern detection if enabled
    if (this.settings.enablePatternDetection) {
      this.patternDetector.startDetection();
    }

    // Start proactive notifications if enabled
    if (this.settings.enableProactiveNotifications) {
      this.startProactiveNotifications();
    }

    // Start browser extension sync if enabled
    if (this.settings.browserExtensionSync.enableSync) {
      this.startBrowserExtensionSync();
    }

    // Add settings tab
    this.addSettingTab(new ProactivitySettingTab(this.app, this));

    new Notice('Proactivity: Your ADHD-friendly dissertation assistant is ready!');

    // Simple global for debugging
    // @ts-ignore
    (window as any).Proactivity = {
      ctx: () => this.integrationService.getCurrentContext(),
      suggestions: (lvl: string) => this.integrationService.getTaskSuggestions(lvl || 'moderate'),
      celebrate: () => this.celebrateProgress(),
      sync: () => this.syncWithBrowserExtension(),
      getUrgentTasks: () => this.getUrgentTasks()
    };
  }

  private async testBackendConnection() {
    try {
      const response = await fetch(`${this.settings.serverUrl}/health`);
      if (response.ok) {
        const health = await response.json();
        new Notice(`✅ Connected to Proactivity backend (v${health.version || '1.0.0'})`, 3000);
        this.updateStatusBar('Connected');
      } else {
        throw new Error('Backend health check failed');
      }
    } catch (error) {
      console.warn('Backend connection failed:', error);
      new Notice('⚠️ Backend offline - using local mode. Task breakdown will use fallback.', 6000);
      this.updateStatusBar('Offline mode');
    }
  }

  // Browser Extension Sync Methods
  startBrowserExtensionSync() {
    console.log('Starting browser extension sync...');
    
    // Initial sync
    this.syncWithBrowserExtension();
    
    // Set up periodic sync
    const syncIntervalMs = this.settings.browserExtensionSync.syncInterval * 60 * 1000;
    this.syncInterval = setInterval(() => {
      this.syncWithBrowserExtension();
    }, syncIntervalMs);
  }

  private async syncWithBrowserExtension() {
    if (!this.settings.browserExtensionSync.enableSync) {
      return;
    }

    try {
      // Try to communicate with browser extension via local storage or API
      const syncData = {
        timestamp: Date.now(),
        tasks: await this.getObsidianTasks(),
        energyLevel: await this.getCurrentEnergyLevel(),
        focusSessions: await this.getFocusSessions(),
        enforcementSettings: this.settings.enforcement
      };

      // Store sync data for browser extension to read
      localStorage.setItem('proactivity-obsidian-sync', JSON.stringify(syncData));
      
      // Also try direct browser extension communication if available
      try {
        // Check if browser extension API is available (Chromium browsers only)
        // @ts-ignore - Chrome API not available in Obsidian context but checking anyway
        if (typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.runtime) {
          (window as any).chrome.runtime.sendMessage('your-extension-id', {
            action: 'syncFromObsidian',
            data: syncData
          });
        }
      } catch (extError) {
        // Browser extension communication not available, continue with localStorage
      }

      this.settings.browserExtensionSync.lastSyncTimestamp = Date.now();
      await this.saveSettings();

      console.log('Browser extension sync completed successfully');
      
    } catch (error) {
      console.error('Browser extension sync failed:', error);
    }
  }

  private async getObsidianTasks() {
    // Extract tasks from Obsidian notes
    const files = this.app.vault.getMarkdownFiles();
    const tasks = [];

    for (const file of files) {
      const content = await this.app.vault.read(file);
      const taskRegex = /- \[[ x]\] (.+?)(?:\n|$)/g;
      let match;

      while ((match = taskRegex.exec(content)) !== null) {
        const isCompleted = match[0].includes('[x]');
        const taskText = match[1].trim();

        // Extract priority if present
        const priorityMatch = taskText.match(/\!{1,3}/);
        let priority = 'medium';
        if (priorityMatch) {
          priority = priorityMatch[0].length === 3 ? 'high' : priorityMatch[0].length === 2 ? 'medium' : 'low';
        }

        tasks.push({
          id: `obsidian-${file.path}-${match.index}`,
          title: taskText.replace(/\!{1,3}\s*/, ''), // Remove priority markers
          completed: isCompleted,
          priority: priority,
          source: 'obsidian',
          filePath: file.path,
          createdAt: new Date(file.stat.ctime).toISOString(),
          modifiedAt: new Date(file.stat.mtime).toISOString()
        });
      }
    }

    return tasks;
  }

  private async getCurrentEnergyLevel() {
    // Try to determine energy level from recent notes or use default
    const today = new Date().toISOString().split('T')[0];
    const dailyNotePath = `${this.settings.obsidianIntegration.dailyNotePath}/${today}.md`;
    
    try {
      const dailyNote = this.app.vault.getAbstractFileByPath(dailyNotePath);
      if (dailyNote instanceof TFile) {
        const content = await this.app.vault.read(dailyNote);
        const energyMatch = content.match(/energy:\s*(\d+)/i);
        if (energyMatch) {
          return parseInt(energyMatch[1]);
        }
      }
    } catch (error) {
      // Daily note not found or couldn't parse energy level
    }

    return 3; // Default medium energy
  }

  private async getFocusSessions() {
    // Return recent focus session data
    // This would integrate with time tracking in Obsidian notes
    return [];
  }

  private async getUrgentTasks() {
    const tasks = await this.getObsidianTasks();
    
    // Calculate urgency scores similar to browser extension
    return tasks
      .filter(task => !task.completed)
      .map(task => ({
        ...task,
        urgencyScore: this.calculateUrgencyScore(task)
      }))
      .sort((a, b) => b.urgencyScore - a.urgencyScore)
      .slice(0, 5);
  }

  private calculateUrgencyScore(task: any) {
    let score = 0;
    
    // Priority weight
    const priorityWeights = { high: 50, medium: 30, low: 10 };
    score += priorityWeights[task.priority] || 20;
    
    // Age weight (older tasks get higher score)
    const daysSinceCreated = (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.min(daysSinceCreated * 5, 30); // Max 30 points for age
    
    // Obsidian-specific bonuses
    if (task.filePath.includes('daily') || task.filePath.includes('today')) {
      score += 20; // Daily notes get priority
    }
    
    if (task.title.toLowerCase().includes('urgent') || task.title.includes('!!!')) {
      score += 25; // Explicitly marked urgent
    }
    
    return score;
  }

  onunload() {
    // Clean up intervals and detectors
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.patternDetector?.stopDetection();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);

    // Update services with new settings
    this.integrationService?.updateSettings(this.settings);
    this.patternDetector?.updateSettings(this.settings);
  }

  registerCommands() {
    // Quick task breakdown command
    this.addCommand({
      id: 'breakdown-current-task',
      name: 'Break down current task',
      callback: () => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          this.openTaskBreakdownModal(activeFile);
        } else {
          new Notice('Please open a file or select text to break down');
        }
      }
    });

    // Quick energy check command
    this.addCommand({
      id: 'energy-check',
      name: 'Quick energy level check',
      callback: () => {
        this.showEnergyCheckModal();
      }
    });

    // Focus session starter
    this.addCommand({
      id: 'start-focus-session',
      name: 'Start focused work session',
      callback: () => {
        this.startFocusSession();
      }
    });

    // Procrastination intervention
    this.addCommand({
      id: 'procrastination-help',
      name: 'Help! I\'m procrastinating',
      callback: () => {
        this.triggerProcrastinationIntervention();
      }
    });

    // Progress celebration
    this.addCommand({
      id: 'celebrate-progress',
      name: 'Celebrate progress made',
      callback: () => {
        this.celebrateProgress();
      }
    });

    // Out of office commands
    this.addCommand({
      id: 'vacation-mode',
      name: 'Start vacation mode',
      callback: () => {
        new Notice('Vacation mode activated. Enjoy your break! 🏖️');
      }
    });

    this.addCommand({
      id: 'deep-focus-mode',
      name: 'Start deep focus mode',
      callback: () => {
        new Notice('Deep focus mode activated. 🎯');
      }
    });

    this.addCommand({
      id: 'end-out-of-office',
      name: 'End out of office mode',
      callback: () => {
        new Notice('Welcome back! All features restored. ✨');
      }
    });

    this.addCommand({
      id: 'goblin-mode-breakdown',
      name: 'Goblin Mode: Break down tasks in current file',
      callback: async () => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) { new Notice('Open a markdown file'); return; }
        const editor = view.editor;
        const selection = editor.getSelection() || editor.getValue();
        const tasks = this.integrationService.parseTasksFromText(selection);
        if (!tasks.length) { new Notice('No markdown tasks found (- [ ] )'); return; }

        class GoblinModeModal extends Modal {
          plugin: ProactivityPlugin;
          tasksParsed: any[];
          taskDepths: Record<string, number> = {}; // Track breakdown depth per task
          
          constructor(app: App, plugin: ProactivityPlugin, tasksParsed: any[]) {
            super(app);
            this.plugin = plugin;
            this.tasksParsed = tasksParsed;
            // Initialize depth tracking
            this.tasksParsed.forEach(t => this.taskDepths[t.title] = 2);
          }

          onOpen() {
            const { contentEl } = this; 
            contentEl.empty();
            contentEl.addClass('goblin-modal');

            // Add custom styles
            const style = contentEl.createEl('style');
            style.textContent = `
              .goblin-modal {
                max-width: 800px !important;
                max-height: 80vh !important;
                overflow-y: auto;
              }
              .goblin-tips {
                background: var(--background-secondary);
                padding: 12px;
                border-radius: 6px;
                margin: 16px 0;
                font-size: 0.9em;
              }
              .goblin-tips li {
                margin: 6px 0;
                list-style: none;
                padding-left: 16px;
                position: relative;
              }
              .goblin-tips li:before {
                content: "💡";
                position: absolute;
                left: 0;
              }
              .goblin-task-row {
                border: 1px solid var(--background-modifier-border);
                border-radius: 8px;
                padding: 16px;
                margin: 12px 0;
                background: var(--background-primary);
              }
              .goblin-task-title {
                font-weight: 600;
                margin-bottom: 12px;
                color: var(--text-accent);
                font-size: 1.1em;
              }
              .goblin-task-controls {
                display: flex;
                gap: 8px;
                margin-bottom: 12px;
                flex-wrap: wrap;
              }
              .goblin-task-controls button {
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 0.9em;
              }
              .goblin-clarify-box {
                background: var(--background-secondary);
                padding: 12px;
                border-radius: 6px;
                margin: 12px 0;
              }
              .goblin-clarify-box p {
                margin: 6px 0;
              }
              .clarify-input {
                width: 100%;
                min-height: 60px;
                margin: 8px 0;
                padding: 8px;
                border-radius: 4px;
                resize: vertical;
              }
              .goblin-steps {
                background: var(--background-secondary);
                padding: 16px;
                border-radius: 8px;
                margin-top: 12px;
              }
              .goblin-step {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid var(--background-modifier-border);
              }
              .goblin-step:last-child {
                border-bottom: none;
              }
              .goblin-step-text {
                flex: 1;
                margin-right: 12px;
              }
              .step-add-btn, .step-breakdown-btn {
                padding: 4px 8px;
                font-size: 0.8em;
                margin-left: 4px;
              }
              .goblin-step-controls {
                display: flex;
                gap: 4px;
                align-items: center;
              }
              .goblin-footer {
                margin-top: 24px;
                padding-top: 16px;
                border-top: 1px solid var(--background-modifier-border);
                display: flex;
                gap: 12px;
                justify-content: space-between;
                flex-wrap: wrap;
              }
            `;

            // Tutorial header and quick guidance
            contentEl.createEl('h2', { text: '🧌 Goblin Mode: AI Task Breakdown' });
            contentEl.createEl('p', { text: 'AI-powered iterative task breakdown. Use Clarify to get smart questions and provide context, then Break Down for AI steps that get more granular with each click!' });

            const tips = contentEl.createEl('ul', { cls: 'goblin-tips' });
            tips.createEl('li', { text: 'AI Clarify generates smart questions specific to each task' });
            tips.createEl('li', { text: 'Your clarify answers feed into AI breakdowns for better context' });
            tips.createEl('li', { text: 'Each "Break Down" click makes steps more specific and granular' });
            tips.createEl('li', { text: 'Break down individual AI-generated steps for ultra-fine detail' });

            const listEl = contentEl.createEl('div', { cls: 'goblin-task-list' });

            // Keep answers in-memory to allow adding later
            const answers: Record<string, string[]> = {};

            this.tasksParsed.forEach((t, taskIndex) => {
              this.renderTaskRow(t, taskIndex, listEl, answers);
            });

            // Footer with global actions
            const footer = contentEl.createEl('div', { cls: 'goblin-footer' });
            
            const addAllTasksBtn = footer.createEl('button', { text: '📥 Add All Generated Steps', cls: 'mod-cta' });
            addAllTasksBtn.onclick = async () => {
              await this.addAllGeneratedSteps();
            };

            const doneBtn = footer.createEl('button', { text: 'Close', cls: 'secondary-btn' });
            doneBtn.onclick = () => this.close();
          }

          private renderTaskRow(t: any, taskIndex: number, listEl: HTMLElement, answers: Record<string, string[]>) {
            const row = listEl.createEl('div', { cls: 'goblin-task-row' });
            row.createEl('div', { text: t.title, cls: 'goblin-task-title' });

            const controls = row.createEl('div', { cls: 'goblin-task-controls' });

            // Clarify button
            const qBtn = controls.createEl('button', { text: '❓ Clarify', cls: 'mod-cta' });
            qBtn.onclick = () => {
              this.showClarifyBox(row, t, taskIndex, answers);
            };

            // Break Down button with depth indicator
            const currentDepth = this.taskDepths[t.title] || 2;
            const depthLabel = currentDepth === 2 ? 'Break Down' : 
                             currentDepth === 3 ? 'Break Down (Detailed)' :
                             currentDepth === 4 ? 'Break Down (Micro)' : 
                             'Break Down (Ultra-Fine)';
            
            const bBtn = controls.createEl('button', { text: `🔨 ${depthLabel}`, cls: 'mod-cta' });
            bBtn.onclick = async () => {
              await this.breakdownTask(row, t, answers);
            };
          }

          private showClarifyBox(row: HTMLElement, t: any, taskIndex: number, answers: Record<string, string[]>) {
            const boxId = `clarify-box-${taskIndex}`;
            if (row.querySelector(`#${boxId}`)) return; // already open

            const qbox = row.createEl('div', { cls: 'goblin-clarify-box', attr: { id: boxId } });
            
            // Show loading while generating AI questions
            const loadingEl = qbox.createEl('p', { text: '🤖 Generating smart questions...', cls: 'muted' });
            
            // Generate AI questions
            this.plugin.integrationService.generateClarifyingQuestions(t.title).then(qs => {
              loadingEl.remove();
              
              qbox.createEl('p', { text: 'AI-generated clarifying questions:', cls: 'small' });
              qs.forEach(q => qbox.createEl('p', { text: '• ' + q, cls: 'tiny' }));

              const input = qbox.createEl('textarea', { cls: 'clarify-input', placeholder: 'Answer one or more questions above (be specific but concise)...' });
              const buttonsEl = qbox.createEl('div', { cls: 'goblin-task-controls' });
              
              const saveBtn = buttonsEl.createEl('button', { text: '💾 Save Context', cls: 'mod-cta' });
              saveBtn.onclick = () => {
                const val = (input as HTMLTextAreaElement).value.trim();
                if (!val) {
                  new Notice('Please provide some context for better AI breakdowns');
                  return;
                }
                answers[t.title] = answers[t.title] || [];
                answers[t.title].push(val);
                qbox.createEl('p', { text: '✓ Context saved: ' + val, cls: 'tiny muted' });
                (input as HTMLTextAreaElement).value = '';
                new Notice('Context saved! This will improve your next breakdown.');
              };

              const closeBtn = buttonsEl.createEl('button', { text: 'Close', cls: 'secondary-btn' });
              closeBtn.onclick = () => qbox.remove();
              
            }).catch(err => {
              loadingEl.textContent = '⚠️ AI questions unavailable - using fallback';
              console.error('AI clarifying questions failed', err);
              
              // Fallback questions
              const fallbackQuestions = [
                'What specific outcome do you want?',
                'What would "done" look like?',
                'Any constraints or requirements?',
                'How much time do you have?'
              ];
              
              fallbackQuestions.forEach(q => qbox.createEl('p', { text: '• ' + q, cls: 'tiny' }));

              const input = qbox.createEl('textarea', { cls: 'clarify-input', placeholder: 'Answer one or more questions above...' });
              const buttonsEl = qbox.createEl('div', { cls: 'goblin-task-controls' });
              
              const saveBtn = buttonsEl.createEl('button', { text: '💾 Save Context', cls: 'mod-cta' });
              saveBtn.onclick = () => {
                const val = (input as HTMLTextAreaElement).value.trim();
                if (!val) {
                  new Notice('Please provide some context');
                  return;
                }
                answers[t.title] = answers[t.title] || [];
                answers[t.title].push(val);
                qbox.createEl('p', { text: '✓ Context saved: ' + val, cls: 'tiny muted' });
                (input as HTMLTextAreaElement).value = '';
              };

              const closeBtn = buttonsEl.createEl('button', { text: 'Close', cls: 'secondary-btn' });
              closeBtn.onclick = () => qbox.remove();
            });
          }

          private async breakdownTask(row: HTMLElement, t: any, answers: Record<string, string[]>) {
            // Remove any existing steps to avoid duplication
            const existingSteps = row.querySelector('.goblin-steps');
            if (existingSteps) existingSteps.remove();

            const spinner = row.createEl('span', { text: ' 🤖 AI thinking...', cls: 'muted' });
            
            try {
              const currentDepth = this.taskDepths[t.title] || 2;
              const context = answers[t.title] ? answers[t.title].join('. ') : '';
              
              const result = await this.plugin.integrationService.breakdownTask(t.title, { 
                energyLevel: 'moderate', 
                depth: currentDepth,
                context: context 
              });
              
              // Increment depth for next breakdown
              this.taskDepths[t.title] = Math.min(currentDepth + 1, 6);
              
              // Update button text
              const nextDepth = this.taskDepths[t.title];
              const bBtn = row.querySelector('.goblin-task-controls button:last-child') as HTMLButtonElement;
              if (bBtn) {
                const nextLabel = nextDepth === 3 ? 'Break Down (Detailed)' :
                                nextDepth === 4 ? 'Break Down (Micro)' :
                                nextDepth >= 5 ? 'Break Down (Ultra-Fine)' : 'Break Down';
                bBtn.textContent = `🔨 ${nextLabel}`;
              }

              this.renderSteps(row, result, t.title);
              
            } catch (err) {
              console.error('Breakdown error', err);
              new Notice('AI breakdown failed - check your OpenAI API key in settings');
            } finally {
              spinner.remove();
            }
          }

          private renderSteps(row: HTMLElement, result: any, taskTitle: string) {
            const stepsEl = row.createEl('div', { cls: 'goblin-steps' });
            if (result.motivation) stepsEl.createEl('p', { text: result.motivation, cls: 'tiny muted' });
            
            result.steps.forEach((s: any, i: number) => {
              const li = stepsEl.createEl('div', { cls: 'goblin-step', attr: { 'data-ai': 'true' } });
              li.createEl('span', { text: `• ${s.title} (${s.estimatedMinutes}m)`, cls: 'goblin-step-text' });
              
              const controls = li.createEl('div', { cls: 'goblin-step-controls' });
              
              const addBtn = controls.createEl('button', { text: '+ Add', cls: 'step-add-btn mod-cta' });
              addBtn.onclick = () => {
                this.addStepToFile(s);
              };

              // Allow breaking down individual steps
              const breakdownBtn = controls.createEl('button', { text: '🔨', cls: 'step-breakdown-btn' });
              breakdownBtn.title = 'Break down this step with AI for more detail';
              breakdownBtn.onclick = async () => {
                await this.breakdownIndividualStep(li, s);
              };
            });

            // Add 'Add All Steps' for this task
            const addAllBtn = stepsEl.createEl('button', { text: '📋 Add All AI Steps', cls: 'mod-cta', attr: { style: 'margin-top: 12px;' } });
            addAllBtn.onclick = () => {
              this.addAllStepsForTask(result.steps);
            };
          }

          private async breakdownIndividualStep(stepEl: HTMLElement, step: any) {
            const spinner = stepEl.createEl('span', { text: ' 🤖', cls: 'muted' });
            try {
              const result = await this.plugin.integrationService.breakdownTask(step.title, { 
                energyLevel: 'moderate', 
                depth: 4, // Always go deep for individual steps
                context: step.description 
              });
              
              // Create sub-steps container
              const subStepsEl = stepEl.createEl('div', { cls: 'goblin-substeps', attr: { style: 'margin-left: 20px; margin-top: 8px; padding: 8px; background: var(--background-primary); border-radius: 4px;' } });
              result.steps.forEach((subStep: any) => {
                const subLi = subStepsEl.createEl('div', { cls: 'goblin-substep', attr: { style: 'display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 0.9em;' } });
                subLi.createEl('span', { text: `  ◦ ${subStep.title} (${subStep.estimatedMinutes}m)` });
                
                const addSubBtn = subLi.createEl('button', { text: '+ Add', cls: 'step-add-btn', attr: { style: 'font-size: 0.8em; padding: 2px 6px;' } });
                addSubBtn.onclick = () => {
                  this.addStepToFile(subStep);
                };
              });
            } catch (err) {
              console.error('Sub-breakdown error', err);
              new Notice('Failed to break down step further');
            } finally {
              spinner.remove();
            }
          }

          private addStepToFile(step: any) {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
              const editor = view.editor;
              const insertion = `    - [ ] ${step.title} (${step.estimatedMinutes}min)`;
              editor.replaceSelection(editor.getSelection() + '\n' + insertion + '\n');
              new Notice('Step added to file');
            }
          }

          private addAllStepsForTask(steps: any[]) {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
              const editor = view.editor;
              const insertion = steps.map((s: any) => `    - [ ] ${s.title} (${s.estimatedMinutes}min)`).join('\n');
              editor.replaceSelection(editor.getSelection() + '\n' + insertion + '\n');
              new Notice('All steps added for task');
            }
          }

          private async addAllGeneratedSteps() {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!view) { 
              new Notice('Open a markdown file to insert into'); 
              return; 
            }
            const editor = view.editor;
            
            // Find all generated steps in the modal
            const allSteps = this.contentEl.querySelectorAll('.goblin-step-text');
            if (allSteps.length === 0) {
              new Notice('No steps generated yet - try breaking down some tasks first');
              return;
            }
            
            let insertion = '';
            allSteps.forEach((stepEl) => {
              const text = stepEl.textContent;
              if (text) {
                insertion += '\n    - [ ] ' + text;
              }
            });
            
            editor.replaceSelection(editor.getSelection() + insertion + '\n');
            new Notice(`Added ${allSteps.length} generated steps to file`);
          }
          onClose() {
            const { contentEl } = this; contentEl.empty();
          }
        }
        const modal = new GoblinModeModal(this.app, this, tasks);
        modal.open();
      }
    });
  }

  async activateView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_PROACTIVITY);

    if (leaves.length > 0) {
      // If a view already exists, use it
      leaf = leaves[0];
    } else {
      // Otherwise create a new one in the right sidebar
      leaf = workspace.getRightLeaf(false);
      await leaf?.setViewState({ type: VIEW_TYPE_PROACTIVITY, active: true });
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  openTaskBreakdownModal(file?: any) {
    const modal = new TaskBreakdownModal(
      this.app,
      this.settings,
      this.integrationService,
      file
    );
    modal.open();
  }

  showEnergyCheckModal() {
    // Create a simple modal for energy level assessment
    const modal = new class extends Modal {
      constructor(app: App, private plugin: ProactivityPlugin) {
        super(app);
      }

      onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Energy Level Check' });

        const description = contentEl.createEl('p', {
          text: 'How\'s your energy and focus right now? This helps me suggest appropriate tasks.'
        });

        const energyLevels = [
          { level: 'high', label: '⚡ High - Ready for complex tasks', color: '#22c55e' },
          { level: 'moderate', label: '🔋 Moderate - Normal capacity', color: '#3b82f6' },
          { level: 'low', label: '🪫 Low - Simple tasks only', color: '#f59e0b' },
          { level: 'depleted', label: '😴 Depleted - Need rest/micro-tasks', color: '#ef4444' }
        ];

        energyLevels.forEach(({ level, label, color }) => {
          const button = contentEl.createEl('button', {
            text: label,
            cls: 'mod-cta energy-level-button'
          });
          button.style.backgroundColor = color;
          button.style.margin = '10px 0';
          button.style.width = '100%';

          button.onclick = async () => {
            await this.plugin.handleEnergyLevelUpdate(level);
            this.close();
          };
        });
      }

      onClose() {
        const { contentEl } = this;
        contentEl.empty();
      }
    }(this.app, this);

    modal.open();
  }

  async handleEnergyLevelUpdate(energyLevel: string) {
    // Update current energy level
    this.updateStatusBar(`Energy: ${energyLevel}`);

    // Send to backend for pattern tracking
    await this.integrationService.updateEnergyLevel(energyLevel);

    // Get task suggestions based on energy level
    const suggestions = await this.integrationService.getTaskSuggestions(energyLevel);

    if (suggestions && suggestions.length > 0) {
      new Notice(`Based on your ${energyLevel} energy, I suggest: ${suggestions[0].title}`);
    }
  }

  startFocusSession() {
    // Start a Pomodoro-style focus session with ADHD accommodations
    const sessionLength = 25; // minutes, can be customized

    new Notice(`Starting ${sessionLength}-minute focus session. I'll check in periodically.`);
    this.updateStatusBar('🎯 Focusing');

    // Set up gentle check-ins during the session
    const checkInInterval = setInterval(() => {
      // Gentle, non-disruptive check-in
      this.patternDetector.checkFocusState();
    }, 10 * 60 * 1000); // Every 10 minutes

    // End session reminder
    setTimeout(() => {
      clearInterval(checkInInterval);
      new Notice('Focus session complete! Great job. Time for a break?');
      this.updateStatusBar('✅ Session done');
    }, sessionLength * 60 * 1000);
  }

  async triggerProcrastinationIntervention() {
    new Notice('I\'m here to help! Let\'s break through this together.');

    // Get current context
    const activeFile = this.app.workspace.getActiveFile();
    const selectedText = await this.integrationService.getSelectedText();

    // Open task breakdown for immediate action
    this.openTaskBreakdownModal(activeFile);

    // Also trigger body doubling mode
    this.updateStatusBar('🤝 Body doubling active');
  }

  celebrateProgress() {
    const celebrations = [
      '🎉 Amazing work! Every step counts.',
      '👏 You\'re making real progress!',
      '⭐ Your persistence is paying off!',
      '🚀 Look at you, crushing it!',
      '💪 Your ADHD brain is powerful!'
    ];

    const celebration = celebrations[Math.floor(Math.random() * celebrations.length)];
    new Notice(celebration);

    // Log progress for pattern recognition
    this.integrationService.logProgressCelebration();
  }

  startProactiveNotifications() {
    // Set up gentle, context-aware notifications
    this.notificationInterval = setInterval(async () => {
      const shouldNotify = await this.shouldSendProactiveNotification();

      if (shouldNotify) {
        await this.sendContextualNotification();
      }
    }, this.settings.energyCheckInterval * 60 * 1000);
  }

  async shouldSendProactiveNotification(): Promise<boolean> {
    // Check various factors to determine if notification is appropriate
    const patterns = await this.patternDetector.getCurrentPatterns();
    const isInHyperfocus = patterns.some(p => p.type === 'hyperfocus');
    const userActivity = await this.integrationService.getUserActivity();

    // Don't interrupt hyperfocus unless it's health-related
    if (isInHyperfocus) {
      return patterns.some(p => p.healthConcern);
    }

    // Don't overwhelm with notifications
    const recentNotifications = this.integrationService.getRecentNotificationCount();
    if (recentNotifications >= 3) {
      return false;
    }

    // Check if user seems stuck or inactive
    return userActivity.seemsStuck || userActivity.inactiveForMinutes > 45;
  }

  async sendContextualNotification() {
    const context = await this.integrationService.getCurrentContext();
    const notification = await this.generateContextualNotification(context);

    if (notification) {
      new Notice(notification.message);

      if (notification.action) {
        // Execute suggested action after a delay
        setTimeout(() => {
          this[notification.action]();
        }, 5000);
      }
    }
  }

  async generateContextualNotification(context: any) {
    // Generate appropriate notification based on current context
    if (context.hasUnfinishedTasks && context.energyLevel !== 'depleted') {
      return {
        message: 'I noticed some tasks in progress. Want to tackle one together?',
        action: 'activateView'
      };
    }

    if (context.inactiveForMinutes > 60) {
      return {
        message: 'How\'s your dissertation work going today? Any goals you\'d like to set?',
        action: 'showEnergyCheckModal'
      };
    }

    return null;
  }

  updateStatusBar(status: string) {
    this.statusBarItem.setText(`Proactivity: ${status}`);
  }
}

// Settings tab
class ProactivitySettingTab extends PluginSettingTab {
  plugin: ProactivityPlugin;

  constructor(app: App, plugin: ProactivityPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Proactivity Settings' });

    // API Configuration
    containerEl.createEl('h3', { text: 'API Configuration' });
    
    containerEl.createEl('p', { 
      text: '🤖 For AI-powered task breakdowns in Goblin Mode, add your OpenAI API key below. Without this, you\'ll get basic fallback breakdowns.',
      cls: 'setting-item-description'
    });

    new Setting(containerEl)
      .setName('OpenAI API Key')
      .setDesc('Get your API key from https://platform.openai.com/api-keys - enables smart task breakdown')
      .addText(text => text
        .setPlaceholder('sk-...')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.apiKey = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Server URL')
      .setDesc('Proactivity backend server URL (optional - OpenAI direct is preferred)')
      .addText(text => text
        .setPlaceholder('http://localhost:3001')
        .setValue(this.plugin.settings.serverUrl)
        .onChange(async (value) => {
          this.plugin.settings.serverUrl = value;
          await this.plugin.saveSettings();
        }));

    // ADHD Support Settings
    containerEl.createEl('h3', { text: 'ADHD Support Features' });

    new Setting(containerEl)
      .setName('Enable Proactive Notifications')
      .setDesc('Receive gentle, context-aware notifications and check-ins')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableProactiveNotifications)
        .onChange(async (value) => {
          this.plugin.settings.enableProactiveNotifications = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Enable Pattern Detection')
      .setDesc('Detect ADHD patterns like procrastination and hyperfocus')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enablePatternDetection)
        .onChange(async (value) => {
          this.plugin.settings.enablePatternDetection = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Enable Hyperfocus Protection')
      .setDesc('Get gentle reminders during extended work sessions')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableHyperfocusProtection)
        .onChange(async (value) => {
          this.plugin.settings.enableHyperfocusProtection = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Max Daily Notifications')
      .setDesc('Limit notifications to prevent overwhelm')
      .addSlider(slider => slider
        .setLimits(3, 20, 1)
        .setValue(this.plugin.settings.maxDailyNotifications)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.maxDailyNotifications = value;
          await this.plugin.saveSettings();
        }));

    // Obsidian Integration Settings
    containerEl.createEl('h3', { text: 'Obsidian Integration' });

    new Setting(containerEl)
      .setName('Dissertation Folder Path')
      .setDesc('Path to your dissertation notes folder')
      .addText(text => text
        .setPlaceholder('Dissertation')
        .setValue(this.plugin.settings.obsidianIntegration.dissertationFolderPath)
        .onChange(async (value) => {
          this.plugin.settings.obsidianIntegration.dissertationFolderPath = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Enable Smart Linking')
      .setDesc('Automatically create connections between related notes')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.obsidianIntegration.enableSmartLinking)
        .onChange(async (value) => {
          this.plugin.settings.obsidianIntegration.enableSmartLinking = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Enable Progress Tracking')
      .setDesc('Track your writing progress and patterns')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.obsidianIntegration.enableProgressTracking)
        .onChange(async (value) => {
          this.plugin.settings.obsidianIntegration.enableProgressTracking = value;
          await this.plugin.saveSettings();
        }));

    // Browser Extension Sync Settings
    containerEl.createEl('h3', { text: 'Browser Extension Sync' });
    
    containerEl.createEl('p', { 
      text: '🔄 Sync tasks, energy levels, and focus sessions with the Proactivity browser extension.',
      cls: 'setting-item-description'
    });

    new Setting(containerEl)
      .setName('Enable Browser Extension Sync')
      .setDesc('Sync data with browser extension via localStorage and API')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.browserExtensionSync.enableSync)
        .onChange(async (value) => {
          this.plugin.settings.browserExtensionSync.enableSync = value;
          await this.plugin.saveSettings();
          
          // Restart sync if enabled, stop if disabled
          if (value) {
            this.plugin.startBrowserExtensionSync();
          } else if (this.plugin.syncInterval) {
            clearInterval(this.plugin.syncInterval);
          }
        }));

    new Setting(containerEl)
      .setName('Sync Interval (minutes)')
      .setDesc('How often to sync with browser extension')
      .addSlider(slider => slider
        .setLimits(1, 30, 1)
        .setValue(this.plugin.settings.browserExtensionSync.syncInterval)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.browserExtensionSync.syncInterval = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Sync Tasks')
      .setDesc('Share tasks between Obsidian and browser extension')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.browserExtensionSync.syncTasks)
        .onChange(async (value) => {
          this.plugin.settings.browserExtensionSync.syncTasks = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Sync Energy Levels')
      .setDesc('Share energy level settings between platforms')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.browserExtensionSync.syncEnergyLevels)
        .onChange(async (value) => {
          this.plugin.settings.browserExtensionSync.syncEnergyLevels = value;
          await this.plugin.saveSettings();
        }));

    // Enforcement Settings
    containerEl.createEl('h3', { text: 'Productivity Enforcement' });
    
    containerEl.createEl('p', { 
      text: '🔒 Configure strict productivity enforcement to help maintain focus.',
      cls: 'setting-item-description'
    });

    new Setting(containerEl)
      .setName('Enable Strict Mode')
      .setDesc('Block all websites until daily tasks are completed')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enforcement.enableStrictMode)
        .onChange(async (value) => {
          this.plugin.settings.enforcement.enableStrictMode = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Block All Websites')
      .setDesc('When strict mode is active, block all web browsing')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enforcement.blockAllWebsites)
        .onChange(async (value) => {
          this.plugin.settings.enforcement.blockAllWebsites = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Require Daily Task Completion')
      .setDesc('Unlock web browsing only after completing at least one task')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enforcement.requireDailyTaskCompletion)
        .onChange(async (value) => {
          this.plugin.settings.enforcement.requireDailyTaskCompletion = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Allowed Domains')
      .setDesc('Domains that remain accessible even in strict mode (comma-separated)')
      .addTextArea(text => text
        .setPlaceholder('localhost, obsidian.md, github.com')
        .setValue(this.plugin.settings.enforcement.allowedDomains.join(', '))
        .onChange(async (value) => {
          this.plugin.settings.enforcement.allowedDomains = value.split(',').map(d => d.trim());
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Enforcement Hours')
      .setDesc('Active enforcement time range')
      .addText(text => text
        .setPlaceholder('09:00')
        .setValue(this.plugin.settings.enforcement.enforcementStartTime)
        .onChange(async (value) => {
          this.plugin.settings.enforcement.enforcementStartTime = value;
          await this.plugin.saveSettings();
        }))
      .addText(text => text
        .setPlaceholder('17:00')
        .setValue(this.plugin.settings.enforcement.enforcementEndTime)
        .onChange(async (value) => {
          this.plugin.settings.enforcement.enforcementEndTime = value;
          await this.plugin.saveSettings();
        }));
  }
}