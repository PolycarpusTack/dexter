// src/utils/errorSimulation.js

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
 * @param {string} message - Optional custom error message
 * @returns {Error} - Simulated network error
 */
export function simulateNetworkError(message = 'Simulated network error') {
  const error = new Error(message);
  error.code = 'ERR_NETWORK';
  error.isAxiosError = true;
  return error;
}

/**
 * Simulate a timeout error
 * @param {string} message - Optional custom error message
 * @returns {Error} - Simulated timeout error
 */
export function simulateTimeoutError(message = 'Simulated request timeout') {
  const error = new Error(message);
  error.code = 'ECONNABORTED';
  error.isAxiosError = true;
  return error;
}

/**
 * Simulate an API error with specific status code
 * @param {number} status - HTTP status code
 * @param {Object} data - Response data
 * @param {string} message - Optional custom error message
 * @returns {Object} - Simulated Axios error
 */
export function simulateApiError(status, data = {}, message = null) {
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
 * @param {Object} fieldErrors - Map of field names to error messages
 * @returns {Object} - Simulated Axios error with validation details
 */
export function simulateValidationError(fieldErrors) {
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
 * @param {string} message - Error message
 * @returns {React.Component} - Component that throws the specified error when rendered
 */
export function ErrorComponent({ message = 'Simulated React Error' }) {
  throw new Error(message);
}

/**
 * Create a function that simulates an async error
 * @param {Error|string} error - Error to throw
 * @param {number} delay - Delay in ms before rejecting
 * @returns {Function} - Function that returns a rejected promise
 */
export function createAsyncError(error, delay = 0) {
  const actualError = typeof error === 'string' ? new Error(error) : error;
  
  return (...args) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(actualError);
      }, delay);
    });
  };
}

/**
 * Create a function that simulates an intermittent failure
 * @param {Function} successFn - Function to call on success
 * @param {Error|string|Function} error - Error to throw or function returning an error
 * @param {number} failRate - Percentage chance of failure (0-100)
 * @returns {Function} - Function that sometimes succeeds, sometimes fails
 */
export function createIntermittentFailure(successFn, error, failRate = 50) {
  const getError = typeof error === 'function' 
    ? error 
    : () => (typeof error === 'string' ? new Error(error) : error);
  
  return (...args) => {
    if (Math.random() * 100 < failRate) {
      // Simulate failure
      return Promise.reject(getError(...args));
    } else {
      // Pass through to real function
      return Promise.resolve(successFn(...args));
    }
  };
}

/**
 * Create a throttled function that fails with 429 after a certain number of calls
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Number of allowed calls
 * @param {number} resetTimeMs - Time in ms to reset the counter
 * @returns {Function} - Throttled function
 */
export function createThrottledFunction(fn, limit = 5, resetTimeMs = 60000) {
  let callCount = 0;
  let resetTimer = null;
  
  const resetCounter = () => {
    callCount = 0;
    resetTimer = null;
  };
  
  return (...args) => {
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
  };
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
