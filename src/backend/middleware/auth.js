/**
 * Authentication middleware for Proactivity
 * Currently a placeholder for future authentication implementation
 */

const authMiddleware = (req, res, next) => {
  // For development, we'll skip authentication
  if (process.env.NODE_ENV === 'development') {
    req.user = {
      id: 'dev_user',
      email: 'dev@proactivephd.com',
      preferences: {
        maxDailyNotifications: 12,
        energyCheckInterval: 120
      }
    };
    return next();
  }

  // In production, implement proper JWT or API key authentication
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (!authHeader && !apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        status: 401,
        message: 'Authentication required',
        adhdFriendlyMessage: 'You\'ll need to sign in to access this feature.',
        suggestions: [
          'Check if you\'re signed in',
          'Verify your API key is correct',
          'Try refreshing your session'
        ],
        adhdSupport: {
          comfort: 'Authentication issues happen to everyone. It\'s just a small bump in the road.',
          nextSteps: [
            'Don\'t worry about losing your work',
            'Sign in again when you\'re ready',
            'Your progress is important and worth protecting'
          ],
          motivation: 'Security helps protect your valuable research work! 🔒'
        }
      }
    });
  }

  // TODO: Implement actual authentication logic
  // For now, create a placeholder user
  req.user = {
    id: 'authenticated_user',
    email: 'user@example.com',
    preferences: {
      maxDailyNotifications: 12,
      energyCheckInterval: 120
    }
  };

  next();
};

export default authMiddleware;