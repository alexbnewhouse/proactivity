/**
 * ADHD-Friendly AI Service
 * 
 * Philosophy:
 * - Never crash - always return graceful fallbacks
 * - Clear, immediate feedback about what's happening
 * - Retry logic with exponential backoff
 * - Provider abstraction for future flexibility
 * - Minimal cognitive load for configuration
 */

// Use dynamic import for Obsidian to make testing easier
declare const Notice: any;

export interface AIProvider {
  name: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIServiceConfig {
  defaultProvider: AIProvider;
  retryAttempts?: number;
  timeoutMs?: number;
  enableLogging?: boolean;
}

export class AIService {
  private config: AIServiceConfig;
  private retryCount = 0;

  constructor(config: AIServiceConfig) {
    this.config = {
      retryAttempts: 3,
      timeoutMs: 30000, // 30s - reasonable for academic work
      enableLogging: false,
      ...config,
    };
  }

  /**
   * Update the AI service configuration (e.g., when API key changes)
   * ADHD-friendly: Allow configuration updates without recreating service
   */
  updateConfiguration(updates: Partial<AIServiceConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };
    
    // Reset retry count when configuration changes
    this.retryCount = 0;
    
    if (this.config.enableLogging) {
      console.log('[AIService] Configuration updated:', {
        provider: this.config.defaultProvider.name,
        hasApiKey: !!this.config.defaultProvider.apiKey,
      });
    }
  }

  /**
   * Generate plan content using AI
   * ADHD-friendly: Clear feedback, graceful errors, fast failure
   */
  async generatePlan(
    planType: 'dissertation' | 'prospectus',
    topic: string,
    additionalContext?: string
  ): Promise<string> {
    this.showProgressNotice(`🤖 Generating ${planType} plan with AI...`);
    
    try {
      const systemPrompt = this.buildSystemPrompt(planType);
      const userPrompt = this.buildPlanPrompt(planType, topic, additionalContext);
      
      const response = await this.makeRequest({
        systemPrompt,
        userPrompt,
        maxTokens: 2500,
        temperature: 0.7,
      });
      
      this.showSuccessNotice(`✅ ${planType} plan generated!`);
      return response.content;
      
    } catch (error) {
      console.error('[AIService] Plan generation failed:', error);
      this.showErrorNotice('❌ Failed to generate plan. Check your API key and try again.');
      
      // Return helpful fallback instead of crashing
      return this.getFallbackPlan(planType, topic);
    }
  }

  /**
   * Generate delta update for existing plan
   * ADHD-friendly: Shows what changed, focuses on next actions
   */
  async generateDeltaUpdate(
    planType: 'dissertation' | 'prospectus',
    topic: string,
    previousPlan: { file: string; created: string; daysRemaining: number | null }
  ): Promise<string> {
    this.showProgressNotice('🤖 Generating delta update...');
    
    try {
      const basePrompt = this.buildPlanPrompt(planType, topic);
      const deltaPrompt = `${basePrompt}

Previous plan created: ${previousPlan.created}
File: ${previousPlan.file}

Provide a DELTA UPDATE focusing on:
1. Adjusted timeline (${previousPlan.daysRemaining} days remaining)
2. Top 5 next micro-tasks
3. Any risk shifts
4. Concise recap

Keep it short and actionable.`;

      const response = await this.makeRequest({
        systemPrompt: 'You provide concise delta updates to existing structured academic plans, focusing on changes and immediate next actions.',
        userPrompt: deltaPrompt,
        maxTokens: 800,
        temperature: 0.6,
      });

      return response.content;

    } catch (error) {
      console.error('[AIService] Delta update failed:', error);
      return this.getFallbackPlan(planType, topic);
    }
  }

  /**
   * General AI request method for other services
   * ADHD-friendly: Consistent interface, graceful error handling
   */
  async requestAI(request: AIRequest): Promise<string> {
    try {
      const response = await this.makeRequest(request);
      return response.content;
    } catch (error) {
      console.error('[AIService] AI request failed:', error);
      throw new Error('AI request failed: ' + (error as Error).message);
    }
  }

