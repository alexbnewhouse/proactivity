import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import routes
import taskRoutes from './routes/taskRoutes.js';
import userRoutes from './routes/userRoutes.js';
import patternRoutes from './routes/patternRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import obsidianRoutes from './routes/obsidianRoutes.js';
import outOfOfficeRoutes from './routes/outOfOfficeRoutes.js';
import docsRoutes from './routes/docsRoutes.js';
import morningPlanningRoutes from './routes/morningPlanningRoutes.js';

// Import middleware
import authMiddleware from './middleware/auth.js';
import errorHandler from './middleware/errorHandler.js';
import rateLimiter from './middleware/rateLimiter.js';

// Import services
import TaskBreakdownService from './services/taskBreakdownService.js';
import ADHDPatternService from './services/adhdPatternService.js';
import ProactiveNotificationService from './services/proactiveNotificationService.js';
import OutOfOfficeService from './services/outOfOfficeService.js';
import ProactivitySpectrumService from './services/proactiveSpectrumService.js';
import MorningPlanningEnforcementService from './services/morningPlanningEnforcementService.js';

// Import database
import database from './database/database.js';

// Initialize dotenv with path to root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database first
console.log('🗄️  Initializing database...');
await database.initialize();

// Initialize services with database access
const outOfOfficeService = new OutOfOfficeService();
const taskBreakdownService = new TaskBreakdownService(process.env.OPENAI_API_KEY);
const patternService = new ADHDPatternService();
const notificationService = new ProactiveNotificationService(patternService);
const spectrumService = new ProactivitySpectrumService(notificationService, patternService, outOfOfficeService);
const enforcementService = new MorningPlanningEnforcementService(database, spectrumService, notificationService);

// Integrate out of office service with other services
outOfOfficeService.registerHook('notifications', {
  onPause: (config) => {
    notificationService.pauseNotifications?.(config);
    return { paused: true, service: 'notifications' };
  },
  onResume: (config) => {
    notificationService.resumeNotifications?.(config);
    return { resumed: true, service: 'notifications' };
  }
});

outOfOfficeService.registerHook('patterns', {
  onPause: (config) => {
    patternService.pauseDetection?.(config);
    return { paused: true, service: 'patterns' };
  },
  onResume: (config) => {
    patternService.resumeDetection?.(config);
    return { resumed: true, service: 'patterns' };
  }
});

// Make services and database available to routes
app.locals.services = {
  database: database,
  taskBreakdown: taskBreakdownService,
  patterns: patternService,
  notifications: notificationService,
  outOfOffice: outOfOfficeService,
  spectrum: spectrumService,
  enforcement: enforcementService
};

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-domain.com', 'app://obsidian.md']
    : ['http://localhost:3000', 'http://localhost:8080', 'app://obsidian.md'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting for API protection
app.use('/api/', rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      taskBreakdown: !!taskBreakdownService,
      patterns: !!patternService,
      notifications: !!notificationService,
      spectrum: !!spectrumService,
      enforcement: !!enforcementService
    }
  });
});

// API Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patterns', patternRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/obsidian', obsidianRoutes);
app.use('/api/out-of-office', outOfOfficeRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/morning-planning', morningPlanningRoutes);

// Protected routes (require authentication)
app.use('/api/protected/*', authMiddleware);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../frontend/dist')));

  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../frontend/dist/index.html'));
  });
}

// Error handling middleware (must be last)
app.use(errorHandler);

// Handle 404s
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested path ${req.originalUrl} does not exist`,
    suggestion: 'Check the API documentation for available endpoints'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Proactivity Server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🧠 AI Task Breakdown: ${taskBreakdownService ? '✅' : '❌'}`);
  console.log(`📊 Pattern Detection: ${patternService ? '✅' : '❌'}`);
  console.log(`🔔 Notifications: ${notificationService ? '✅' : '❌'}`);

  if (process.env.NODE_ENV === 'development') {
    console.log(`📖 API Docs: http://localhost:${PORT}/api/docs`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;