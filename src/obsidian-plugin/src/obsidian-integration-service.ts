import { App, TFile, Notice, MetadataCache } from 'obsidian';
import { ProActivePhdSettings } from './main';

/**
 * Service for deep integration with Obsidian's features
 * Handles note manipulation, task tracking, and progress monitoring
 */
export class ObsidianIntegrationService {
  private app: App;
  private settings: ProActivePhdSettings;
  private dailyNotificationCount: number = 0;
  private lastNotificationReset: string = '';

  constructor(app: App, settings: ProActivePhdSettings) {
    this.app = app;
    this.settings = settings;
    this.resetDailyCountIfNeeded();
  }

  updateSettings(settings: ProActivePhdSettings) {
    this.settings = settings;
  }

  /**
   * Get current context from Obsidian environment
   */
  async getCurrentContext() {
    const activeFile = this.app.workspace.getActiveFile();
    const openFiles = this.app.workspace.getLeavesOfType('markdown').length;
    const selectedText = await this.getSelectedText();

    return {
      activeFile: activeFile?.name || null,
      activeFilePath: activeFile?.path || null,
      openFiles,
      selectedText,
      hasUnfinishedTasks: await this.hasUnfinishedTasks(),
      energyLevel: await this.getCurrentEnergyLevel(),
      inactiveForMinutes: this.getInactivityMinutes(),
      currentWorkingDirectory: this.getCurrentWorkingDirectory(),
      recentActivity: await this.getRecentActivity()
    };
  }

  /**
   * Get selected text from the active editor
   */
  async getSelectedText(): Promise<string | null> {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) return null;

