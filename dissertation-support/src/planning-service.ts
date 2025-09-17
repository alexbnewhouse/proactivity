/**
 * ADHD-Friendly Planning Service
 * 
 * Philosophy:
 * - Break complex academic work into micro-tasks (5-25 min chunks)
 * - Clear structure with immediate next actions
 * - Context preservation to reduce working memory load
 * - Risk identification and mitigation upfront
 * - Progress tracking with realistic timelines
 */

// Use dynamic imports for Obsidian to make testing easier
declare const Notice: any;

import { AIService } from './ai-service';
import { Settings } from './settings-schema';

// Mock Obsidian App interface for testing
export interface VaultInterface {
  getAbstractFileByPath(path: string): any;
  create(path: string, content: string): Promise<any>;
  createFolder(path: string): Promise<any>;
}

export interface AppInterface {
  vault: VaultInterface;
}

export interface PlanMetadata {
  file: string;
  created: string;
  daysRemaining: number | null;
}

export interface PlanConfig {
  topic: string;
  planType: 'dissertation' | 'prospectus';
  deadline?: string;
  targetWordCount?: number;
  outputFolder?: string;
}

export interface TimelineCalculation {
  daysRemaining: number | null;
  weeksRemaining: number | null;
  timelineMeta: string;
  isOverdue: boolean;
}

export class PlanningService {
  private app: AppInterface;
  private aiService: AIService;

  constructor(app: AppInterface, aiService: AIService) {
    this.app = app;
    this.aiService = aiService;
  }

  /**
   * Generate a complete plan using AI
   * ADHD-friendly: Breaks complex academic work into manageable pieces
   */
  async generatePlan(config: PlanConfig): Promise<string> {
    if (!config.topic.trim()) {
      throw new Error('Dissertation topic is required');
    }

    const promptContext = this.buildPromptContext(config);
    const plan = await this.aiService.generatePlan(config.planType, config.topic, promptContext);
    
    return plan;
  }

  /**
   * Generate delta update for existing plan
   * ADHD-friendly: Focuses on changes and immediate next actions
   */
  async generateDeltaUpdate(config: PlanConfig, previousPlan: PlanMetadata): Promise<string> {
    const delta = await this.aiService.generateDeltaUpdate(config.planType, config.topic, previousPlan);
    return delta;
  }

  /**
   * Create plan file with proper structure and metadata
   * ADHD-friendly: Consistent location, rich frontmatter for context
   */
  async createPlanFile(config: PlanConfig, planContent: string): Promise<{ filePath: string; metadata: PlanMetadata }> {
    const today = new Date().toISOString().split('T')[0];
    const timeline = this.calculateTimeline(config.deadline);
    
    // Create file path
    const fileName = this.generateFileName(config.planType, today);
    const filePath = await this.buildFilePath(fileName, config.outputFolder);
    
    // Generate file content
    const content = this.buildFileContent({
      config,
      planContent,
      today,
      timeline,
    });
    
    // Create the file
    await this.safeCreateFile(filePath, content);
    
    const metadata: PlanMetadata = {
      file: filePath,
      created: today,
      daysRemaining: timeline.daysRemaining,
    };
    
    return { filePath, metadata };
  }

  /**
   * Create delta update file
   */
  async createDeltaFile(config: PlanConfig, deltaContent: string, previousPlan: PlanMetadata): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    const fileName = `${config.planType === 'prospectus' ? 'Prospectus' : 'Dissertation'} Plan Delta - ${today}.md`;
    
    let filePath = fileName;
    if (config.outputFolder?.trim()) {
      await this.ensureFolderExists(config.outputFolder);
      filePath = `${config.outputFolder.replace(/\/$/, '')}/${fileName}`;
    }
    
    const content = `# ${config.planType === 'prospectus' ? 'Prospectus' : 'Dissertation'} Plan Delta (${today})\n\n${deltaContent}`;
    await this.safeCreateFile(filePath, content);
    
