import { Notice } from 'obsidian';
import { ProactivitySettings } from './main';

export interface TaskBreakdownRequest {
  task: string;
  context?: {
    currentEnergyLevel?: string;
    availableTime?: number;
    preferredComplexity?: string;
    executiveFunctionChallenges?: string[];
    currentProject?: string;
    sourceFile?: string;
    selectedText?: string;
    depth?: number;
  };
}

export interface TaskBreakdownResponse {
  success: boolean;
  data: {
    originalTask: string;
    microTasks: any[];
    breakdownStrategy: string;
    totalEstimatedTime: number;
    adhdOptimizations: string[];
  };
  metadata?: any;
}

export interface TaskSuggestionsResponse {
  success: boolean;
  data: any[];
  metadata: any;
}

export interface ApiError {
  error: string;
  message: string;
  details?: string;
}

/**
 * HTTP client for communicating with Proactivity backend API
 */
export class ProactivityApiClient {
  private settings: ProactivitySettings;
  private baseUrl: string;

  constructor(settings: ProactivitySettings) {
    this.settings = settings;
    this.baseUrl = settings.serverUrl || 'http://localhost:3001';
  }

  updateSettings(settings: ProactivitySettings) {
    this.settings = settings;
    this.baseUrl = settings.serverUrl || 'http://localhost:3001';
  }

  /**
   * Make HTTP request with error handling
   */
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      const data = await response.json();

      if (!response.ok) {
        const error = data as ApiError;
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error - backend might be down
        throw new Error('Unable to connect to Proactivity server. Please check that the backend is running.');
      }
      throw error;
    }
  }

  /**
   * Test connection to backend
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get health status from backend
   */
  async getHealth() {
    return this.makeRequest('/health');
  }

  /**
   * Break down a task into ADHD-friendly micro-tasks
   */
  async breakdownTask(request: TaskBreakdownRequest): Promise<TaskBreakdownResponse> {
    return this.makeRequest<TaskBreakdownResponse>('/tasks/breakdown', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get task suggestions based on current context
   */
  async getTaskSuggestions(
    energyLevel: string = 'moderate',
    availableTime: number = 30,
    category?: string
  ): Promise<TaskSuggestionsResponse> {
    const params = new URLSearchParams({
      energyLevel,
      availableTime: availableTime.toString(),
    });

    if (category) {
      params.append('category', category);
    }

    return this.makeRequest<TaskSuggestionsResponse>(`/tasks/suggestions?${params}`);
  }

  /**
   * Start tracking a task
   */
  async startTask(taskId: string, estimatedDuration?: number) {
    return this.makeRequest('/tasks/start', {
      method: 'POST',
      body: JSON.stringify({
        taskId,
        estimatedDuration,
        userId: 'obsidian_user', // Could be made configurable
      }),
    });
  }

  /**
   * Mark task as completed
   */
  async completeTask(
    taskId: string, 
    actualDuration?: number, 
    difficulty?: string, 
    notes?: string
  ) {
    return this.makeRequest('/tasks/complete', {
      method: 'POST',
      body: JSON.stringify({
        taskId,
        actualDuration,
        difficulty,
        notes,
        userId: 'obsidian_user',
      }),
    });
  }

  /**
   * Get task templates for common dissertation activities
   */
  async getTaskTemplates() {
    return this.makeRequest('/tasks/templates');
  }

  /**
   * Update user energy level
   */
  async updateEnergyLevel(energyLevel: string) {
    return this.makeRequest('/users/energy-log', {
      method: 'POST',
      body: JSON.stringify({
        energyLevel,
        timestamp: new Date().toISOString(),
        userId: 'obsidian_user',
      }),
    });
  }

  /**
   * Record user activity for pattern detection
   */
  async recordActivity(activityType: string, data: any) {
    return this.makeRequest('/patterns/detect', {
      method: 'POST',
      body: JSON.stringify({
        type: activityType,
        data,
        timestamp: new Date().toISOString(),
        userId: 'obsidian_user',
      }),
    });
  }

  /**
   * Get ADHD patterns and insights
   */
  async getPatterns() {
    return this.makeRequest('/patterns/insights');
  }

  /**
   * Safe wrapper for API calls with user feedback
   */
  async safeApiCall<T>(
    operation: () => Promise<T>,
    fallback?: T,
    errorMessage?: string
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      console.error('API call failed:', error);
      
      const message = errorMessage || 'API request failed. Please check your connection and backend server.';
      new Notice(`⚠️ ${message}`, 5000);

      // Return fallback if provided
      if (fallback !== undefined) {
        return fallback;
      }

      return undefined;
    }
  }

  /**
   * Convert task breakdown response to format expected by UI
   */
  static formatBreakdownForUI(response: TaskBreakdownResponse) {
    if (!response.success || !response.data) {
      throw new Error('Invalid breakdown response');
    }

    const { data } = response;
    
    return {
      motivation: `Great choice! I've broken this down into ${data.microTasks.length} manageable steps. 🎯`,
      steps: data.microTasks.map((task: any, index: number) => ({
        id: task.id || `step_${index}`,
        title: task.title,
        description: task.description,
        estimatedMinutes: task.estimatedMinutes || 20,
        complexity: task.complexity || 'simple',
        tips: task.motivationBooster ? [task.motivationBooster] : [],
        energyRequired: task.energyRequired || 'moderate',
        executiveFunctionDemands: task.executiveFunctionDemands || [],
        tools: task.tools || [],
        completionCriteria: task.completionCriteria || 'Step completed'
      })),
      totalEstimatedTime: data.totalEstimatedTime,
      strategy: data.breakdownStrategy,
      optimizations: data.adhdOptimizations
    };
  }
}