import { useState, useEffect, useCallback, useRef, createElement } from 'react';
import { useAutoSave, useUnsavedChangesWarning } from './useAutoSave';
import { stateRestoration } from '../services/stateRestoration';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconCheck, IconRefresh } from '@tabler/icons-react';
import { telemetry } from '../services/telemetry';
import { AUTOSAVE_INTERVAL_5_MINUTES } from '../constants/timing';

interface ErrorRecoveryStateOptions<T> {
  key: string;
  initialState: T;
  onRestore?: (state: T) => void;
  onError?: (error: Error) => void;
  enableAutoSave?: boolean;
  enableCheckpoints?: boolean;
  autoSaveDebounce?: number;
  showNotifications?: boolean;
}

interface ErrorRecoveryState<T> {
  state: T;
  setState: (state: T | ((prev: T) => T)) => void;
  error: Error | null;
  isRecovering: boolean;
  hasUnsavedChanges: boolean;
  lastCheckpoint: string | null;
  save: () => void;
  restore: () => void;
  createCheckpoint: () => string | null;
  restoreFromCheckpoint: (checkpointId: string) => boolean;
  clearError: () => void;
  reset: () => void;
}

/**
 * Hook that provides state management with automatic error recovery
 * Combines auto-save, state restoration, and error handling
 */
