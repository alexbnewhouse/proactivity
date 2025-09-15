import { App, Plugin, PluginSettingTab, Setting, Notice, WorkspaceLeaf, ItemView, Modal } from 'obsidian';
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
  serverUrl: 'http://localhost:3001',
  enableProactiveNotifications: true,
  maxDailyNotifications: 12,
  defaultBreakdownDepth: 3,
  enablePatternDetection: true,
  enableHyperfocusProtection: true,
  procrastinationThreshold: 30,
  energyCheckInterval: 120,
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

  async onload() {
    await this.loadSettings();

    // Initialize core services
    this.integrationService = new ObsidianIntegrationService(this.app, this.settings);
    this.patternDetector = new ADHDPatternDetector(this.app, this.settings);

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

    // Add settings tab
    this.addSettingTab(new ProactivitySettingTab(this.app, this));

    new Notice('Proactivity: Your ADHD-friendly dissertation assistant is ready!');
  }

  onunload() {
    // Clean up intervals and detectors
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
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

    new Setting(containerEl)
      .setName('OpenAI API Key')
      .setDesc('Your OpenAI API key for AI-powered task breakdown')
      .addText(text => text
        .setPlaceholder('sk-...')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.apiKey = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Server URL')
      .setDesc('Proactivity backend server URL')
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
  }
}