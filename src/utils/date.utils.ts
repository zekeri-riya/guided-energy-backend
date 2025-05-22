// src/utils/date.utils.ts
/**
 * Parse timing string (e.g., "3 days after previous email") to number of days
 */
export function parseTimingString(timingString?: string): number | null {
    if (!timingString) return null;
    
    const match = timingString.match(/(\d+)\s+(day|days)/i);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    
    return null;
  }
  
  /**
   * Calculate next send date based on a base date and number of days to wait
   */
  export function calculateNextSendDate(baseDate: Date, waitDays: number): Date {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + waitDays);
    
    // Set to 9:00 AM for consistent sending time
    date.setHours(9, 0, 0, 0);
    
    return date;
  }