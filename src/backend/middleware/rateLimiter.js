import rateLimit from 'express-rate-limit';

/**
 * ADHD-friendly rate limiting middleware
 * Provides helpful, supportive messages when limits are reached
 */

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      status: 429,
      message: 'Too many requests',
      adhdFriendlyMessage: 'You\'re very productive today! Let\'s take a short breather before the next request.',
      suggestions: [
        'This is actually great timing for a 5-minute break',
        'Try some deep breathing or stretching',
        'Come back refreshed and ready to continue',
        'Consider working on offline tasks for a moment'
      ],
      adhdSupport: {
        comfort: 'You\'re being productive! Taking breaks actually helps with focus and creativity.',
        nextSteps: [
          'This is actually great timing for a 5-minute break',
          'Try some deep breathing or stretching',
          'Come back refreshed and ready to continue'
        ],
        motivation: 'Rest is productive too! Your brain needs time to process and recharge. 🧠✨'
      }
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests (2xx status codes)
  skipSuccessfulRequests: false,
  // Skip failed requests
  skipFailedRequests: false,
  // Use default key generator to handle IPv6 properly
  // Custom handler for when limit is exceeded
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        status: 429,
        message: 'Rate limit exceeded',
        adhdFriendlyMessage: 'Whoa there, productivity champion! Let\'s take a moment to breathe.',
        suggestions: [
          'Perfect time for a mindful break',
          'Maybe grab some water or tea',
          'Do a quick stretch or walk around',
          'This pause might be exactly what your brain needs'
        ],
        adhdSupport: {
          comfort: 'High activity often means you\'re in a good flow state! That\'s actually wonderful.',
          nextSteps: [
            'Take this as a gentle nudge to pause',
            'Notice how you\'re feeling right now',
            'Come back in a few minutes when you\'re ready'
          ],
          motivation: 'Even race cars need pit stops! You\'re doing great work. 🏁'
        },
        retryAfter: Math.ceil(15 * 60), // 15 minutes in seconds
        resetTime: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      }
    });
  }
});

export default rateLimiter;