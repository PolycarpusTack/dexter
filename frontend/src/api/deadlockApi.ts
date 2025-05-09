// File: src/api/deadlockApi.ts

import apiClient from './apiClient';
import { DeadlockAnalysisResponse } from '../types/deadlock';
import { createErrorHandler } from '../utils/errorHandling';

// Error handler for deadlock API
const handleDeadlockError = createErrorHandler('Deadlock API Error', {
  context: { apiModule: 'deadlockApi' }
});

/**
 * Options for analyzing a deadlock
 */
export interface AnalyzeDeadlockOptions {
  /** Use the enhanced analysis algorithm */
  useEnhanced?: boolean;
  /** Extract additional context from related events */
  includeRelatedEvents?: boolean;
  /** Include raw deadlock log in response */
  includeRawLog?: boolean;
}

/**
 * Analyze a PostgreSQL deadlock from an event
 * 
 * @param eventId - Event ID containing deadlock information
 * @param options - Analysis options
 * @returns Promise with deadlock analysis results
 */
export const analyzeDeadlock = async (
  eventId: string,
  options: AnalyzeDeadlockOptions = {}
): Promise<DeadlockAnalysisResponse> => {
  const {
    useEnhanced = true,
    includeRelatedEvents = false,
    includeRawLog = false
  } = options;

  try {
    return await apiClient.get<DeadlockAnalysisResponse>(
      `/analyze/deadlock/${eventId}`,
      {
        params: {
          enhanced: useEnhanced,
          include_related: includeRelatedEvents,
          include_raw: includeRawLog
        }
      }
    );
  } catch (error) {
    handleDeadlockError(error, {
      operation: 'analyzeDeadlock',
      eventId,
      options
    });
    throw error;
  }
};

/**
 * Analyze raw PostgreSQL deadlock log text
 * 
 * @param logText - Raw deadlock log text
 * @param options - Analysis options
 * @returns Promise with deadlock analysis results
 */
export const analyzeRawDeadlockLog = async (
  logText: string,
  options: Omit<AnalyzeDeadlockOptions, 'includeRawLog'> = {}
): Promise<DeadlockAnalysisResponse> => {
  const {
    useEnhanced = true,
    includeRelatedEvents = false
  } = options;

  try {
    return await apiClient.post<DeadlockAnalysisResponse>(
      '/analyze/deadlock/raw',
      {
        log_text: logText
      },
      {
        params: {
          enhanced: useEnhanced,
          include_related: includeRelatedEvents
        }
      }
    );
  } catch (error) {
    handleDeadlockError(error, {
      operation: 'analyzeRawDeadlockLog',
      logTextLength: logText.length,
      options
    });
    throw error;
  }
};

/**
 * Extract PostgreSQL deadlock log from event data
 * 
 * @param eventData - Event data containing deadlock log
 * @returns Extracted deadlock log text
 */
export const extractDeadlockLog = (eventData: any): string => {
  if (!eventData) return '';

  // Try to extract from message
  if (typeof eventData.message === 'string' && 
      eventData.message.includes('deadlock detected')) {
    return eventData.message;
  }

  // Try to extract from exception values
  if (eventData.exception?.values?.length > 0) {
    for (const exception of eventData.exception.values) {
      if (exception.value?.includes('deadlock detected')) {
        return exception.value;
      }
    }
  }

  // Try to extract from entries
  if (Array.isArray(eventData.entries)) {
    for (const entry of eventData.entries) {
      if (entry.type === 'exception' && 
          Array.isArray(entry.data?.values)) {
        for (const value of entry.data.values) {
          if (value.value?.includes('deadlock detected')) {
            return value.value;
          }
        }
      }
    }
  }

  return '';
};

/**
 * Check if an event contains a PostgreSQL deadlock
 * 
 * @param eventData - Event data to check
 * @returns Whether the event contains a deadlock
 */
export const hasDeadlock = (eventData: any): boolean => {
  return extractDeadlockLog(eventData).length > 0;
};

export default {
  analyzeDeadlock,
  analyzeRawDeadlockLog,
  extractDeadlockLog,
  hasDeadlock
};
