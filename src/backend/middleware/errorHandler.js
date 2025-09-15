/**
 * Centralized error handling middleware for ProActive PhD
 * Provides ADHD-friendly error messages and appropriate logging
 */

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error(err);

  // Default error response
  let statusCode = error.statusCode || 500;
  let message = 'Something went wrong on our end';
  let adhdFriendlyMessage = 'No worries! Sometimes technology has hiccups. Let\'s try again.';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid input provided';
    adhdFriendlyMessage = 'It looks like some information is missing or incorrect. Let\'s check the details together.';
  }

  if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Access denied';
    adhdFriendlyMessage = 'You\'ll need to sign in to access this feature.';
  }

  if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service temporarily unavailable';
    adhdFriendlyMessage = 'Our AI assistant is taking a quick break. Please try again in a moment.';
  }

  if (err.message && err.message.includes('OpenAI')) {
    statusCode = 502;
    message = 'AI service error';
    adhdFriendlyMessage = 'The AI helper is having trouble right now. Your tasks can still be managed manually!';
  }

  if (err.message && err.message.includes('rate limit')) {
    statusCode = 429;
    message = 'Too many requests';
    adhdFriendlyMessage = 'You\'re very productive today! Let\'s take a short breather before the next request.';
  }

  // Create error response
  const errorResponse = {
    success: false,
    error: {
      status: statusCode,
      message,
      adhdFriendlyMessage,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown'
    }
  };

  // Add debugging info in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = err;
  }

  // Add helpful suggestions based on error type
  switch (statusCode) {
    case 400:
      errorResponse.error.suggestions = [
        'Check that all required fields are filled in',
        'Make sure your input follows the expected format',
        'Try refreshing the page and starting over'
      ];
      break;
    case 401:
      errorResponse.error.suggestions = [
        'Try signing in again',
        'Check if your session has expired',
        'Clear your browser cache and cookies'
      ];
      break;
    case 429:
      errorResponse.error.suggestions = [
        'Wait a minute before trying again',
        'This is a great time for a short break!',
        'Consider working on offline tasks for a moment'
      ];
      break;
    case 500:
      errorResponse.error.suggestions = [
        'Try refreshing the page',
        'Check your internet connection',
        'Try again in a few minutes',
        'Contact support if the problem persists'
      ];
      break;
    case 502:
    case 503:
      errorResponse.error.suggestions = [
        'The service should be back shortly',
        'Try using offline features in the meantime',
        'This is a perfect opportunity for a break!'
      ];
      break;
  }

  // Add ADHD-specific comfort and guidance
  errorResponse.error.adhdSupport = {
    comfort: getComfortMessage(statusCode),
    nextSteps: getNextSteps(statusCode),
    motivation: 'Remember: every challenge is an opportunity to practice resilience. You\'ve got this! 💪'
  };

  res.status(statusCode).json(errorResponse);
};

function getComfortMessage(statusCode) {
  const comfortMessages = {
    400: 'It\'s totally normal to miss details sometimes - ADHD brains process so much information!',
    401: 'Authentication issues happen to everyone. It\'s just a small bump in the road.',
    429: 'You\'re being productive! Taking breaks actually helps with focus and creativity.',
    500: 'Technical glitches are like brain fog - frustrating but temporary.',
    502: 'Even the best systems need maintenance. This pause might be exactly what you needed.',
    503: 'Perfect time to practice patience - a valuable skill for dissertation writing!'
  };

  return comfortMessages[statusCode] || 'Every problem has a solution, and this one is just temporary.';
}

function getNextSteps(statusCode) {
  const nextSteps = {
    400: [
      'Take a deep breath',
      'Review the information you entered',
      'Try again with careful attention to details',
      'Ask for help if you\'re unsure about anything'
    ],
    401: [
      'Don\'t worry about losing your work',
      'Sign in again when you\'re ready',
      'Your progress is important and worth protecting'
    ],
    429: [
      'This is actually great timing for a 5-minute break',
      'Try some deep breathing or stretching',
      'Come back refreshed and ready to continue'
    ],
    500: [
      'Step away for a moment if you\'re feeling frustrated',
      'Try the same action again in a few minutes',
      'Remember that technology issues aren\'t your fault'
    ],
    502: [
      'Use this time to organize your thoughts',
      'Maybe jot down what you wanted to accomplish',
      'The service will be back soon'
    ]
  };

  return nextSteps[statusCode] || [
    'Take a moment to regroup',
    'Try the action again',
    'Remember that persistence pays off'
  ];
}

export default errorHandler;