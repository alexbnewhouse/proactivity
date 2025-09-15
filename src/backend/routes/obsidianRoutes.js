import express from 'express';

const router = express.Router();

/**
 * @route POST /api/obsidian/sync-tasks
 * @description Sync tasks between Obsidian and Proactivity
 * @access Public
 */
router.post('/sync-tasks', async (req, res) => {
  try {
    const { vaultPath, tasks, dailyNotePath } = req.body;

    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({
        error: 'Invalid tasks data',
        message: 'Tasks array is required'
      });
    }

    // Process tasks for ADHD optimization
    const processedTasks = tasks.map(task => ({
      ...task,
      id: task.id || `obsidian_${Date.now()}_${Math.random()}`,
      source: 'obsidian',
      adhdOptimized: true,
      estimatedMinutes: task.estimatedMinutes || estimateTaskDuration(task.title),
      complexity: determineComplexity(task.title, task.estimatedMinutes),
      motivationBooster: getRandomMotivation()
    }));

    res.json({
      success: true,
      data: {
        syncedTasks: processedTasks,
        syncTime: new Date().toISOString(),
        vaultPath
      },
      message: `Synced ${processedTasks.length} tasks from Obsidian`
    });
  } catch (error) {
    console.error('Obsidian sync error:', error);
    res.status(500).json({
      error: 'Sync failed',
      message: 'Unable to sync tasks with Obsidian'
    });
  }
});

/**
 * @route POST /api/obsidian/progress-update
 * @description Update progress from Obsidian activity
 * @access Public
 */
router.post('/progress-update', (req, res) => {
  try {
    const {
      filePath,
      wordCount,
      sessionDuration,
      tasksCompleted,
      energyLevel
    } = req.body;

    const progressUpdate = {
      id: `progress_${Date.now()}`,
      filePath,
      wordCount: wordCount || 0,
      sessionDuration: sessionDuration || 0,
      tasksCompleted: tasksCompleted || 0,
      energyLevel,
      timestamp: new Date().toISOString(),
      celebration: generateCelebration(tasksCompleted, sessionDuration)
    };

    // In a real implementation, this would be stored and analyzed
    console.log('Progress update from Obsidian:', progressUpdate);

    res.json({
      success: true,
      data: progressUpdate,
      message: progressUpdate.celebration
    });
  } catch (error) {
    console.error('Progress update error:', error);
    res.status(500).json({
      error: 'Progress update failed',
      message: 'Unable to record progress from Obsidian'
    });
  }
});

/**
 * @route GET /api/obsidian/suggestions
 * @description Get context-aware suggestions for Obsidian
 * @access Public
 */
router.get('/suggestions', (req, res) => {
  try {
    const {
      currentFile,
      energyLevel = 'moderate',
      availableTime = 30,
      recentActivity
    } = req.query;

    const suggestions = generateObsidianSuggestions({
      currentFile,
      energyLevel,
      availableTime: parseInt(availableTime),
      recentActivity
    });

    res.json({
      success: true,
      data: suggestions,
      metadata: {
        currentFile,
        energyLevel,
        availableTime: parseInt(availableTime),
        suggestionCount: suggestions.length
      }
    });
  } catch (error) {
    console.error('Obsidian suggestions error:', error);
    res.status(500).json({
      error: 'Failed to generate suggestions',
      message: 'Unable to create Obsidian suggestions'
    });
  }
});

/**
 * @route POST /api/obsidian/pattern-data
 * @description Send behavioral data from Obsidian for pattern analysis
 * @access Public
 */
router.post('/pattern-data', async (req, res) => {
  try {
    const {
      sessionData,
      behaviorMetrics,
      userId = 'obsidian_user'
    } = req.body;

    if (!behaviorMetrics) {
      return res.status(400).json({
        error: 'Behavior metrics required',
        message: 'Behavioral data is needed for pattern analysis'
      });
    }

    const patternService = req.app.locals.services.patterns;
    const detectedPatterns = patternService.detectPatterns(behaviorMetrics);

    res.json({
      success: true,
      data: {
        patterns: detectedPatterns,
        recommendations: patternService.getPersonalizedRecommendations(
          detectedPatterns,
          behaviorMetrics
        ),
        sessionSummary: summarizeSession(sessionData)
      },
      message: 'Pattern analysis completed'
    });
  } catch (error) {
    console.error('Pattern analysis error:', error);
    res.status(500).json({
      error: 'Pattern analysis failed',
      message: 'Unable to analyze behavioral patterns'
    });
  }
});

/**
 * @route GET /api/obsidian/daily-template
 * @description Get ADHD-optimized daily note template
 * @access Public
 */
router.get('/daily-template', (req, res) => {
  try {
    const { date, energyLevel, goals } = req.query;
    const templateDate = date || new Date().toISOString().split('T')[0];

    const template = generateDailyTemplate(templateDate, energyLevel, goals);

    res.json({
      success: true,
      data: {
        template,
        templateDate,
        adhdFeatures: [
          'Energy level tracking',
          'Micro-task breakdown',
          'Progress celebration',
          'Pattern awareness',
          'Gentle reflection prompts'
        ]
      }
    });
  } catch (error) {
    console.error('Daily template error:', error);
    res.status(500).json({
      error: 'Template generation failed',
      message: 'Unable to generate daily note template'
    });
  }
});