export function useErrorRecoveryState<T>({
  key,
  initialState,
  onRestore,
  onError,
  enableAutoSave = true,
  enableCheckpoints = true,
  autoSaveDebounce = 2000,
  showNotifications = true
}: ErrorRecoveryStateOptions<T>): ErrorRecoveryState<T> {
  const [state, setStateInternal] = useState<T>(initialState);
  const [error, setError] = useState<Error | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [lastCheckpoint, setLastCheckpoint] = useState<string | null>(null);
  
  const hasRestoredRef = useRef(false);
  const errorCountRef = useRef(0);
  
  // Auto-save setup
  const {
    save: autoSave,
    restore: autoRestore,
    clear: clearAutoSave,
    hasUnsavedChanges
  } = useAutoSave({
    key: `error_recovery_${key}`,
    data: state,
    debounceMs: autoSaveDebounce,
    enabled: enableAutoSave,
    showNotifications: false,
    onRestore: (restoredState) => {
      setStateInternal(restoredState);
      if (onRestore) {
        onRestore(restoredState);
      }
    }
  });
  
  // Warn about unsaved changes
  useUnsavedChangesWarning(hasUnsavedChanges);
  
  // Restore state on mount
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    
    // Try to restore from auto-save first
    const restored = autoRestore();
    if (restored) {
      setStateInternal(restored);
      return;
    }
    
    // Try to restore from state restoration service
    const snapshot = stateRestoration.restoreSnapshot(`error_recovery_${key}`, {
      maxAge: 24,
      onRestore: (restoredState) => {
        setStateInternal(restoredState);
        if (onRestore) {
          onRestore(restoredState);
        }
      }
    });
    
    if (snapshot && showNotifications) {
      notifications.show({
        title: 'State restored',
        message: 'Your previous work has been restored',
        color: 'blue',
        icon: createElement(IconCheck, { size: 16 })
      });
    }
  }, [key, autoRestore, onRestore, showNotifications]);
  
  // Enhanced setState with error handling
  const setState = useCallback((newState: T | ((prev: T) => T)) => {
    try {
      setStateInternal(newState);
      setError(null);
      errorCountRef.current = 0;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('State update failed');
      setError(error);
      errorCountRef.current += 1;
      
      telemetry.trackEvent('error_recovery_state_error', {
        key,
        errorCount: errorCountRef.current,
        error: error.message
      });
      
      if (onError) {
        onError(error);
      }
      
      // Attempt recovery after multiple errors
      if (errorCountRef.current >= 3) {
        attemptRecovery();
      }
    }
  }, [key, onError]);
  
  // Recovery attempt
  const attemptRecovery = useCallback(async () => {
    setIsRecovering(true);
    
    try {
      // First, try to restore from the last checkpoint
      if (lastCheckpoint) {
        const checkpoint = stateRestoration.restoreFromCheckpoint(lastCheckpoint);
        if (checkpoint) {
          setStateInternal(checkpoint.data);
          setError(null);
          errorCountRef.current = 0;
          
          if (showNotifications) {
            notifications.show({
              title: 'Recovered from checkpoint',
              message: 'Your work has been restored to the last stable state',
              color: 'green',
              icon: createElement(IconRefresh, { size: 16 })
            });
          }
          
          telemetry.trackEvent('error_recovery_success', {
            key,
            method: 'checkpoint'
          });
          
          setIsRecovering(false);
          return;
        }
      }
      
      // Try auto-save
      const restored = autoRestore();
      if (restored) {
        setStateInternal(restored);
        setError(null);
        errorCountRef.current = 0;
        
        telemetry.trackEvent('error_recovery_success', {
          key,
          method: 'autosave'
        });
        
        setIsRecovering(false);
        return;
      }
      
      // Try state restoration
      const snapshot = stateRestoration.restoreSnapshot(`error_recovery_${key}`);
      if (snapshot) {
        setStateInternal(snapshot);
        setError(null);
        errorCountRef.current = 0;
        
        telemetry.trackEvent('error_recovery_success', {
          key,
          method: 'snapshot'
        });
        
        setIsRecovering(false);
        return;
      }
      
      // Last resort: reset to initial state
      setStateInternal(initialState);
      setError(null);
      errorCountRef.current = 0;
      
      if (showNotifications) {
        notifications.show({
          title: 'State reset',
          message: 'Unable to recover previous state, reset to defaults',
          color: 'yellow',
          icon: createElement(IconAlertTriangle, { size: 16 })
        });
      }
      
      telemetry.trackEvent('error_recovery_reset', { key });
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
      
      telemetry.trackEvent('error_recovery_failed', {
        key,
        error: recoveryError instanceof Error ? recoveryError.message : 'Unknown error'
      });
      
      if (showNotifications) {
        notifications.show({
          title: 'Recovery failed',
          message: 'Unable to recover state. Please refresh the page.',
          color: 'red',
          icon: createElement(IconAlertTriangle, { size: 16 })
        });
      }
    } finally {
      setIsRecovering(false);
    }
  }, [key, lastCheckpoint, autoRestore, initialState, showNotifications]);
  
  // Manual save
  const save = useCallback(() => {
    autoSave();
    stateRestoration.saveSnapshot(`error_recovery_${key}`, state);
    
    if (showNotifications) {
      notifications.show({
        title: 'Saved',
        message: 'Your work has been saved',
        color: 'green',
        icon: createElement(IconCheck, { size: 16 }),
        autoClose: 2000
      });
    }
  }, [autoSave, key, state, showNotifications]);
  
  // Manual restore
  const restore = useCallback(() => {
    attemptRecovery();
  }, [attemptRecovery]);
  
  // Create checkpoint
  const createCheckpoint = useCallback(() => {
    if (!enableCheckpoints) return null;
    
    try {
      const checkpointId = stateRestoration.createRecoveryCheckpoint({
        [key]: state
      });
      
      setLastCheckpoint(checkpointId);
      
      if (showNotifications) {
        notifications.show({
          title: 'Checkpoint created',
          message: 'A recovery point has been saved',
          color: 'blue',
          icon: createElement(IconCheck, { size: 16 })
        });
      }
      
      return checkpointId;
    } catch (error) {
      console.error('Failed to create checkpoint:', error);
      return null;
    }
  }, [enableCheckpoints, key, state, showNotifications]);
  
  // Restore from specific checkpoint
  const restoreFromCheckpoint = useCallback((checkpointId: string): boolean => {
    try {
      const checkpoint = stateRestoration.restoreFromCheckpoint(checkpointId);
      if (!checkpoint || !checkpoint.data[key]) return false;
      
      setStateInternal(checkpoint.data[key]);
      setError(null);
      errorCountRef.current = 0;
      
      if (showNotifications) {
        notifications.show({
          title: 'Restored from checkpoint',
          message: 'Your work has been restored',
          color: 'green',
          icon: createElement(IconCheck, { size: 16 })
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to restore from checkpoint:', error);
      return false;
    }
  }, [key, showNotifications]);
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
    errorCountRef.current = 0;
  }, []);
  
  // Reset to initial state
  const reset = useCallback(() => {
    setStateInternal(initialState);
    setError(null);
    errorCountRef.current = 0;
    clearAutoSave();
    setLastCheckpoint(null);
    
    telemetry.trackEvent('error_recovery_state_reset', { key });
  }, [initialState, clearAutoSave, key]);
  
  // Create periodic checkpoints for critical data
  useEffect(() => {
    if (!enableCheckpoints) return;
    
    const interval = setInterval(() => {
      if (hasUnsavedChanges && !error && !isRecovering) {
        createCheckpoint();
      }
    }, AUTOSAVE_INTERVAL_5_MINUTES);
    
    return () => clearInterval(interval);
  }, [enableCheckpoints, hasUnsavedChanges, error, isRecovering, createCheckpoint]);
  
  return {
    state,
    setState,
    error,
    isRecovering,
    hasUnsavedChanges,
    lastCheckpoint,
    save,
    restore,
    createCheckpoint,
    restoreFromCheckpoint,
    clearError,
    reset
  };
}