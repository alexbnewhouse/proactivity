import express from 'express';

const router = express.Router();

/**
 * @route GET /api/notifications/status
 * @description Get notification service status
 * @access Public
 */
router.get('/status', (req, res) => {
  try {
    const notificationService = req.app.locals.services.notifications;

    const status = {
      active: true,
      dailyCount: notificationService.dailyNotificationCount || 0,
      maxDaily: notificationService.userPreferences?.maxDailyNotifications || 12,
      lastNotification: notificationService.lastNotificationTime || null,
      quietHours: notificationService.userPreferences?.quietHours || { start: 22, end: 8 }
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Notification status error:', error);
    res.status(500).json({
      error: 'Failed to get notification status',
      message: 'Unable to retrieve notification information'
    });
  }
});

/**
 * @route POST /api/notifications/send
 * @description Send a test notification
 * @access Public
 */
router.post('/send', async (req, res) => {
  try {
    const notificationService = req.app.locals.services.notifications;
    const { type, message, urgency = 'low' } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Message required',
        message: 'Notification message is required'
      });
    }

    const notification = {
      id: `test_${Date.now()}`,
      type: type || 'test',
      message,
      urgency,
      timestamp: new Date().toISOString(),
      hyperfocusCompatible: urgency === 'low'
    };

    const result = await notificationService.sendNotification(notification);

    res.json({
      success: true,
      data: result,
      message: 'Test notification sent'
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      error: 'Failed to send notification',
      message: 'Unable to send test notification'
    });
  }
});

/**
 * @route PUT /api/notifications/preferences
 * @description Update notification preferences
 * @access Public
 */
router.put('/preferences', (req, res) => {
  try {
    const {
      maxDailyNotifications,
      quietHours,
      enableProactive,
      hyperfocusRespect
    } = req.body;

    const preferences = {
      maxDailyNotifications: maxDailyNotifications || 12,
      quietHours: quietHours || { start: 22, end: 8 },
      enableProactive: enableProactive !== false,
      hyperfocusRespect: hyperfocusRespect !== false
    };

    // In a real implementation, this would update the notification service
    console.log('Notification preferences updated:', preferences);

    res.json({
      success: true,
      data: preferences,
      message: 'Notification preferences updated'
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      error: 'Failed to update preferences',
      message: 'Unable to save notification preferences'
    });
  }
});

/**
 * @route GET /api/notifications/history
 * @description Get notification history
 * @access Public
 */
router.get('/history', (req, res) => {
  try {
    const { limit = 50 } = req.query;

    // Mock notification history
    const history = [
      {
        id: 'notif_1',
        type: 'energy_check',
        message: 'Quick energy check: How are you feeling?',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        responded: true,
        response: 'moderate'
      },
      {
        id: 'notif_2',
        type: 'gentle_reminder',
        message: 'You\'ve been focused for 90 minutes. Consider a short break!',
        timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        responded: false
      }
    ];

    res.json({
      success: true,
      data: history.slice(0, parseInt(limit)),
      metadata: {
        total: history.length,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Notification history error:', error);
    res.status(500).json({
      error: 'Failed to get notification history',
      message: 'Unable to retrieve notification history'
    });
  }
});

export default router;