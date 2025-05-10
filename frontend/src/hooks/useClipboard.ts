// File: src/hooks/useClipboard.ts

import { useState, useCallback, useEffect } from 'react';
import { showSuccessNotification, showErrorNotification } from '../utils/errorHandling';

export interface UseClipboardOptions {
  /** Message to show on success */
  successMessage?: string;
  /** Message to show on error */
  errorMessage?: string;
  /** Duration to display success state (ms) */
  successDuration?: number;
  /** Whether to show a notification */
  showNotification?: boolean;
}

/**
 * Hook for copying text to clipboard with success/error state
 * 
 * @returns Object with copy function and status
 */
export function useClipboard() {
  const [isCopied, setIsCopied] = useState(false);
  
  // Reset copied state after timeout
  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => {
        setIsCopied(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
    return undefined; // Add explicit return for when isCopied is false
  }, [isCopied]);
  
  /**
   * Copy text to clipboard
   * 
   * @param text - Text to copy
   * @param options - Additional options
   * @returns Promise resolving to success status
   */
  const copyToClipboard = useCallback(async (
    text: string, 
    options: UseClipboardOptions = {}
  ): Promise<boolean> => {
    const {
      successMessage = 'Copied to clipboard',
      errorMessage = 'Failed to copy to clipboard',
      successDuration = 3000,
      showNotification = false
    } = options;
    
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      
      if (showNotification) {
        showSuccessNotification({
          title: 'Copied',
          message: successMessage,
          autoClose: successDuration
        });
      }
      
      // Reset after duration
      setTimeout(() => {
        setIsCopied(false);
      }, successDuration);
      
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      
      if (showNotification) {
        showErrorNotification({
          title: 'Copy Failed',
          message: errorMessage,
          error: error as Error
        });
      }
      
      return false;
    }
  }, []);
  
  return { isCopied, copyToClipboard };
}

export default useClipboard;
