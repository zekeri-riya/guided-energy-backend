// src/cron/email-sequence.cron.ts
import cron from 'node-cron';
import emailSequenceService from '../services/email-sequence.service';
import logger from '../config/logger';

/**
 * Initialize cron job for processing scheduled email sequences
 */
export function initEmailSequenceCron() {
  // Run every hour on the hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Running scheduled email sequence processing');
    
    try {
      const result = await emailSequenceService.processScheduledEmails();
      logger.info(`Processed ${result.processed} scheduled emails`);
    } catch (error) {
      logger.error('Error processing scheduled emails:', error);
    }
  });
  
  logger.info('Email sequence cron job initialized');
}