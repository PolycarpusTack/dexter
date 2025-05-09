// File: src/utils/errorRecovery.ts

/**
 * Interface for recovery strategy
 */
export interface RecoveryStrategy {
  name: string;
  description: string;
  canHandle: (error: Error) => boolean;
  apply: (error: Error, context?: any) => Promise<any>;
  priority: number;
}

/**
 * Recovery strategy for network connectivity issues
 */
export const networkRecoveryStrategy: RecoveryStrategy = {
  name: 'NetworkRecovery',
  description: 'Attempts to recover from network connectivity issues',
  priority: 10,
  canHandle: (error: Error) => {
    const message = error.message.toLowerCase();
    return message.includes('network') || 
           message.includes('connection') || 
           message.includes('offline') ||
           message.includes('timeout');
  },
  apply: async (error: Error, context?: any) => {
    // Wait a short time before retrying
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return the retry function or other context needed
    return {
      message: 'Network recovery attempted, please retry the operation',
      retry: context?.retry,
      recoveryAttempted: true
    };
  }
};

/**
 * Recovery strategy for session expiration
 */
export const sessionRecoveryStrategy: RecoveryStrategy = {
  name: 'SessionRecovery',
  description: 'Attempts to recover from expired sessions',
  priority: 20,
  canHandle: (error: Error) => {
    const message = error.message.toLowerCase();
    const status = (error as any).status;
    
    return message.includes('unauthorized') || 
           message.includes('unauthenticated') ||
           message.includes('session expired') ||
           status === 401;
  },
  apply: async (error: Error, context?: any) => {
    console.log('Attempting session recovery...');
    
    // Here you could trigger a session refresh
    // For now, we'll just return a message
    return {
      message: 'Your session has expired, please log in again',
      requiresLogin: true,
      recoveryAttempted: true
    };
  }
};

/**
 * Default recovery strategies
 */
export const DEFAULT_RECOVERY_STRATEGIES: RecoveryStrategy[] = [
  networkRecoveryStrategy,
  sessionRecoveryStrategy
];

/**
 * Attempt to recover from an error using available strategies
 * 
 * @param error - The error to recover from
 * @param context - Additional context that might be needed for recovery
 * @param strategies - Recovery strategies to try
 * @returns Recovery result or null if no recovery was possible
 */
export async function attemptErrorRecovery(
  error: Error,
  context?: any,
  strategies: RecoveryStrategy[] = DEFAULT_RECOVERY_STRATEGIES
): Promise<any | null> {
  // Sort strategies by priority
  const sortedStrategies = [...strategies].sort((a, b) => b.priority - a.priority);
  
  // Try each strategy in order
  for (const strategy of sortedStrategies) {
    if (strategy.canHandle(error)) {
      try {
        const result = await strategy.apply(error, context);
        console.log(`Recovery strategy ${strategy.name} applied successfully`);
        return result;
      } catch (recoveryError) {
        console.error(`Recovery strategy ${strategy.name} failed:`, recoveryError);
        // Continue to next strategy
      }
    }
  }
  
  // No recovery was possible
  return null;
}

export default {
  attemptErrorRecovery,
  DEFAULT_RECOVERY_STRATEGIES,
  networkRecoveryStrategy,
  sessionRecoveryStrategy
};
