// frontend/src/hooks/useClipboard.ts

import { useState, useCallback } from 'react';
import { showSuccessNotification, showErrorNotification } from '../utils/errorHandling';
import { UseClipboardOptions } from '../types/deadlock';

/**
 * Custom hook for clipboard operations with error handling
 * and success feedback
 * 
 * @returns Functions and state for clipboard operations
 */
export function useClipboard() {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  
  const copyToClipboard = useCallback(async (text: string, options: UseClipboardOptions = {}) => {
    const {
      successMessage = 'Copied to clipboard',
      errorMessage = 'Failed to copy to clipboard',
      successDuration = 2000,
      showNotification = true
    } = options;
    
    if (!text) {
      if (showNotification) {
        showErrorNotification({
          title: 'Copy Failed',
          message: 'Nothing to copy'
        });
      }
      return false;
    }
    
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      
      if (showNotification) {
        showSuccessNotification({
          title: 'Copied!',
          message: successMessage
        });
      }
      
      // Reset after success duration
      setTimeout(() => setIsCopied(false), successDuration);
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      
      if (showNotification) {
        showErrorNotification({
          title: 'Copy Failed',
          message: `${errorMessage}: ${(error as Error).message || 'Unknown error'}`
        });
      }
      
      // Fallback to legacy method
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';  // Avoid scrolling to bottom
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (successful) {
          setIsCopied(true);
          if (showNotification) {
            showSuccessNotification({
              title: 'Copied!',
              message: successMessage
            });
          }
          setTimeout(() => setIsCopied(false), successDuration);
          return true;
        }
      } catch (fallbackError) {
        console.error('Fallback copying failed:', fallbackError);
      }
      
      return false;
    }
  }, []);
  
  return {
    isCopied,
    copyToClipboard
  };
}
