// File: src/hooks/useDataMasking.ts

import { useState, useCallback } from 'react';

export interface UseDataMaskingOptions {
  /** Whether data is masked by default */
  defaultMasked?: boolean;
  /** Custom patterns to mask */
  patterns?: Record<string, RegExp>;
  /** Custom replacement strings */
  replacements?: Record<string, string>;
}

/**
 * Hook for masking sensitive data in strings
 * 
 * @param options - Configuration options
 * @returns Object with masking functions and state
 */
export function useDataMasking(options: UseDataMaskingOptions = {}) {
  const { 
    defaultMasked = false,
    patterns: customPatterns = {},
    replacements: customReplacements = {}
  } = options;
  
  const [isMasked, setIsMasked] = useState<boolean>(defaultMasked);
  
  // Default patterns for sensitive data
  const defaultPatterns: Record<string, RegExp> = {
    // Email addresses
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    // IP addresses
    ip: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    // URLs
    url: /(https?:\/\/[^\s]+)/g,
    // UUIDs
    uuid: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    // SQL queries
    sql: /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE)\b[\s\S]*?(?:;|$)/gi,
    // API keys and tokens
    apiKey: /['"](sk|pk|api|token|key|secret|password|access_token)_[a-zA-Z0-9]{10,}['"]?/g,
    // Credit card numbers
    creditCard: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    // Phone numbers
    phone: /\b\+?[0-9()[\].\- ]{10,}\b/g,
    // Passwords in URL
    passwordInUrl: /https?:\/\/[^:]+:[^@]+@/g
  };
  
  // Default replacements
  const defaultReplacements: Record<string, string> = {
    email: '[EMAIL REDACTED]',
    ip: '[IP REDACTED]',
    url: '[URL REDACTED]',
    uuid: '[UUID REDACTED]',
    sql: '[SQL QUERY REDACTED]',
    apiKey: '[API KEY REDACTED]',
    creditCard: '[CREDIT CARD REDACTED]',
    phone: '[PHONE REDACTED]',
    passwordInUrl: '[URL WITH PASSWORD REDACTED]',
    default: '[REDACTED]'
  };
  
  // Merge default and custom patterns/replacements
  const patterns = { ...defaultPatterns, ...customPatterns };
  const replacements = { ...defaultReplacements, ...customReplacements };
  
  /**
   * Mask sensitive data in a string
   * 
   * @param text - Text to mask
   * @returns Masked text if masking is enabled, original otherwise
   */
  const maskText = useCallback((text: string | undefined): string => {
    if (!text || !isMasked) return text || '';
    
    let maskedText = text;
    
    // Apply each pattern
    Object.entries(patterns).forEach(([type, pattern]) => {
      const replacement = replacements[type] || replacements.default;
      maskedText = maskedText.replace(pattern, replacement as string);
    });
    
    return maskedText;
  }, [isMasked, patterns, replacements]);
  
  /**
   * Toggle masking on/off
   */
  const toggleMasking = useCallback(() => {
    setIsMasked(prev => !prev);
  }, []);
  
  return {
    isMasked,
    toggleMasking,
    maskText,
    setIsMasked
  };
}

export default useDataMasking;
