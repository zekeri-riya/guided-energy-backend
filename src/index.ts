import app from './app';
import config from './config/config';
import logger from './config/logger';
import { initializeDatabase, closeDatabase } from './config/database';
import weatherScraperService from './services/weather-scraper.service';

let server: any;

async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('Database initialized successfully');

    // Initialize weather scraper
    await weatherScraperService.init();
    
    // Try to login to weather.com (optional)
    try {
      const loginSuccess = await weatherScraperService.loginToWeatherCom();
      if (loginSuccess) {
        logger.info('Weather.com login successful');
      } else {
        logger.info('Weather.com login skipped - credentials not provided or login failed');
      }
    } catch (error) {
      logger.warn('Weather.com login failed, continuing with anonymous scraping:', error);
    }

    // Start HTTP server
    server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode`);
      logger.info(`API Base URL: http://localhost:${config.port}/v1`);
      logger.info('Available endpoints:');
      logger.info('  POST /v1/auth/login');
      logger.info('  POST /v1/auth/register');
      logger.info('  GET  /v1/weather/city/:cityName');
      logger.info('  GET  /v1/weather/cities');
      logger.info('  GET  /v1/favorites');
      logger.info('  POST /v1/favorites');
      logger.info('  GET  /v1/llm/summary');
      logger.info('  POST /v1/llm/ask');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
const exitHandler = async () => {
  if (server) {
    server.close(async () => {
      logger.info('Server closed');
      
      // Close database connection
      await closeDatabase();
      
      // Close weather scraper
      await weatherScraperService.close();
      
      process.exit(1);
    });
  } else {
    await closeDatabase();
    await weatherScraperService.close();
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error: any) => {
  logger.error('Unexpected error:', error);
  exitHandler();
};

// Handle process events
process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);
process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  exitHandler();
});
process.on('SIGINT', () => {
  logger.info('SIGINT received');
  exitHandler();
});

// Start the server
startServer();
