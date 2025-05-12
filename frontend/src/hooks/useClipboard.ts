import { useState, useCallback, useEffect } from 'react';
import { showSuccessNotification, showErrorNotification } from '../utils/errorHandling';

interface ClipboardOptions {
  successMessage?: string;
  errorMessage?: string;
  successDuration?: number;
  showNotification?: boolean;
}

interface UseClipboardResult {
  isCopied: boolean;
  copyToClipboard: (text: string, options?: ClipboardOptions) => Promise<boolean>;
  resetCopied: () => void;
}

/**
 * Hook for clipboard operations with enhanced error handling and fallbacks
 * @returns Object with clipboard state and functions
 */
export function useClipboard(): UseClipboardResult {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  
  // Reset the copied state after a timeout
  const resetCopied = useCallback(() => {
    setIsCopied(false);
  }, []);
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      // No timeout to clean up here, moved to copyToClipboard function
    };
  }, []);
  
  /**
   * Copy text to clipboard with modern navigator.clipboard API
   * Falls back to document.execCommand for older browsers
   * @param text - Text to copy
   * @param options - Options for clipboard operation
   * @returns Promise resolving to success status
   */
  const copyToClipboard = useCallback(async (
    text: string,
    options: ClipboardOptions = {}
  ): Promise<boolean> => {
    const {
      successMessage = 'Copied to clipboard',
      errorMessage = 'Failed to copy to clipboard',
      successDuration = 2000,
      showNotification = true
    } = options;
    
    try {
      // Try the modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        
        if (showNotification) {
          showSuccessNotification({
            title: 'Success',
            message: successMessage
          });
        }
        
        // Reset the copied state after a timeout
        const timeoutId = setTimeout(() => {
          setIsCopied(false);
        }, successDuration);
        
        // Return true to indicate success
        return true;
      }
      
      // Fallback to older document.execCommand method
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Make the textarea out of viewport
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      
      // Select and copy
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      
      // Clean up
      document.body.removeChild(textArea);
      
      if (success) {
        setIsCopied(true);
        
        if (showNotification) {
          showSuccessNotification({
            title: 'Success',
            message: successMessage
          });
        }
        
        // Reset the copied state after a timeout
        const timeoutId = setTimeout(() => {
          setIsCopied(false);
        }, successDuration);
        
        // Return true to indicate success
        return true;
      } else {
        throw new Error('execCommand returned false');
      }
    } catch (error) {
      console.error('Clipboard error:', error);
      
      if (showNotification) {
        showErrorNotification({
          title: 'Error',
          message: errorMessage
        });
      }
      
      // Return false to indicate failure
      return false;
    }
  }, []);
  
  return {
    isCopied,
    copyToClipboard,
    resetCopied
  };
}

export default useClipboard;
