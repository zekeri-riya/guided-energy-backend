// middlewares/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import config from '../config/config';

/**
 * Rate limiter for authentication routes
 * More restrictive to prevent brute force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Increased limit for authentication
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed requests
  message: 'Too many authentication attempts, please try again later',
});

/**
 * General rate limiter for all other routes
 * More permissive, but still prevents abuse
 */
const generalRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute (reduced from 5 minutes)
  limit: 500, // Significantly increased from 300
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later',
  // The keyGenerator helps create unique identifiers for rate limiting
  keyGenerator: (req: Request): string => {
    // Use IP + route as the key to separate limits by endpoint
    return `${req.ip}-${req.originalUrl}`;
  },
});

/**
 * Specific rate limiter for payments-related endpoints
 * These endpoints were showing frequent 429 errors in logs
 */
const paymentsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 120, // 2 requests per second average
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many payment-related requests, please try again later',
  keyGenerator: (req: Request): string => {
    // Use IP + path to track per-endpoint limits
    return `${req.ip}-${req.path}`;
  },
});

/**
 * Rate limiter specifically for business-related endpoints
 * These endpoints were also showing 429 errors in logs
 */
const businessLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 120, // 2 requests per second average
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many business-related requests, please try again later',
});

/**
 * Rate limiter for user data endpoints
 * These endpoints were showing 429 errors in logs
 */
const usersLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 120, // 2 requests per second average
  standardHeaders: true, 
  legacyHeaders: false,
  message: 'Too many user-related requests, please try again later',
});

export { 
  authLimiter, 
  generalRateLimiter,
  paymentsLimiter,
  businessLimiter,
  usersLimiter
};