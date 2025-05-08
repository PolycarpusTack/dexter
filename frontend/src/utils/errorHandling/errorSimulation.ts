// src/utils/errorHandling/errorSimulation.ts

/**
 * Utility to simulate different types of errors for testing purposes
 * Only available in development mode
 */

// Guard against importing in production
if (process.env.NODE_ENV === 'production') {
  console.warn('Error simulation utilities should not be included in production builds');
}

/**
 * Simulate a network error
 * @param message - Optional custom error message
 * @returns Simulated network error
 */
export function simulateNetworkError(message = 'Simulated network error'): Error {
  const error = new Error(message);
  error.code = 'ERR_NETWORK';
  error.isAxiosError = true;
  return error;
}

/**
 * Simulate a timeout error
 * @param message - Optional custom error message
 * @returns Simulated timeout error
 */
export function simulateTimeoutError(message = 'Simulated request timeout'): Error {
  const error = new Error(message);
  error.code = 'ECONNABORTED';
  error.isAxiosError = true;
  return error;
}

/**
 * Simulate an API error with specific status code
 * @param status - HTTP status code
 * @param data - Response data
 * @param message - Optional custom error message
 * @returns Simulated Axios error
 */
export function simulateApiError(status: number, data: any = {}, message?: string): Error {
  let errorMessage = message;
  
  if (!errorMessage) {
    // Generate default message based on status code
    if (status === 400) errorMessage = 'Bad Request';
    else if (status === 401) errorMessage = 'Unauthorized';
    else if (status === 403) errorMessage = 'Forbidden';
    else if (status === 404) errorMessage = 'Not Found';
    else if (status === 429) errorMessage = 'Too Many Requests';
    else if (status >= 500) errorMessage = 'Server Error';
    else errorMessage = `HTTP Error ${status}`;
  }
  
  const error = new Error(errorMessage);
  error.isAxiosError = true;
  error.response = {
    status,
    data,
    statusText: errorMessage,
    headers: {},
    config: {},
  };
  
  return error;
}

/**
 * Simulate a validation error with form field errors
 * @param fieldErrors - Map of field names to error messages
 * @returns Simulated Axios error with validation details
 */
export function simulateValidationError(fieldErrors: Record<string, string>): Error {
  // Format in FastAPI validation error style
  const details = Object.entries(fieldErrors).map(([field, message]) => ({
    loc: ['body', field],
    msg: message,
    type: 'value_error'
  }));
  
  return simulateApiError(422, {
    detail: details
  }, 'Validation Error');
}

/**
 * Simulate a React error in a component
 * @param message - Error message
 * @returns Component that throws the specified error when rendered
 */
export function ErrorComponent({ message = 'Simulated React Error' }: { message?: string }): React.ReactElement {
  throw new Error(message);
}

/**
 * Create a function that simulates an async error
 * @param error - Error to throw
 * @param delay - Delay in ms before rejecting
 * @returns Function that returns a rejected promise
 */
export function createAsyncError(error: Error | string, delay = 0): () => Promise<never> {
  const actualError = typeof error === 'string' ? new Error(error) : error;
  
  return (...args: any[]) => {
    return new Promise<never>((resolve, reject) => {
      setTimeout(() => {
        reject(actualError);
      }, delay);
    });
  };
}

/**
 * Create a function that simulates an intermittent failure
 * @param successFn - Function to call on success
 * @param error - Error to throw or function returning an error
 * @param failRate - Percentage chance of failure (0-100)
 * @returns Function that sometimes succeeds, sometimes fails
 */
export function createIntermittentFailure<T extends (...args: any[]) => Promise<any>>(
  successFn: T,
  error: Error | string | ((args: Parameters<T>) => Error | string),
  failRate = 50
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  const getError = typeof error === 'function' 
    ? error 
    : () => (typeof error === 'string' ? new Error(error) : error);
  
  return (...args: Parameters<T>) => {
    if (Math.random() * 100 < failRate) {
      // Simulate failure
      const generatedError = getError(args);
      return Promise.reject(typeof generatedError === 'string' ? new Error(generatedError) : generatedError);
    } else {
      // Pass through to real function
      return Promise.resolve(successFn(...args));
    }
  };
}

/**
 * Create a throttled function that fails with 429 after a certain number of calls
 * @param fn - Function to throttle
 * @param limit - Number of allowed calls
 * @param resetTimeMs - Time in ms to reset the counter
 * @returns Throttled function
 */
export function createThrottledFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  limit = 5,
  resetTimeMs = 60000
): T {
  let callCount = 0;
  let resetTimer: NodeJS.Timeout | null = null;
  
  const resetCounter = () => {
    callCount = 0;
    resetTimer = null;
  };
  
  return ((...args: Parameters<T>) => {
    if (callCount >= limit) {
      return Promise.reject(simulateApiError(429, {
        message: 'Rate limit exceeded',
        retryAfter: resetTimeMs / 1000
      }));
    }
    
    callCount++;
    
    if (!resetTimer) {
      resetTimer = setTimeout(resetCounter, resetTimeMs);
    }
    
    return fn(...args);
  }) as T;
}

export default {
  simulateNetworkError,
  simulateTimeoutError,
  simulateApiError,
  simulateValidationError,
  ErrorComponent,
  createAsyncError,
  createIntermittentFailure,
  createThrottledFunction
};
