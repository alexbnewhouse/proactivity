import { App, TFile, Notice, MetadataCache, MarkdownView, TFolder } from 'obsidian';
import { ProactivitySettings } from './main';
import { ProactivityApiClient } from './api-client';

/**
 * Service for deep integration with Obsidian's features
 * Handles note manipulation, task tracking, and progress monitoring
 */
export class ObsidianIntegrationService {
  private app: App;
  private settings: ProactivitySettings;
  private apiClient: ProactivityApiClient;
  private dailyNotificationCount: number = 0;
  private lastNotificationReset: string = '';

  constructor(app: App, settings: ProactivitySettings) {
    this.app = app;
    this.settings = settings;
    this.apiClient = new ProactivityApiClient(settings);
    this.resetDailyCountIfNeeded();
  }

  updateSettings(settings: ProactivitySettings) {
    this.settings = settings;
    this.apiClient.updateSettings(settings);
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
*Created with Proactivity*`;

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
    // Update locally first
    const dailyNotePath = await this.getDailyNotePath();
    if (dailyNotePath) {
      try {
        const file = await this.getOrCreateFile(dailyNotePath);
        const content = await this.app.vault.read(file);

        // Update or add energy level section
        const energySection = `\n## Energy Tracking\n\n- ${new Date().toLocaleTimeString()}: ${energyLevel}\n`;
        const updatedContent = this.updateDailyNoteSection(content, 'Energy Tracking', energySection);

        await this.app.vault.modify(file, updatedContent);
      } catch (error) {
        console.error('Error updating energy level locally:', error);
      }
    }

    // Sync with backend
    await this.apiClient.safeApiCall(
      () => this.apiClient.updateEnergyLevel(energyLevel),
      undefined,
      'Failed to sync energy level with backend'
    );
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
    // Update daily note locally
    const dailyNotePath = await this.getDailyNotePath();
    if (dailyNotePath) {
      try {
        const file = await this.getOrCreateFile(dailyNotePath);
        const content = await this.app.vault.read(file);

        const taskEntry = `- [ ] ${task.title} (${task.estimatedMinutes}min) - Started: ${new Date().toLocaleTimeString()}\n`;
        const updatedContent = this.updateDailyNoteSection(content, 'Tasks', `\n## Tasks\n\n${taskEntry}`);

        await this.app.vault.modify(file, updatedContent);
        new Notice(`Started: ${task.title}`);
      } catch (error) {
        console.error('Error starting task locally:', error);
      }
    }

    // Start tracking with backend
    await this.apiClient.safeApiCall(
      () => this.apiClient.startTask(task.id || `task_${Date.now()}`, task.estimatedMinutes),
      undefined,
      'Failed to sync task start with backend'
    );

    // Record activity for pattern detection
    await this.apiClient.safeApiCall(
      () => this.apiClient.recordActivity('task_start', {
        taskId: task.id,
        title: task.title,
        estimatedMinutes: task.estimatedMinutes,
        complexity: task.complexity
      })
    );
  }

  /**
   * Get task suggestions based on current context and energy level
   */
  async getTaskSuggestions(energyLevel: string): Promise<any[]> {
    const context = await this.getCurrentContext();
    
    // Try to get suggestions from backend first
    const backendSuggestions = await this.apiClient.safeApiCall(
      () => this.apiClient.getTaskSuggestions(energyLevel, 30),
      null,
      'Using local task suggestions'
    );

    if (backendSuggestions?.success) {
      return backendSuggestions.data;
    }

    // Fallback to local suggestions
    return this.getLocalTaskSuggestions(energyLevel, context);
  }

  private async getLocalTaskSuggestions(energyLevel: string, context: any): Promise<any[]> {
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

    return suggestions.slice(0, 5).map((task, index) => ({
      ...task,
      id: task.id || `suggestion_${Date.now()}_${index}`,
      adhdOptimized: true
    }));
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

  /**
   * Breakdown a high-level task into actionable steps using OpenAI
   */
  async breakdownTask(rawTask: string, opts: { energyLevel?: string; depth?: number; availableTime?: number; context?: string }): Promise<{ motivation?: string; steps: any[] }> {
    const { energyLevel = 'moderate', depth = 3, availableTime = 30, context = '' } = opts || {};
    
    // First try OpenAI direct if API key is available
    if (this.settings.apiKey && this.settings.apiKey.startsWith('sk-')) {
      try {
        return await this.breakdownWithOpenAI(rawTask, { energyLevel, depth, availableTime, context });
      } catch (e) {
        console.warn('OpenAI breakdown failed, trying backend', e);
      }
    }

    // Fallback to backend server
    const payload = {
      task: rawTask,
      context,
      depth,
      energyLevel,
      availableTime,
      settingsSnapshot: {
        gentleTone: this.settings.adhdSupport.useGentleTone,
        includeMotivation: this.settings.adhdSupport.includeMotivation,
        limitCognitiveLoad: this.settings.adhdSupport.limitCognitiveLoad
      }
    };
    const endpoint = `${this.settings.serverUrl}/api/tasks/breakdown`;
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': this.settings.apiKey || '' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const json = await resp.json();
      if (json?.data?.steps?.length) {
        return {
          motivation: json.data.motivation,
          steps: json.data.steps.map((s: any, i: number) => ({
            id: s.id || `step-${i}`,
            title: s.title,
            description: s.description || '',
            estimatedMinutes: s.estimatedMinutes || 10,
            complexity: s.complexity || 'simple',
            tips: s.tips || []
          }))
        };
      }
      throw new Error('Empty steps');
    } catch (e) {
      console.warn('breakdownTask fallback', e);
      return this.getFallbackBreakdown(rawTask, depth);
    }
  }

  /**
   * Parse tasks from raw text
   */
  parseTasksFromText(text: string): { line: string; title: string; indent: string; estimatedMinutes?: number }[] {
    const lines = text.split(/\r?\n/);
    const tasks: { line: string; title: string; indent: string; estimatedMinutes?: number }[] = [];
    const taskRegex = /^(\s*)- \[( |x)\] (.+)$/;
    for (const line of lines) {
      const m = line.match(taskRegex);
      if (m) {
        const indent = m[1];
        const full = m[3];
        const timeMatch = full.match(/\((\d+)min\)/);
        const est = timeMatch ? parseInt(timeMatch[1]) : undefined;
        const title = full.replace(/\s*\(\d+min\).*/, '');
        tasks.push({ line, title: title.trim(), indent, estimatedMinutes: est });
      }
    }
    return tasks;
  }

  /**
   * Generate AI-powered clarifying questions for a task
   */
  async generateClarifyingQuestions(taskTitle: string, context?: string): Promise<string[]> {
    // Try AI-powered questions first
    if (this.settings.apiKey && this.settings.apiKey.startsWith('sk-')) {
      try {
        return await this.generateAIClarifyingQuestions(taskTitle, context);
      } catch (e) {
        console.warn('AI clarifying questions failed, using fallback', e);
      }
    }
    
    // Fallback to rule-based questions
    return this.getFallbackClarifyingQuestions(taskTitle);
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
*Generated by Proactivity*`;
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

    if (!folder || !(folder instanceof TFolder)) return [];

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

  /**
   * Direct OpenAI breakdown using stored API key
   */
  private async breakdownWithOpenAI(rawTask: string, opts: { energyLevel?: string; depth?: number; availableTime?: number; context?: string }): Promise<{ motivation?: string; steps: any[] }> {
    const { energyLevel = 'moderate', depth = 3, availableTime = 30, context = '' } = opts;
    
    const granularityPrompt = depth <= 2 ? 'high-level actionable steps' : 
                             depth === 3 ? 'detailed micro-steps (5-15 minutes each)' : 
                             'extremely granular micro-tasks (2-8 minutes each)';
    
    const systemPrompt = `You are an ADHD-aware task breakdown assistant. Break down tasks into ${granularityPrompt} that are:
- Specific and actionable (start with action verbs)
- Appropriately sized for ${energyLevel} energy level
- Include time estimates
- Consider ADHD challenges like executive dysfunction and overwhelm

Energy context: ${energyLevel}
Available time: ${availableTime} minutes
Additional context: ${context || 'None'}

Return JSON with: { "motivation": "brief encouraging note", "steps": [{"title": "action", "description": "details", "estimatedMinutes": number, "complexity": "micro|simple|moderate"}] }`;

    const userPrompt = `Break down this task: "${rawTask}"`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) throw new Error('No content from OpenAI');
      
      // Parse JSON response
      const parsed = JSON.parse(content);
      
      return {
        motivation: parsed.motivation || 'AI-powered breakdown ready!',
        steps: (parsed.steps || []).map((s: any, i: number) => ({
          id: `ai-step-${i}`,
          title: s.title,
          description: s.description || '',
          estimatedMinutes: s.estimatedMinutes || 10,
          complexity: s.complexity || 'simple',
          tips: s.tips || []
        }))
      };
    } catch (e) {
      console.error('OpenAI breakdown error:', e);
      throw e;
    }
  }

  /**
   * Fallback breakdown when AI services are unavailable
   */
  private getFallbackBreakdown(rawTask: string, depth: number): { motivation?: string; steps: any[] } {
    const baseSteps = [
      { title: `Clarify goal for: ${rawTask}`, description: 'Write one sentence outcome', estimatedMinutes: 5, complexity: 'micro' },
      { title: 'List 3 sub-points', description: 'Low-friction brain dump', estimatedMinutes: 8, complexity: 'micro' },
      { title: 'Start with easiest sub-point', description: 'Momentum first', estimatedMinutes: 12, complexity: 'simple' }
    ];

    if (depth >= 4) {
      // More granular fallback for deeper breakdowns
      return {
        motivation: 'Ultra-detailed fallback breakdown',
        steps: [
          { title: `Open relevant document for: ${rawTask}`, description: 'Just open the file', estimatedMinutes: 2, complexity: 'micro' },
          { title: 'Read first paragraph', description: 'Orient yourself', estimatedMinutes: 3, complexity: 'micro' },
          { title: 'Write one bullet point', description: 'Any bullet point', estimatedMinutes: 5, complexity: 'micro' },
          { title: 'Write second bullet point', description: 'Build momentum', estimatedMinutes: 5, complexity: 'micro' },
          { title: 'Connect the two points', description: 'Add transition', estimatedMinutes: 8, complexity: 'simple' }
        ]
      };
    }

    return {
      motivation: 'Fallback breakdown – try connecting to OpenAI for better results.',
      steps: baseSteps
    };
  }

  /**
   * AI-powered clarifying questions using OpenAI
   */
  private async generateAIClarifyingQuestions(taskTitle: string, context?: string): Promise<string[]> {
    const systemPrompt = `You are an ADHD-aware task clarification assistant. Generate 3-4 smart clarifying questions that help break down vague or complex tasks into actionable steps. Focus on:
- Specific outcomes and deliverables
- Context and constraints  
- Dependencies and prerequisites
- Success criteria
- Time and energy considerations

Keep questions short, direct, and helpful for someone with ADHD who may struggle with task initiation.`;

    const userPrompt = `Task: "${taskTitle}"
${context ? `Additional context: ${context}` : ''}

Generate 3-4 clarifying questions that would help make this task more actionable and specific.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.8,
          max_tokens: 400
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) throw new Error('No content from OpenAI');
      
      // Extract questions from the response
      const questions = content
        .split('\n')
        .filter((line: string) => line.trim() && (line.includes('?') || line.match(/^\d+\./)))
        .map((line: string) => line.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '').trim())
        .filter((q: string) => q.endsWith('?'))
        .slice(0, 4);
      
      return questions.length > 0 ? questions : this.getFallbackClarifyingQuestions(taskTitle);
    } catch (e) {
      console.error('AI clarifying questions error:', e);
      throw e;
    }
  }

  /**
   * Fallback rule-based clarifying questions
   */
  private getFallbackClarifyingQuestions(taskTitle: string): string[] {
    const questions: string[] = [];
    if (taskTitle.split(' ').length < 4) {
      questions.push('What specific outcome do you want from this task?');
    }
    if (!/[A-Z]/.test(taskTitle.charAt(0))) {
      questions.push('Should this start with an action verb (e.g., Draft, Outline, Analyze)?');
    }
    if (!/(write|draft|outline|analy|review|collect|organize|refactor|summari|read)/i.test(taskTitle)) {
      questions.push('Which action verb best describes this task?');
    }
    questions.push('What would "done" look like in one sentence?');
    if (taskTitle.length > 60) {
      questions.push('Can this be split into smaller independent parts?');
    }
    return [...new Set(questions)].slice(0, 4);
  }

  /**
   * Add a task to the vault (usually in daily notes)
   */
  async addTaskToVault(taskTitle: string, priority: string = 'normal'): Promise<void> {
    const dailyNotePath = await this.getDailyNotePath();
    if (!dailyNotePath) return;

    try {
      const file = this.app.vault.getAbstractFileByPath(dailyNotePath) as TFile;
      let content = '';

      if (file) {
        content = await this.app.vault.read(file);
      } else {
        // Create daily note if it doesn't exist
        content = `# ${new Date().toDateString()}\n\n## Tasks\n\n`;
      }

      // Add task to content
      const taskLine = `- [ ] ${taskTitle}`;
      const priorityMarker = priority === 'high' ? ' !!!' : priority === 'low' ? ' !' : '';
      const newTaskLine = `${taskLine}${priorityMarker}\n`;

      // Find or create tasks section
      if (content.includes('## Tasks')) {
        content = content.replace('## Tasks\n', `## Tasks\n${newTaskLine}`);
      } else {
        content += `\n## Tasks\n${newTaskLine}`;
      }

      // Write back to file
      if (file) {
        await this.app.vault.modify(file, content);
      } else {
        await this.app.vault.create(dailyNotePath, content);
      }

      console.log(`Task added to vault: ${taskTitle}`);
    } catch (error) {
      console.error('Failed to add task to vault:', error);
      throw error;
    }
  }

  /**
   * Mark a task as completed
   */
  async completeTask(taskTitle: string): Promise<void> {
    const dailyNotePath = await this.getDailyNotePath();
    if (!dailyNotePath) return;

    try {
      const file = this.app.vault.getAbstractFileByPath(dailyNotePath) as TFile;
      if (!file) return;

      const content = await this.app.vault.read(file);
      const updatedContent = content.replace(
        new RegExp(`- \\[ \\] ${taskTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
        `- [x] ${taskTitle}`
      );

      await this.app.vault.modify(file, updatedContent);
      console.log(`Task completed: ${taskTitle}`);
    } catch (error) {
      console.error('Failed to complete task:', error);
      throw error;
    }
  }

  /**
   * Get today's tasks from daily note
   */
  async getTodaysTasks(): Promise<any[]> {
    const dailyNotePath = await this.getDailyNotePath();
    if (!dailyNotePath) return [];

    try {
      const file = this.app.vault.getAbstractFileByPath(dailyNotePath) as TFile;
      if (!file) return [];

      const content = await this.app.vault.read(file);
      const tasks = [];
      const taskRegex = /^- \[([ x])\] (.+)$/gm;
      let match;

      while ((match = taskRegex.exec(content)) !== null) {
        const completed = match[1] === 'x';
        const title = match[2];

        // Extract priority from title
        const priorityMatch = title.match(/(.+?)\s*(!{1,3})$/);
        const cleanTitle = priorityMatch ? priorityMatch[1] : title;
        const priority = priorityMatch
          ? (priorityMatch[2] === '!!!' ? 'high' : priorityMatch[2] === '!' ? 'low' : 'normal')
          : 'normal';

        tasks.push({
          id: `task-${Date.now()}-${tasks.length}`,
          title: cleanTitle,
          completed,
          priority,
          source: 'daily-note',
          estimatedMinutes: 25 // default estimate
        });
      }

      return tasks;
    } catch (error) {
      console.error('Failed to get today\'s tasks:', error);
      return [];
    }
  }
}