// Helper functions

function estimateTaskDuration(title) {
  const keywordDurations = {
    'write': 25,
    'draft': 30,
    'edit': 20,
    'review': 15,
    'read': 20,
    'research': 45,
    'analyze': 35,
    'organize': 15,
    'plan': 10
  };

  const titleLower = title.toLowerCase();
  for (const [keyword, duration] of Object.entries(keywordDurations)) {
    if (titleLower.includes(keyword)) {
      return duration;
    }
  }

  return 20; // Default duration
}

function determineComplexity(title, duration) {
  if (duration <= 10) return 'micro';
  if (duration <= 25) return 'simple';
  if (duration <= 45) return 'moderate';
  return 'complex';
}

function getRandomMotivation() {
  const motivations = [
    'You\'ve got this! 💪',
    'Progress over perfection! ✨',
    'Every step counts! 👣',
    'Your ADHD brain is creative and powerful! 🧠',
    'Small wins build big momentum! 🚀'
  ];
  return motivations[Math.floor(Math.random() * motivations.length)];
}

function generateCelebration(tasksCompleted, sessionDuration) {
  if (tasksCompleted > 0 && sessionDuration > 30) {
    return '🎉 Amazing session! You completed tasks AND stayed focused!';
  } else if (tasksCompleted > 0) {
    return '✅ Great job completing those tasks!';
  } else if (sessionDuration > 30) {
    return '⏰ Excellent focus session! Time well spent!';
  }
  return '👍 Every bit of progress matters!';
}

function generateObsidianSuggestions({ currentFile, energyLevel, availableTime, recentActivity }) {
  const suggestions = [];

  // File-based suggestions
  if (currentFile) {
    if (currentFile.includes('Chapter') || currentFile.includes('chapter')) {
      suggestions.push({
        type: 'writing',
        title: 'Continue writing current chapter',
        description: `Build on your work in ${currentFile}`,
        estimatedMinutes: Math.min(availableTime, 25),
        complexity: 'moderate'
      });
    }

    if (currentFile.includes('Literature') || currentFile.includes('review')) {
      suggestions.push({
        type: 'research',
        title: 'Add one new source',
        description: 'Find and summarize one relevant paper',
        estimatedMinutes: Math.min(availableTime, 20),
        complexity: 'simple'
      });
    }
  }

  // Energy-based suggestions
  if (energyLevel === 'high') {
    suggestions.push({
      type: 'writing',
      title: 'Tackle that challenging section',
      description: 'Use your high energy for complex writing',
      estimatedMinutes: Math.min(availableTime, 45),
      complexity: 'complex'
    });
  } else if (energyLevel === 'low') {
    suggestions.push({
      type: 'organization',
      title: 'Organize your notes',
      description: 'Light task: tidy up your research materials',
      estimatedMinutes: Math.min(availableTime, 15),
      complexity: 'micro'
    });
  }

  // Time-based suggestions
  if (availableTime < 15) {
    suggestions.push({
      type: 'quick',
      title: 'Quick brain dump',
      description: 'Capture any thoughts about your research',
      estimatedMinutes: 5,
      complexity: 'micro'
    });
  }

  return suggestions.slice(0, 3); // Limit to 3 suggestions
}

function summarizeSession(sessionData) {
  if (!sessionData) return 'Session completed';

  const { startTime, endTime, filesModified, tasksCompleted } = sessionData;
  const duration = endTime && startTime
    ? Math.round((new Date(endTime) - new Date(startTime)) / (1000 * 60))
    : 0;

  return {
    duration: `${duration} minutes`,
    productivity: duration > 0 ? 'productive' : 'brief',
    filesModified: filesModified || 0,
    tasksCompleted: tasksCompleted || 0,
    encouragement: duration > 25 ? 'Great sustained focus!' : 'Every minute counts!'
  };
}

function generateDailyTemplate(date, energyLevel, goals) {
  const today = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `# Daily Note - ${today}

#proactivity/daily-note

## 🔋 Energy & Focus
**Current Energy:** ${energyLevel || '_Select: high/moderate/low/depleted_'}
**Peak Focus Time:** ⏰ _When do you feel most alert today?_

## 🎯 Intention Setting
**Main Focus:** ${goals || '_What\'s your primary goal for today?_'}
**Why it matters:** _Connect to your bigger purpose_

## ✅ Micro-Tasks
_Break down your main focus into tiny, doable steps_
- [ ]
- [ ]
- [ ]

## 📊 Progress Tracking
**Words written:**
**Tasks completed:**
**Focus sessions:**
**Energy check-ins:**

## 🧠 ADHD Support
**What helped today:**
-
**What was challenging:**
-
**Patterns I noticed:**
-

## 🎉 Celebrations
_Acknowledge ALL progress, no matter how small_
-
-
-

## 🌅 Tomorrow's Intention
**One priority for tomorrow:**
**Energy I want to bring:**

---
*Generated by Proactivity - Your ADHD-friendly dissertation companion*`;
}

export default router;