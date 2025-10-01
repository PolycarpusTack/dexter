import { useEffect, useRef, useCallback, useState, createElement } from 'react';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import telemetry from '../services/telemetry';

// Local debounced value hook to avoid external dependency differences
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface AutoSaveOptions {
  key: string;
  data: any;
  debounceMs?: number;
  onSave?: (data: any) => void | Promise<void>;
  onRestore?: (data: any) => void;
  enabled?: boolean;
  showNotifications?: boolean;
}

interface AutoSaveState {
  lastSaved: Date | null;
  saveCount: number;
  hasUnsavedChanges: boolean;
}

/**
 * Hook for automatic saving of component state to prevent data loss
 * Saves to localStorage and optionally to a custom save function
 */
export function useAutoSave({
  key,
  data,
  debounceMs = 2000,
  onSave,
  onRestore,
  enabled = true,
  showNotifications = false
}: AutoSaveOptions) {
  const saveCount = useRef(0);
  const lastSaved = useRef<Date | null>(null);
  const hasRestored = useRef(false);
  
  const debouncedData = useDebouncedValue(data, debounceMs);
  
  // Generate storage key with namespace
  const storageKey = `dexter_autosave_${key}`;
  
  // Save function
  const save = useCallback(async (dataToSave: any) => {
    if (!enabled) return;
    
    try {
      // Save to localStorage
      localStorage.setItem(storageKey, JSON.stringify({
        data: dataToSave,
        timestamp: new Date().toISOString(),
        version: 1
      }));
      
      // Call custom save function if provided
      if (onSave) {
        await onSave(dataToSave);
      }
      
      saveCount.current += 1;
      lastSaved.current = new Date();
      
      // Track telemetry
      telemetry.trackCustom('autosave_success', {
        key,
        saveCount: saveCount.current
      });
      
      // Show notification if enabled
      if (showNotifications) {
        notifications.show({
          title: 'Auto-saved',
          message: 'Your changes have been saved',
          color: 'green',
          icon: createElement(IconCheck, { size: 16 }),
          autoClose: 2000
        });
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      
      telemetry.trackCustom('autosave_error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      if (showNotifications) {
        notifications.show({
          title: 'Auto-save failed',
          message: 'Failed to save your changes',
          color: 'red',
          icon: createElement(IconAlertTriangle, { size: 16 })
        });
      }
    }
  }, [enabled, storageKey, onSave, showNotifications, key]);
  
  // Restore function
  const restore = useCallback(() => {
    if (!enabled || hasRestored.current) return null;
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return null;
      
      const { data: savedData, timestamp } = JSON.parse(saved);
      
      // Check if saved data is recent (within 24 hours)
      const savedDate = new Date(timestamp);
      const hoursSinceLastSave = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastSave > 24) {
        // Data is too old, remove it
        localStorage.removeItem(storageKey);
        return null;
      }
      
      hasRestored.current = true;
      
      // Call restore callback if provided
      if (onRestore) {
        onRestore(savedData);
      }
      
      telemetry.trackCustom('autosave_restore', {
        key,
        hoursAgo: hoursSinceLastSave.toFixed(1)
      });
      
      if (showNotifications) {
        notifications.show({
          title: 'Restored from auto-save',
          message: `Restored data from ${hoursSinceLastSave < 1 ? 'less than an hour' : `${Math.floor(hoursSinceLastSave)} hours`} ago`,
          color: 'blue',
          icon: createElement(IconCheck, { size: 16 })
        });
      }
      
      return savedData;
    } catch (error) {
      console.error('Auto-restore failed:', error);
      return null;
    }
  }, [enabled, storageKey, onRestore, showNotifications, key]);
  
  // Auto-save effect
  useEffect(() => {
    if (!enabled || !debouncedData) return;
    
    save(debouncedData);
  }, [debouncedData, save, enabled]);
  
  // Clear function
  const clear = useCallback(() => {
    localStorage.removeItem(storageKey);
    saveCount.current = 0;
    lastSaved.current = null;
    
    telemetry.trackCustom('autosave_clear', { key });
  }, [storageKey, key]);
  
  // Manual save function
  const saveNow = useCallback(() => {
    save(data);
  }, [save, data]);
  
  // Check for unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (!lastSaved.current) return false;
    
    const saved = localStorage.getItem(storageKey);
    if (!saved) return false;
    
    try {
      const { data: savedData } = JSON.parse(saved);
      return JSON.stringify(savedData) !== JSON.stringify(data);
    } catch {
      return false;
    }
  }, [storageKey, data]);
  
  return {
    save: saveNow,
    restore,
    clear,
    lastSaved: lastSaved.current,
    saveCount: saveCount.current,
    hasUnsavedChanges: hasUnsavedChanges()
  };
}

/**
 * Hook to warn users about unsaved changes when leaving
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean, message?: string) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    const warningMessage = message || 'You have unsaved changes. Are you sure you want to leave?';
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = warningMessage;
      return warningMessage;
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, message]);
}
