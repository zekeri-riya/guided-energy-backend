// src/app.ts
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import httpStatus from 'http-status';
import config from './config/config';
import morgan from './config/morgan';
import routes from './routes/v1';
import { errorConverter, errorHandler } from './middlewares/error';
import { generalRateLimiter } from './middlewares/rateLimiter';
import ApiError from './utils/ApiError';
import logger from './config/logger';

const app = express();

// Trust proxy for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// Logging middleware
if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// Security HTTP headers
app.use(helmet());

// Parse JSON request body
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded request body
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Gzip compression
app.use(compression());

// Enable CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// General rate limiting
app.use('/v1', generalRateLimiter);

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Weather API is running!',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/v1', routes);

// Handle 404 errors
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Endpoint not found'));
});

// Convert errors to ApiError
app.use(errorConverter);

// Handle errors
app.use(errorHandler);

export default app;