  /**
   * Core AI request with retry logic and timeout
   */
  private async makeRequest(request: AIRequest): Promise<AIResponse> {
    const provider = this.config.defaultProvider;
    
    if (!provider.apiKey) {
      throw new Error('No API key provided');
    }

    for (let attempt = 0; attempt <= (this.config.retryAttempts || 3); attempt++) {
      try {
        const response = await this.performRequest(provider, request);
        this.retryCount = 0; // Reset on success
        return response;
        
      } catch (error) {
        if (attempt === (this.config.retryAttempts || 3)) {
          throw error; // Final attempt failed
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        this.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
    
    throw new Error('All retry attempts exhausted');
  }

  /**
   * Perform actual API request based on provider
   */
  private async performRequest(provider: AIProvider, request: AIRequest): Promise<AIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);
    
    try {
      switch (provider.name) {
        case 'openai':
          return await this.performOpenAIRequest(provider, request, controller.signal);
        case 'anthropic':
          return await this.performAnthropicRequest(provider, request, controller.signal);
        case 'local':
          return await this.performLocalRequest(provider, request, controller.signal);
        default:
          throw new Error(`Unsupported provider: ${provider.name}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * OpenAI API implementation
   */
  private async performOpenAIRequest(
    provider: AIProvider, 
    request: AIRequest, 
    signal: AbortSignal
  ): Promise<AIResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt }
        ],
        max_tokens: request.maxTokens || provider.maxTokens || 2500,
        temperature: request.temperature || provider.temperature || 0.7
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }

  /**
   * Anthropic API implementation (future)
   */
  private async performAnthropicRequest(
    provider: AIProvider, 
    request: AIRequest, 
    signal: AbortSignal
  ): Promise<AIResponse> {
    // TODO: Implement Anthropic API when needed
    throw new Error('Anthropic provider not yet implemented');
  }

  /**
   * Local API implementation (future)
   */
  private async performLocalRequest(
    provider: AIProvider, 
    request: AIRequest, 
    signal: AbortSignal
  ): Promise<AIResponse> {
    // TODO: Implement local LLM integration when needed
    throw new Error('Local provider not yet implemented');
  }

  /**
   * Build system prompt based on plan type
   */
  private buildSystemPrompt(planType: 'dissertation' | 'prospectus'): string {
    return planType === 'prospectus'
      ? 'You are an expert academic advisor helping students craft rigorous yet manageable dissertation prospectus documents. Emphasize scope clarity and early risk reduction.'
      : 'You are an expert academic advisor specializing in helping ADHD students complete dissertations. Focus on breaking down complex academic work into specific, actionable micro-tasks.';
  }

  /**
   * Build user prompt for plan generation
   */
  private buildPlanPrompt(
    planType: 'dissertation' | 'prospectus', 
    topic: string, 
    additionalContext?: string
  ): string {
    const basePrompt = `Please create a detailed ${planType} plan for the topic: "${topic}"
    
Focus on:
- Breaking down complex tasks into specific, actionable micro-tasks
- Realistic timelines and milestones
- Risk identification and mitigation strategies
- Progress tracking mechanisms
- ADHD-friendly organization (clear structure, manageable chunks)
    
${additionalContext ? `Additional context: ${additionalContext}` : ''}`;
    
    return basePrompt;
  }

  /**
   * Fallback plan when AI fails
   */
  private getFallbackPlan(planType: 'dissertation' | 'prospectus', topic: string): string {
    return `# ${planType === 'prospectus' ? 'Prospectus' : 'Dissertation'} Plan: ${topic}

⚠️ *This is a fallback template - AI generation failed*

## Phase 1: Research & Planning
- [ ] Literature review
- [ ] Methodology definition
- [ ] Timeline creation

## Phase 2: Execution
- [ ] Data collection
- [ ] Analysis
- [ ] Writing

## Phase 3: Finalization
- [ ] Review and revision
- [ ] Advisor feedback
- [ ] Final submission

*Please customize this template based on your specific requirements.*`;
  }

  /**
   * Fallback delta when AI fails
   */
  private getFallbackDelta(
    planType: 'dissertation' | 'prospectus', 
    previousPlan: { file: string; created: string; daysRemaining: number | null }
  ): string {
    return `# Delta Update - ${new Date().toISOString().split('T')[0]}

⚠️ *AI delta generation failed - manual update needed*

## Changes Since Last Plan (${previousPlan.created})
- Review your current progress
- Update timeline if needed
- Identify any new risks or opportunities

## Next 5 Micro Tasks
1. [ ] Review previous plan: ${previousPlan.file}
2. [ ] Assess current progress
3. [ ] Update timeline
4. [ ] Identify blockers
5. [ ] Plan next week's work

*Please update manually based on your current situation.*`;
  }

  /**
   * Utility methods
   */
  private showProgressNotice(message: string): void {
    if (typeof Notice !== 'undefined') {
      new Notice(message);
    } else {
      console.log('[AIService]', message);
    }
  }

  private showSuccessNotice(message: string): void {
    if (typeof Notice !== 'undefined') {
      new Notice(message);
    } else {
      console.log('[AIService]', message);
    }
  }

  private showErrorNotice(message: string): void {
    if (typeof Notice !== 'undefined') {
      new Notice(message, 8000); // Show longer for errors
    } else {
      console.error('[AIService]', message);
    }
  }

  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log('[AIService]', message);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update provider configuration
   */
  updateProvider(provider: Partial<AIProvider>): void {
    this.config.defaultProvider = { ...this.config.defaultProvider, ...provider };
  }
}