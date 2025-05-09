// File: src/utils/eventUtils.ts

import { SentryEvent } from '../types/deadlock';

/**
 * Extract an error type from event data
 * 
 * @param event - Sentry event data
 * @returns The error type string
 */
export function extractErrorType(event: SentryEvent): string {
  if (!event) return 'Unknown';
  
  // Check in exception values
  if (event.exception?.values && event.exception.values.length > 0) {
    return event.exception?.values?.[0]?.type || 'Unknown';
  }
  
  // Check in entries
  if (event.entries && event.entries.length > 0) {
    for (const entry of event.entries) {
      if (entry.type === 'exception' && entry.data?.values && entry.data.values.length > 0) {
        return entry.data.values[0].type || 'Unknown';
      }
    }
  }
  
  // Extract from title as fallback
  const title = event.title || '';
  if (title.includes(': ')) {
    return title?.split(': ')[0] || '';
  }
  
  return event.level || 'Error';
}

/**
 * Extract error message from event data
 * 
 * @param event - Sentry event data
 * @returns The error message string
 */
export function extractErrorMessage(event: SentryEvent): string {
  if (!event) return '';
  
  // Check direct message field
  if (event.message) {
    return event.message;
  }
  
  // Check in exception values
  if (event.exception?.values && event.exception.values.length > 0) {
    return event.exception?.values?.[0]?.value || '';
  }
  
  // Check in entries
  if (event.entries && event.entries.length > 0) {
    for (const entry of event.entries) {
      if (entry.type === 'exception' && entry.data?.values && entry.data.values.length > 0) {
        return entry.data.values[0].value || '';
      }
    }
  }
  
  // Extract from title as fallback
  const title = event.title || '';
  if (title.includes(': ')) {
    return title.split(': ').slice(1).join(': ');
  }
  
  return title;
}

/**
 * Extract a stack trace as text from event data
 * 
 * @param event - Sentry event data
 * @returns Formatted stack trace string
 */
export function extractStackTrace(event: SentryEvent): string {
  if (!event) return '';
  
  // Check in exception values
  if (event.exception?.values?.[0]?.stacktrace) {
    return formatStackTrace(event.exception.values[0].stacktrace);
  }
  
  // Check in entries
  if (event.entries && event.entries.length > 0) {
    for (const entry of event.entries) {
      if (entry.type === 'exception' && 
          entry.data?.values && 
          entry.data.values.length > 0) {
        const exceptionValue = entry.data.values[0];
        if (exceptionValue.stacktrace) {
          return formatStackTrace(exceptionValue.stacktrace);
        }
      }
    }
  }
  
  return '';
}

/**
 * Format a stacktrace object into a readable string
 * 
 * @param stacktrace - Stacktrace object from Sentry
 * @returns Formatted stack trace string
 */
function formatStackTrace(stacktrace: any): string {
  if (!stacktrace || !stacktrace.frames || !Array.isArray(stacktrace.frames)) {
    return 'No stack trace available';
  }
  
  // Format each frame into a string
  return stacktrace.frames
    .map((frame: any, index: number) => {
      const filename = frame.filename || 'unknown';
      const lineno = frame.lineno || '?';
      const colno = frame.colno || '?';
      const function_name = frame.function || '<anonymous>';
      
      return `${index}: ${function_name} (${filename}:${lineno}:${colno})`;
    })
    .join('\n');
}

/**
 * Check if an event is a database error
 * 
 * @param event - Sentry event data
 * @returns Whether the event is a database error
 */
export function isDatabaseError(event: SentryEvent): boolean {
  if (!event) return false;
  
  const errorType = extractErrorType(event).toLowerCase();
  const errorMessage = extractErrorMessage(event).toLowerCase();
  
  // Check for database-related error types
  const dbErrorTypes = [
    'databaseerror',
    'sqlerror',
    'psycopgerror',
    'operationalerror',
    'integrityerror',
    'databaseexception',
    'postgresexception',
    'sqlalchemyerror',
  ];
  
  if (dbErrorTypes.some(type => errorType.includes(type))) {
    return true;
  }
  
  // Check for database-related error messages
  const dbErrorPhrases = [
    'database',
    'sql',
    'query',
    'deadlock',
    'connection',
    'postgres',
    'mysql',
    'sqlite',
    'transaction',
    'timeout',
    'violates',
    'constraint',
    'foreign key',
  ];
  
  return dbErrorPhrases.some(phrase => errorMessage.includes(phrase));
}

export default {
  extractErrorType,
  extractErrorMessage,
  extractStackTrace,
  isDatabaseError,
};
