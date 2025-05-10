// File: src/utils/errorHandling/errorSimulation.ts

import ErrorFactory from '../errorFactory';

/**
 * Available error types for simulation
 */
export type SimulatedErrorType = 
  | 'network'
  | 'timeout'
  | 'server'
  | 'not_found'
  | 'authorization'
  | 'validation'
  | 'parsing'
  | 'client';

/**
 * Options for simulated error
 */
export interface SimulatedErrorOptions {
  /** Simulated error message */
  message?: string;
  /** Additional error data */
  data?: any;
  /** HTTP status code (for API errors) */
  status?: number;
  /** Delay before error occurs (ms) */
  delay?: number;
  /** Whether to include stack trace */
  includeStack?: boolean;
}

/**
 * Create a simulated error for testing
 * 
 * @param type - Type of error to simulate
 * @param options - Error configuration options
 * @returns Simulated error object
 */
export function createSimulatedError(
  type: SimulatedErrorType,
  options: SimulatedErrorOptions = {}
): Error {
  const {
    message,
    data = {},
    status,
    includeStack = true
  } = options;
  
  let error: Error;
  
  switch (type) {
    case 'network':
      error = ErrorFactory.createNetworkError(
        message || 'Network connection failed',
        { metadata: { simulation: true, ...data } }
      );
      break;
      
    case 'timeout':
      error = ErrorFactory.createNetworkError(
        message || 'Request timed out after 30000ms',
        { 
          metadata: { 
            simulation: true,
            timeout: 30000,
            ...data
          }
        }
      );
      break;
      
    case 'server':
      error = ErrorFactory.createApiError(
        message || 'Internal Server Error',
        status || 500,
        data,
        { metadata: { simulation: true } }
      );
      break;
      
    case 'not_found':
      error = ErrorFactory.createApiError(
        message || 'Resource not found',
        status || 404,
        data,
        { metadata: { simulation: true } }
      );
      break;
      
    case 'authorization':
      error = ErrorFactory.createApiError(
        message || 'Unauthorized access',
        status || 401,
        data,
        { metadata: { simulation: true } }
      );
      break;
      
    case 'validation':
      error = ErrorFactory.createApiError(
        message || 'Validation failed',
        status || 422,
        data || { errors: { field1: ['is required'], field2: ['must be a number'] } },
        { metadata: { simulation: true } }
      );
      break;
      
    case 'parsing':
      error = ErrorFactory.create(
        new SyntaxError(message || 'Unexpected token < in JSON at position 0'),
        { 
          category: 'parsing',
          metadata: { simulation: true, ...data }
        }
      );
      break;
      
    case 'client':
      error = ErrorFactory.createApiError(
        message || 'Bad Request',
        status || 400,
        data,
        { metadata: { simulation: true } }
      );
      break;
      
    default:
      error = new Error(message || 'Generic error');
      (error as any).metadata = { simulation: true, ...data };
  }
  
  // Remove stack trace if not requested
  if (!includeStack) {
    error.stack = undefined;
  }
  
  // Add simulation marker
  (error as any)._simulated = true;
  
  return error;
}

/**
 * Async function that throws a simulated error after a delay
 * 
 * @param type - Type of error to simulate
 * @param options - Error configuration options
 * @returns Promise that rejects with the simulated error
 */
export async function throwSimulatedError(
  type: SimulatedErrorType,
  options: SimulatedErrorOptions = {}
): Promise<never> {
  const { delay = 500 } = options;
  
  // Wait for specified delay
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  // Create and throw the error
  const error = createSimulatedError(type, options);
  throw error;
}

/**
 * Check if an error was created with the simulation utilities
 * 
 * @param error - Error to check
 * @returns Whether the error is simulated
 */
export function isSimulatedError(error: any): boolean {
  return error && error._simulated === true;
}

export default {
  createSimulatedError,
  throwSimulatedError,
  isSimulatedError
};
