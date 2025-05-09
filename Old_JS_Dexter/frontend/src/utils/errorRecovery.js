// File: frontend/src/utils/errorRecovery.js

/**
 * Error Recovery Service
 * Provides a registry of recovery strategies for different error types
 */
export const RecoveryService = {
  // Registry of recovery strategies
  strategies: {
    default: (reset) => {
      // Simple state reset
      if (typeof reset === 'function') {
        reset();
      }
    },
    
    auth: (reset) => {
      // Redirect to login
      console.log('Redirecting to login due to auth error');
      // In a real app, this would use your router to navigate:
      // navigate('/login', { state: { from: window.location.pathname } });
      
      // Optionally reset the error state afterward
      if (typeof reset === 'function') {
        reset();
      }
    },
    
    data: (reset) => {
      // Clear data stores and reload
      console.log('Reloading data stores');
      // In a real app, this would clear your data state:
      // store.dispatch(clearDataStores());
      
      // Reset the error boundary
      if (typeof reset === 'function') {
        reset();
      }
    },
    
    critical: () => {
      // Full page reload for critical errors
      console.log('Critical error - reloading page');
      window.location.reload();
    },
    
    navigate: (reset, destination = '/') => {
      // Navigate to a specific location
      console.log(`Navigating to ${destination}`);
      // In a real app, this would use your router:
      // navigate(destination);
      
      // Reset the error boundary first
      if (typeof reset === 'function') {
        reset();
      }
    }
  },
  
  // Register a new recovery strategy
  registerStrategy: function(name, handler) {
    if (typeof handler !== 'function') {
      throw new Error(`Recovery strategy handler for "${name}" must be a function`);
    }
    
    this.strategies[name] = handler;
    return this; // Allow chaining
  },
  
  // Execute a recovery strategy
  execute: function(name = 'default', reset, ...args) {
    const strategy = this.strategies[name] || this.strategies.default;
    return strategy(reset, ...args);
  },
  
  // Helper to determine best recovery strategy based on error
  determineStrategy: function(error) {
    if (!error) return 'default';
    
    // Auth errors
    if (
      error.status === 401 || 
      error.status === 403 || 
      error.message?.includes('unauthorized') ||
      error.message?.includes('forbidden') ||
      error.name === 'AuthError'
    ) {
      return 'auth';
    }
    
    // Data errors
    if (
      error.status === 404 ||
      error.status === 422 ||
      error.name === 'DataError' ||
      error.message?.includes('not found')
    ) {
      return 'data';
    }
    
    // Critical errors
    if (
      error.status === 500 ||
      error.name === 'ChunkLoadError' ||
      error.name === 'NetworkError' ||
      error.message?.includes('failed to load') ||
      error.message?.includes('network')
    ) {
      return 'critical';
    }
    
    return 'default';
  }
};

export default RecoveryService;
