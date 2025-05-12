import { useState, useCallback } from 'react';

interface DataMaskingOptions {
  defaultMasked?: boolean;
  patterns?: Record<string, RegExp>;
  replacements?: Record<string, string | ((match: string, ...groups: string[]) => string)>;
}

interface UseDataMaskingResult {
  isMasked: boolean;
  toggleMasking: () => void;
  maskText: (text: string | undefined) => string;
  setMasking: (masked: boolean) => void;
}

/**
 * Hook for masking sensitive data in text
 * @param options - Configuration options for data masking
 * @returns Object with masking state and functions
 */
export function useDataMasking(options: DataMaskingOptions = {}): UseDataMaskingResult {
  const { 
    defaultMasked = false,
    patterns = {
      // Default patterns for common PII
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
      creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
      ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
      phoneNumber: /\b(?:\+\d{1,2}\s?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      url: /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
    },
    replacements = {
      // Default replacements
      email: '[EMAIL]',
      ipAddress: '[IP ADDRESS]',
      creditCard: '[CREDIT CARD]',
      ssn: '[SSN]',
      phoneNumber: '[PHONE NUMBER]',
      url: '[URL]',
    },
  } = options;
  
  const [isMasked, setIsMasked] = useState<boolean>(defaultMasked);
  
  /**
   * Toggle the masking state
   */
  const toggleMasking = useCallback(() => {
    setIsMasked(prev => !prev);
  }, []);
  
  /**
   * Explicitly set masking state
   */
  const setMasking = useCallback((masked: boolean) => {
    setIsMasked(masked);
  }, []);
  
  /**
   * Apply masking to text based on patterns and replacements
   * @param text - The text to mask
   * @returns Masked text
   */
  const maskText = useCallback((text: string | undefined): string => {
    if (!text || !isMasked) {
      return text || '';
    }
    
    let maskedText = text;
    
    // Apply each pattern and replacement
    Object.entries(patterns).forEach(([key, pattern]) => {
      const replacement = replacements[key];
      
      if (replacement) {
        if (typeof replacement === 'function') {
          maskedText = maskedText.replace(pattern, replacement);
        } else {
          maskedText = maskedText.replace(pattern, replacement);
        }
      }
    });
    
    return maskedText;
  }, [isMasked, patterns, replacements]);
  
  return {
    isMasked,
    toggleMasking,
    maskText,
    setMasking
  };
}

export default useDataMasking;
