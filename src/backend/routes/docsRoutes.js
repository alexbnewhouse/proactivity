import express from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @route GET /api/docs
 * @description Serve API documentation
 * @access Public
 */
router.get('/', (req, res) => {
  try {
    // Read the API documentation markdown file
    const docsPath = join(__dirname, '../../../docs/API.md');
    const apiDocs = readFileSync(docsPath, 'utf8');

    // Convert markdown to HTML for better presentation
    const htmlContent = markdownToHtml(apiDocs);

    res.send(htmlContent);
  } catch (error) {
    console.error('Error serving API docs:', error);

    // Fallback to inline documentation
    res.send(generateInlineApiDocs());
  }
});

/**
 * @route GET /api/docs/json
 * @description Get API documentation as JSON
 * @access Public
 */
router.get('/json', (req, res) => {
  try {
    const apiSchema = {
      openapi: '3.0.0',
      info: {
        title: 'Proactivity API',
        version: '1.0.0',
        description: 'ADHD-friendly dissertation writing assistant API',
        contact: {
          name: 'Proactivity Team',
          url: 'https://github.com/alexbnewhouse/proactivity'
        }
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Development server'
        }
      ],
      paths: {
        '/health': {
          get: {
            summary: 'Health check',
            description: 'Check if the API is running and all services are healthy',
            responses: {
              200: {
                description: 'Service is healthy',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'healthy' },
                        timestamp: { type: 'string', format: 'date-time' },
                        version: { type: 'string', example: '1.0.0' },
                        services: {
                          type: 'object',
                          properties: {
                            taskBreakdown: { type: 'boolean' },
                            patterns: { type: 'boolean' },
                            notifications: { type: 'boolean' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/api/tasks/breakdown': {
          post: {
            summary: 'Break down a task into ADHD-friendly micro-tasks',
            description: 'Uses AI to decompose complex tasks into manageable steps',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['task'],
                    properties: {
                      task: {
                        type: 'string',
                        description: 'The task to break down',
                        example: 'Write literature review chapter'
                      },
                      context: {
                        type: 'object',
                        properties: {
                          energyLevel: {
                            type: 'string',
                            enum: ['high', 'moderate', 'low', 'depleted'],
                            example: 'moderate'
                          },
                          availableTime: {
                            type: 'number',
                            description: 'Available time in minutes',
                            example: 60
                          },
                          preferredComplexity: {
                            type: 'string',
                            enum: ['micro', 'simple', 'moderate', 'complex'],
                            example: 'simple'
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            responses: {
              200: {
                description: 'Task successfully broken down',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                        data: {
                          type: 'object',
                          properties: {
                            originalTask: { type: 'string' },
                            microTasks: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  id: { type: 'string' },
                                  title: { type: 'string' },
                                  description: { type: 'string' },
                                  estimatedMinutes: { type: 'number' },
                                  complexity: { type: 'string' },
                                  motivationBooster: { type: 'string' }
                                }
                              }
                            },
                            totalEstimatedTime: { type: 'number' },
                            adhdOptimizations: {
                              type: 'array',
                              items: { type: 'string' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/api/out-of-office/status': {
          get: {
            summary: 'Get out of office status',
            description: 'Check if out of office mode is active',
            responses: {
              200: {
                description: 'Out of office status',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        data: {
                          type: 'object',
                          properties: {
                            active: { type: 'boolean' },
                            reason: { type: 'string' },
                            message: { type: 'string' },
                            timeAway: {
                              type: 'object',
                              properties: {
                                days: { type: 'number' },
                                hours: { type: 'number' },
                                minutes: { type: 'number' }
                              }
                            },
                            pausedServices: {
                              type: 'array',
                              items: { type: 'string' }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          Error: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  status: { type: 'number' },
                  message: { type: 'string' },
                  adhdFriendlyMessage: { type: 'string' },
                  suggestions: {
                    type: 'array',
                    items: { type: 'string' }
                  },
                  adhdSupport: {
                    type: 'object',
                    properties: {
                      comfort: { type: 'string' },
                      nextSteps: {
                        type: 'array',
                        items: { type: 'string' }
                      },
                      motivation: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    res.json(apiSchema);
  } catch (error) {
    console.error('Error generating API schema:', error);
    res.status(500).json({
      error: 'Failed to generate API documentation',
      message: 'Unable to create API schema'
    });
  }
});

/**
 * @route GET /api/docs/endpoints
 * @description List all available API endpoints
 * @access Public
 */
router.get('/endpoints', (req, res) => {
  try {
    const endpoints = [
      {
        method: 'GET',
        path: '/health',
        description: 'System health check'
      },
      {
        method: 'POST',
        path: '/api/tasks/breakdown',
        description: 'Break down tasks into ADHD-friendly micro-tasks'
      },
      {
        method: 'GET',
        path: '/api/tasks/suggestions',
        description: 'Get personalized task suggestions'
      },
      {
        method: 'POST',
        path: '/api/patterns/detect',
        description: 'Detect ADHD behavioral patterns'
      },
      {
        method: 'GET',
        path: '/api/patterns/interventions/:patternType',
        description: 'Get interventions for specific patterns'
      },
      {
        method: 'GET',
        path: '/api/out-of-office/status',
        description: 'Get out of office mode status'
      },
      {
        method: 'POST',
        path: '/api/out-of-office/start',
        description: 'Start out of office mode'
      },
      {
        method: 'POST',
        path: '/api/out-of-office/end',
        description: 'End out of office mode'
      },
      {
        method: 'POST',
        path: '/api/out-of-office/presets/vacation',
        description: 'Quick vacation mode'
      },
      {
        method: 'POST',
        path: '/api/out-of-office/presets/deep-focus',
        description: 'Deep focus mode'
      },
      {
        method: 'GET',
        path: '/api/users/profile',
        description: 'Get user profile and preferences'
      },
      {
        method: 'POST',
        path: '/api/obsidian/sync-tasks',
        description: 'Sync tasks with Obsidian'
      },
      {
        method: 'GET',
        path: '/api/notifications/status',
        description: 'Get notification service status'
      }
    ];

    res.json({
      success: true,
      data: {
        endpoints,
        totalEndpoints: endpoints.length,
        baseUrl: 'http://localhost:3001',
        documentation: 'http://localhost:3001/api/docs'
      }
    });
  } catch (error) {
    console.error('Error listing endpoints:', error);
    res.status(500).json({
      error: 'Failed to list endpoints',
      message: 'Unable to retrieve API endpoints'
    });
  }
});

// Helper functions

function markdownToHtml(markdown) {
  // Simple markdown to HTML conversion
  let html = markdown
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```(\w+)?\n?/, '').replace(/```$/, '');
      return `<pre><code>${code}</code></pre>`;
    })
    .replace(/\n/g, '<br>');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Proactivity API Documentation</title>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.6;
          color: #333;
        }
        h1 { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        h2 { color: #1f2937; margin-top: 30px; }
        h3 { color: #374151; }
        code {
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', monospace;
        }
        pre {
          background: #1f2937;
          color: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          overflow-x: auto;
        }
        pre code {
          background: none;
          color: inherit;
          padding: 0;
        }
        li { margin: 5px 0; }
        .nav {
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .nav a {
          color: #2563eb;
          text-decoration: none;
          margin-right: 20px;
        }
        .nav a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="nav">
        <strong>Quick Links:</strong>
        <a href="/health">Health Check</a>
        <a href="/api/docs/json">OpenAPI Schema</a>
        <a href="/api/docs/endpoints">Endpoints List</a>
        <a href="https://github.com/alexbnewhouse/proactivity">GitHub</a>
      </div>
      ${html}
    </body>
    </html>
  `;
}

function generateInlineApiDocs() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Proactivity API Documentation</title>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.6;
        }
        .endpoint {
          background: #f8fafc;
          padding: 15px;
          margin: 15px 0;
          border-radius: 8px;
          border-left: 4px solid #2563eb;
        }
        .method {
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 12px;
        }
        .get { background: #059669; }
        .post { background: #dc2626; }
        .put { background: #d97706; }
        .delete { background: #7c2d12; }
      </style>
    </head>
    <body>
      <h1>🧠 Proactivity API</h1>
      <p>ADHD-friendly dissertation writing assistant API</p>

      <h2>Core Endpoints</h2>

      <div class="endpoint">
        <span class="method get">GET</span> <strong>/health</strong>
        <p>Check system health and service status</p>
      </div>

      <div class="endpoint">
        <span class="method post">POST</span> <strong>/api/tasks/breakdown</strong>
        <p>Break down complex tasks into ADHD-friendly micro-tasks using AI</p>
        <pre>{"task": "Write methodology", "context": {"energyLevel": "moderate"}}</pre>
      </div>

      <div class="endpoint">
        <span class="method get">GET</span> <strong>/api/tasks/suggestions</strong>
        <p>Get personalized task suggestions based on energy and context</p>
      </div>

      <div class="endpoint">
        <span class="method post">POST</span> <strong>/api/out-of-office/start</strong>
        <p>Start vacation mode or other out-of-office configurations</p>
      </div>

      <div class="endpoint">
        <span class="method post">POST</span> <strong>/api/patterns/detect</strong>
        <p>Detect ADHD behavioral patterns and get intervention suggestions</p>
      </div>

      <h2>ADHD-Friendly Features</h2>
      <ul>
        <li>🧠 <strong>Executive Function Support</strong> - Task breakdown and cognitive load management</li>
        <li>🔄 <strong>Pattern Recognition</strong> - Detect procrastination, hyperfocus, time blindness</li>
        <li>🌴 <strong>Out of Office Mode</strong> - Vacation, deep focus, and break management</li>
        <li>💙 <strong>Gentle Error Handling</strong> - Supportive, non-judgmental error messages</li>
        <li>🎯 <strong>Energy-Based Matching</strong> - Tasks matched to current cognitive capacity</li>
      </ul>

      <h2>Quick Links</h2>
      <p>
        <a href="/api/docs/json">OpenAPI Schema</a> |
        <a href="/api/docs/endpoints">All Endpoints</a> |
        <a href="https://github.com/alexbnewhouse/proactivity">GitHub Repository</a>
      </p>
    </body>
    </html>
  `;
}

export default router;