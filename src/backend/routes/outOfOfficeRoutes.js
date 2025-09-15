import express from 'express';

const router = express.Router();

/**
 * @route GET /api/out-of-office/status
 * @description Get current out of office status
 * @access Public
 */
router.get('/status', (req, res) => {
  try {
    const outOfOfficeService = req.app.locals.services.outOfOffice;
    const status = outOfOfficeService.getStatus();

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Out of office status error:', error);
    res.status(500).json({
      error: 'Failed to get status',
      message: 'Unable to retrieve out of office status'
    });
  }
});

/**
 * @route POST /api/out-of-office/start
 * @description Start out of office mode
 * @access Public
 */
router.post('/start', async (req, res) => {
  try {
    const outOfOfficeService = req.app.locals.services.outOfOffice;
    const {
      reason = 'break',
      duration,
      durationType = 'hours',
      message,
      pauseServices,
      enableEmergencyMode = false,
      emergencyKeyword = 'URGENT'
    } = req.body;

    let endTime = null;
    if (duration && duration > 0) {
      const multiplier = durationType === 'days' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
      endTime = new Date(Date.now() + duration * multiplier);
    }

    const config = {
      reason,
      endTime,
      message: message || getDefaultMessage(reason),
      pauseServices: pauseServices || ['notifications', 'patterns', 'tasks'],
      enableEmergencyMode,
      emergencyKeyword
    };

    const result = await outOfOfficeService.setOutOfOffice(config);

    res.json({
      success: true,
      data: result,
      message: 'Out of office mode activated successfully'
    });
  } catch (error) {
    console.error('Start out of office error:', error);
    res.status(500).json({
      error: 'Failed to start out of office mode',
      message: 'Unable to activate out of office mode'
    });
  }
});

/**
 * @route POST /api/out-of-office/end
 * @description End out of office mode
 * @access Public
 */
router.post('/end', async (req, res) => {
  try {
    const outOfOfficeService = req.app.locals.services.outOfOffice;
    const { forced = true } = req.body;

    const result = await outOfOfficeService.resumeFromOutOfOffice(forced);

    res.json({
      success: result.success,
      data: result,
      message: result.message
    });
  } catch (error) {
    console.error('End out of office error:', error);
    res.status(500).json({
      error: 'Failed to end out of office mode',
      message: 'Unable to deactivate out of office mode'
    });
  }
});

/**
 * @route POST /api/out-of-office/presets/vacation
 * @description Quick vacation mode
 * @access Public
 */
router.post('/presets/vacation', async (req, res) => {
  try {
    const outOfOfficeService = req.app.locals.services.outOfOffice;
    const { days = 7, autoResume = true } = req.body;

    const result = await outOfOfficeService.startVacationMode(days, autoResume);

    res.json({
      success: true,
      data: result,
      message: `Vacation mode activated for ${days} days! 🏖️`
    });
  } catch (error) {
    console.error('Vacation mode error:', error);
    res.status(500).json({
      error: 'Failed to start vacation mode',
      message: 'Unable to activate vacation mode'
    });
  }
});

/**
 * @route POST /api/out-of-office/presets/sick-day
 * @description Quick sick day mode
 * @access Public
 */
router.post('/presets/sick-day', async (req, res) => {
  try {
    const outOfOfficeService = req.app.locals.services.outOfOffice;
    const { hours = 24 } = req.body;

    const result = await outOfOfficeService.startSickDay(hours);

    res.json({
      success: true,
      data: result,
      message: `Sick day mode activated. Take care of yourself! 🤒`
    });
  } catch (error) {
    console.error('Sick day mode error:', error);
    res.status(500).json({
      error: 'Failed to start sick day mode',
      message: 'Unable to activate sick day mode'
    });
  }
});

/**
 * @route POST /api/out-of-office/presets/deep-focus
 * @description Deep focus mode (minimal interruptions)
 * @access Public
 */
router.post('/presets/deep-focus', async (req, res) => {
  try {
    const outOfOfficeService = req.app.locals.services.outOfOffice;
    const { hours = 4 } = req.body;

    const result = await outOfOfficeService.startDeepFocusMode(hours);

    res.json({
      success: true,
      data: result,
      message: `Deep focus mode activated for ${hours} hours! 🎯`
    });
  } catch (error) {
    console.error('Deep focus mode error:', error);
    res.status(500).json({
      error: 'Failed to start deep focus mode',
      message: 'Unable to activate deep focus mode'
    });
  }
});