    return filePath;
  }

  /**
   * Calculate timeline information for planning
   * ADHD-friendly: Clear time pressure communication
   */
  private calculateTimeline(deadline?: string): TimelineCalculation {
    if (!deadline) {
      return {
        daysRemaining: null,
        weeksRemaining: null,
        timelineMeta: 'No specific deadline provided.',
        isOverdue: false,
      };
    }

    const parsed = new Date(deadline);
    if (isNaN(parsed.getTime())) {
      return {
        daysRemaining: null,
        weeksRemaining: null,
        timelineMeta: 'Invalid deadline format.',
        isOverdue: false,
      };
    }

    const now = new Date();
    const diffMs = parsed.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return {
        daysRemaining: 0,
        weeksRemaining: 0,
        timelineMeta: `Deadline date (${deadline}) appears in the past; treat as needing rapid triage scaffolding.`,
        isOverdue: true,
      };
    }

    const daysRemaining = Math.ceil(diffMs / 86400000);
    const weeksRemaining = Math.ceil(daysRemaining / 7);

    return {
      daysRemaining,
      weeksRemaining,
      timelineMeta: `${daysRemaining} days (~${weeksRemaining} weeks) remain until the deadline (${deadline}). Provide a realistic weekly milestone ladder that de-risks slippage.`,
      isOverdue: false,
    };
  }

  /**
   * Build context-rich prompt for AI planning
   * ADHD-friendly: Emphasizes micro-tasks and concrete actions
   */
  private buildPromptContext(config: PlanConfig): string {
    const timeline = this.calculateTimeline(config.deadline);
    const focusLabel = config.planType === 'prospectus' ? 'prospectus' : 'dissertation';
    
    const sections = config.planType === 'prospectus'
      ? '1. Required prospectus sections (title page, abstract (if needed), introduction / background, problem statement, purpose, research questions/hypotheses, significance, literature review scaffold, proposed methodology, expected contributions).'
      : '1. Major chapters/sections (Introduction, Literature Review, Methods, Results, Discussion, Conclusion, Appendices).';
    
    const pacingLine = config.targetWordCount 
      ? `Total target length ~${config.targetWordCount.toLocaleString()} words. Provide rough word allocation per major section (percent + est words).`
      : 'No explicit word target provided; focus on structural clarity.';

    return `I am preparing a ${focusLabel} about "${config.topic}".
Deadline context: ${timeline.timelineMeta}

${pacingLine}

Neurodivergent constraints (ADHD):
- Task initiation friction
- Working memory volatility / context loss between sessions
- Need concrete micro actions (5–25 min) instead of vague goals
- Risk of over-planning paralysis

Please generate a structured ${focusLabel} plan with:
${sections}
2. For each section: concrete micro-tasks (5–25 min granularity) that move it forward.
3. A timeline mapping weeks (${timeline.weeksRemaining ?? 'N/A'} if numeric) to high-level deliverables; front-load clarity tasks (outline, scoping) early. If word target given, include weekly cumulative word range suggestions.
4. A risk / mitigation list (3–5 items) focused on momentum threats.
5. Context preservation tips after each major section (what to capture before stopping).
6. A quick-start list for the next 3 sessions (bullet list, each ≤ 15 min).

Format:
- Use markdown
- Top-level heading with plan type and topic
- Include a summary table (Section | Key Outputs | Est. Micro Tasks)
- Timeline as a markdown table if possible

Keep tone encouraging, neutral, non-judgmental.`;
  }

  /**
   * Build complete file content with frontmatter and actions
   */
  private buildFileContent(params: {
    config: PlanConfig;
    planContent: string;
    today: string;
    timeline: TimelineCalculation;
  }): string {
    const { config, planContent, today, timeline } = params;
    const isProspectus = config.planType === 'prospectus';
    
    // Action buttons for future interactivity
    const actionsBlock = `
<div class="ds-plan-actions">
  <button class="ds-plan-seed-btn" data-plan-type="${config.planType}">Seed top bullets as micro tasks →</button>
  <button class="ds-plan-delta-btn" data-plan-type="${config.planType}">Generate delta update</button>
</div>
`;

    // Rich frontmatter for context and tracking
    const frontmatter = `---
created: ${today}
planType: ${config.planType}
topic: "${config.topic}"
${isProspectus ? 'prospectusDeadline' : 'deadline'}: "${config.deadline || ''}"
daysRemaining: ${timeline.daysRemaining ?? 'null'}
outputFolder: "${config.outputFolder || ''}"
---

# ${isProspectus ? 'Prospectus' : 'Dissertation'} Plan: ${config.topic}

Generated on: ${today}
${config.deadline ? `Target ${isProspectus ? 'Prospectus' : 'Dissertation'} Deadline: ${config.deadline}` : 'No deadline specified'}

${planContent}${actionsBlock}

---
*Generated by AI – refine and adapt based on advisor feedback and evolving clarity.*
`;

    return frontmatter;
  }

  /**
   * Generate consistent file names
   */
  private generateFileName(planType: 'dissertation' | 'prospectus', date: string): string {
    const prefix = planType === 'prospectus' ? 'Prospectus' : 'Dissertation';
    return `${prefix} Plan - ${date}.md`;
  }

  /**
   * Build file path with optional folder
   */
  private async buildFilePath(fileName: string, folder?: string): Promise<string> {
    if (!folder?.trim()) {
      return fileName;
    }
    
    await this.ensureFolderExists(folder);
    return `${folder.replace(/\/$/, '')}/${fileName}`;
  }

  /**
   * Ensure folder exists (supports nested folders)
   * ADHD-friendly: Reduces friction by auto-creating structure
   */
  private async ensureFolderExists(path: string): Promise<void> {
    const parts = path.split('/').filter(Boolean);
    let current = '';
    
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      
      const existing = this.app.vault.getAbstractFileByPath(current);
      if (!existing) {
        try {
          await this.app.vault.createFolder(current);
        } catch (error) {
          // Folder might already exist, ignore error
        }
      }
    }
  }

  /**
   * Create file safely without overwriting
   * ADHD-friendly: Never lose existing work
   */
  private async safeCreateFile(path: string, content: string): Promise<void> {
    const existing = this.app.vault.getAbstractFileByPath(path);
    
    if (!existing) {
      await this.app.vault.create(path, content);
      return;
    }

    // Generate unique name to avoid overwriting
    const extIndex = path.lastIndexOf('.');
    const base = extIndex === -1 ? path : path.substring(0, extIndex);
    const ext = extIndex === -1 ? '' : path.substring(extIndex);
    
    let i = 1;
    let candidate = `${base} (${i})${ext}`;
    
    while (this.app.vault.getAbstractFileByPath(candidate)) {
      i++;
      candidate = `${base} (${i})${ext}`;
    }
    
    await this.app.vault.create(candidate, content);
  }
}