    const editor = activeView.editor;
    return editor.getSelection() || null;
  }

  /**
   * Create a quick note for capturing thoughts
   */
  async createQuickNote() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const noteName = `Quick Note ${timestamp}`;
    const notePath = `${this.settings.obsidianIntegration.dailyNotePath}/${noteName}.md`;

    const noteContent = `# Quick Note

Created: ${new Date().toLocaleString()}
Tags: ${this.settings.obsidianIntegration.taskTagPrefix}/quick-note

## Thoughts

<!-- Write your thoughts here -->

## Next Actions

<!-- What do you want to do with this idea? -->

---
*Created with ProActive PhD*`;

    try {
      const file = await this.app.vault.create(notePath, noteContent);
      await this.app.workspace.getLeaf().openFile(file);
      new Notice('Quick note created! Start writing your thoughts.');
    } catch (error) {
      console.error('Error creating quick note:', error);
      new Notice('Error creating quick note. Check your settings.');
    }
  }

  /**
   * Update user's current energy level
   */
  async updateEnergyLevel(energyLevel: string) {
    const dailyNotePath = await this.getDailyNotePath();
    if (!dailyNotePath) return;

    try {
      const file = await this.getOrCreateFile(dailyNotePath);
      const content = await this.app.vault.read(file);

      // Update or add energy level section
      const energySection = `\n## Energy Tracking\n\n- ${new Date().toLocaleTimeString()}: ${energyLevel}\n`;
      const updatedContent = this.updateDailyNoteSection(content, 'Energy Tracking', energySection);

      await this.app.vault.modify(file, updatedContent);
    } catch (error) {
      console.error('Error updating energy level:', error);
    }
  }

  /**
   * Update current focus/task
   */
  async updateCurrentFocus(focus: string) {
    const dailyNotePath = await this.getDailyNotePath();
    if (!dailyNotePath) return;

    try {
      const file = await this.getOrCreateFile(dailyNotePath);
      const content = await this.app.vault.read(file);

      const focusSection = `\n## Current Focus\n\n${focus}\n\nStarted: ${new Date().toLocaleTimeString()}\n`;
      const updatedContent = this.updateDailyNoteSection(content, 'Current Focus', focusSection);

      await this.app.vault.modify(file, updatedContent);
    } catch (error) {
      console.error('Error updating current focus:', error);
    }
  }

  /**
   * Start tracking a task
   */
  async startTask(task: any) {
    const dailyNotePath = await this.getDailyNotePath();
    if (!dailyNotePath) return;

    try {
      const file = await this.getOrCreateFile(dailyNotePath);
      const content = await this.app.vault.read(file);

      const taskEntry = `- [ ] ${task.title} (${task.estimatedMinutes}min) - Started: ${new Date().toLocaleTimeString()}\n`;
      const updatedContent = this.updateDailyNoteSection(content, 'Tasks', `\n## Tasks\n\n${taskEntry}`);

      await this.app.vault.modify(file, updatedContent);

      new Notice(`Started: ${task.title}`);
    } catch (error) {
      console.error('Error starting task:', error);
    }
  }

  /**
   * Get task suggestions based on current context and energy level
   */
  async getTaskSuggestions(energyLevel: string): Promise<any[]> {
    const context = await this.getCurrentContext();
    const dissertationFiles = await this.getDissertationFiles();
    const unfinishedTasks = await this.getUnfinishedTasks();

    const suggestions = [];

    // Energy-based suggestions
    switch (energyLevel) {
      case 'high':
        suggestions.push(
          {
            title: 'Draft a new section',
            description: 'Use your high energy for creative writing',
            estimatedMinutes: 45,
            complexity: 'complex',
            source: 'energy-based'
          },
          {
            title: 'Analyze complex data',
            description: 'Perfect time for analytical work',
            estimatedMinutes: 60,
            complexity: 'complex',
            source: 'energy-based'
          }
        );
        break;

      case 'moderate':
        suggestions.push(
          {
            title: 'Edit existing content',
            description: 'Review and improve what you\'ve written',
            estimatedMinutes: 30,
            complexity: 'moderate',
            source: 'energy-based'
          },
          {
            title: 'Organize references',
            description: 'Structure your research materials',
            estimatedMinutes: 25,
            complexity: 'simple',
            source: 'energy-based'
          }
        );
        break;

      case 'low':
        suggestions.push(
          {
            title: 'Read one paper',
            description: 'Light reading and note-taking',
            estimatedMinutes: 20,
            complexity: 'simple',
            source: 'energy-based'
          },
          {
            title: 'Update citation format',
            description: 'Simple formatting tasks',
            estimatedMinutes: 15,
            complexity: 'micro',
            source: 'energy-based'
          }
        );
        break;

      case 'depleted':
        suggestions.push(
          {
            title: 'Review tomorrow\'s goals',
            description: 'Quick planning for when you\'re refreshed',
            estimatedMinutes: 10,
            complexity: 'micro',
            source: 'energy-based'
          }
        );
        break;
    }

    // Context-based suggestions
    if (context.activeFile && context.activeFile.includes('.md')) {
      suggestions.push({
        title: `Continue work on ${context.activeFile}`,
        description: 'Build on your current file',
        estimatedMinutes: 20,
        complexity: 'moderate',
        source: 'context-based'
      });
    }

    if (context.selectedText) {
      suggestions.push({
        title: 'Expand selected text',
        description: 'Develop the highlighted section further',
        estimatedMinutes: 15,
        complexity: 'simple',
        source: 'context-based'
      });
    }

    // Add unfinished tasks
    suggestions.push(...unfinishedTasks.slice(0, 2));

    return suggestions.slice(0, 5); // Limit to 5 suggestions to avoid overwhelm
  }

  /**
   * Get today's tasks from daily note
   */
  async getTodaysTasks(): Promise<any[]> {
    const dailyNotePath = await this.getDailyNotePath();
    if (!dailyNotePath) return [];

    try {
      const file = this.app.vault.getAbstractFileByPath(dailyNotePath);
      if (!file || !(file instanceof TFile)) return [];

      const content = await this.app.vault.read(file);
      return this.extractTasksFromContent(content);
    } catch (error) {
      console.error('Error getting today\'s tasks:', error);
      return [];
    }
  }

  /**
   * Check if there are unfinished tasks
   */
  async hasUnfinishedTasks(): Promise<boolean> {
    const tasks = await this.getTodaysTasks();
    return tasks.some(task => !task.completed);
  }

  /**
   * Get unfinished tasks
   */
  async getUnfinishedTasks(): Promise<any[]> {
    const tasks = await this.getTodaysTasks();
    return tasks.filter(task => !task.completed).map(task => ({
      ...task,
      source: 'existing-task'
    }));
  }

  /**
   * Log progress celebration for pattern recognition
   */
  async logProgressCelebration() {
    const dailyNotePath = await this.getDailyNotePath();
    if (!dailyNotePath) return;

    try {
      const file = await this.getOrCreateFile(dailyNotePath);
      const content = await this.app.vault.read(file);

      const celebrationEntry = `\n🎉 Progress celebrated at ${new Date().toLocaleTimeString()}\n`;
      const updatedContent = this.updateDailyNoteSection(content, 'Celebrations', `\n## Celebrations\n${celebrationEntry}`);

      await this.app.vault.modify(file, updatedContent);
    } catch (error) {
      console.error('Error logging celebration:', error);
    }
  }

  /**
   * Get recent notification count
   */
  getRecentNotificationCount(): number {
    this.resetDailyCountIfNeeded();
    return this.dailyNotificationCount;
  }

  /**
   * Increment notification count
   */
  incrementNotificationCount() {
    this.resetDailyCountIfNeeded();
    this.dailyNotificationCount++;
  }

  /**
   * Get user activity metrics
   */
  async getUserActivity() {
    const recentActivity = await this.getRecentActivity();
    const lastActivity = recentActivity[0];
    const inactiveMinutes = lastActivity
      ? Math.floor((Date.now() - lastActivity.timestamp) / (1000 * 60))
      : 120; // Default to 2 hours if no activity

    return {
      inactiveForMinutes: inactiveMinutes,
      seemsStuck: inactiveMinutes > 30 && inactiveMinutes < 120,
      recentFileChanges: recentActivity.length,
      lastActivity: lastActivity?.action || 'unknown'
    };
  }

  // Private helper methods

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
*Generated by ProActive PhD*`;
  }

  private updateDailyNoteSection(content: string, sectionName: string, newSection: string): string {
    const sectionRegex = new RegExp(`(## ${sectionName}\\n)[\\s\\S]*?(?=\\n## |\\n---|\$)`, 'i');

    if (sectionRegex.test(content)) {
      return content.replace(sectionRegex, newSection);
    } else {
      // If section doesn't exist, append it before the final divider or at the end
      const dividerIndex = content.lastIndexOf('\n---');
      if (dividerIndex !== -1) {
        return content.slice(0, dividerIndex) + newSection + '\n' + content.slice(dividerIndex);
      } else {
        return content + '\n' + newSection;
      }
    }
  }

  private extractTasksFromContent(content: string): any[] {
    const taskRegex = /^- \[([ x])\] (.+)$/gm;
    const tasks = [];
    let match;

    while ((match = taskRegex.exec(content)) !== null) {
      const completed = match[1] === 'x';
      const title = match[2];
      const timeMatch = title.match(/\((\d+)min\)/);
      const estimatedMinutes = timeMatch ? parseInt(timeMatch[1]) : 30;

      tasks.push({
        title: title.replace(/\s*\(\d+min\).*$/, ''),
        completed,
        estimatedMinutes,
        complexity: estimatedMinutes <= 15 ? 'micro' : estimatedMinutes <= 30 ? 'simple' : 'moderate'
      });
    }

    return tasks;
  }

  private async getDissertationFiles(): Promise<TFile[]> {
    const dissertationPath = this.settings.obsidianIntegration.dissertationFolderPath;
    const folder = this.app.vault.getAbstractFileByPath(dissertationPath);

    if (!folder || folder.children === undefined) return [];

    return folder.children.filter(file => file instanceof TFile && file.extension === 'md') as TFile[];
  }

  private getCurrentWorkingDirectory(): string {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return '';

    const pathParts = activeFile.path.split('/');
    return pathParts.slice(0, -1).join('/');
  }

  private async getRecentActivity(): Promise<any[]> {
    // This would track recent file modifications, task completions, etc.
    // For now, return mock data
    return [
      {
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
        action: 'file_modified',
        file: 'Chapter 3.md'
      }
    ];
  }

  private async getCurrentEnergyLevel(): Promise<string> {
    // This would read from today's daily note
    // For now, return default
    return 'moderate';
  }

  private getInactivityMinutes(): number {
    // This would calculate based on last interaction
    // For now, return mock data
    return 25;
  }

  private resetDailyCountIfNeeded() {
    const today = new Date().toDateString();
    if (this.lastNotificationReset !== today) {
      this.dailyNotificationCount = 0;
      this.lastNotificationReset = today;
    }
  }
}