/**
 * @route POST /api/out-of-office/emergency
 * @description Emergency override for urgent tasks
 * @access Public
 */
router.post('/emergency', async (req, res) => {
  try {
    const outOfOfficeService = req.app.locals.services.outOfOffice;
    const { message, action, context } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Message required',
        message: 'Emergency message is required for override'
      });
    }

    const result = await outOfOfficeService.handleEmergencyOverride(message, {
      action,
      ...context
    });

    if (result.allowed) {
      res.json({
        success: true,
        data: result,
        message: 'Emergency access granted'
      });
    } else {
      res.status(403).json({
        success: false,
        data: result,
        message: result.reason
      });
    }
  } catch (error) {
    console.error('Emergency override error:', error);
    res.status(500).json({
      error: 'Emergency override failed',
      message: 'Unable to process emergency override'
    });
  }
});

/**
 * @route GET /api/out-of-office/presets
 * @description Get available out of office presets
 * @access Public
 */
router.get('/presets', (req, res) => {
  try {
    const presets = [
      {
        id: 'vacation',
        name: '🏖️ Vacation Mode',
        description: 'Complete break from work notifications',
        defaultDuration: 7,
        durationType: 'days',
        pausedServices: ['notifications', 'patterns', 'tasks'],
        emergencyMode: true,
        icon: '🏖️'
      },
      {
        id: 'sick-day',
        name: '🤒 Sick Day',
        description: 'Rest and recovery mode',
        defaultDuration: 24,
        durationType: 'hours',
        pausedServices: ['notifications', 'patterns'],
        emergencyMode: true,
        icon: '🤒'
      },
      {
        id: 'deep-focus',
        name: '🎯 Deep Focus',
        description: 'Minimize interruptions for focused work',
        defaultDuration: 4,
        durationType: 'hours',
        pausedServices: ['notifications'],
        emergencyMode: false,
        icon: '🎯'
      },
      {
        id: 'weekend',
        name: '🌅 Weekend Mode',
        description: 'Light break for weekends',
        defaultDuration: 48,
        durationType: 'hours',
        pausedServices: ['notifications', 'patterns'],
        emergencyMode: false,
        icon: '🌅'
      },
      {
        id: 'evening',
        name: '🌙 Evening Quiet',
        description: 'Wind down mode for evenings',
        defaultDuration: 12,
        durationType: 'hours',
        pausedServices: ['notifications'],
        emergencyMode: false,
        icon: '🌙'
      }
    ];

    res.json({
      success: true,
      data: presets
    });
  } catch (error) {
    console.error('Presets error:', error);
    res.status(500).json({
      error: 'Failed to get presets',
      message: 'Unable to retrieve out of office presets'
    });
  }
});

/**
 * @route GET /api/out-of-office/history
 * @description Get out of office history (for analytics)
 * @access Public
 */
router.get('/history', (req, res) => {
  try {
    // In a real implementation, this would query a database
    // For now, return mock data
    const history = [
      {
        id: 'ooo_1',
        reason: 'vacation',
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        duration: { days: 5, hours: 0 },
        message: 'Beach vacation! 🏖️'
      }
    ];

    res.json({
      success: true,
      data: history,
      metadata: {
        totalBreaks: history.length,
        totalDaysOff: history.reduce((sum, item) => sum + item.duration.days, 0)
      }
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({
      error: 'Failed to get history',
      message: 'Unable to retrieve out of office history'
    });
  }
});

// Helper function to get default messages
function getDefaultMessage(reason) {
  const messages = {
    vacation: 'On vacation! 🏖️ Recharging for maximum productivity!',
    sick: 'Taking time to rest and recover 🤒 Health comes first!',
    break: 'Taking a well-deserved break ☕ Back soon!',
    personal: 'Handling personal matters 🫂 Thanks for understanding!',
    deep_focus: 'In deep focus mode 🎯 Avoiding all interruptions!',
    weekend: 'Enjoying the weekend! 🌅 Work can wait!',
    evening: 'Evening quiet time 🌙 Winding down for the day!'
  };

  return messages[reason] || 'Taking a break! Back soon! ✨';
}

export default router;