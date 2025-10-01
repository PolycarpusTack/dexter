import { useState, useCallback, useMemo } from 'react';

// Common sensitive data patterns
const DEFAULT_PATTERNS = {
  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // UUIDs
  uuid: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
  // IP addresses
  ip: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  // Phone numbers (simple pattern)
  phone: /\b\+?[\d()-\s]{10,15}\b/g,
  // API keys and tokens (common patterns)
  apiKey: /\b(api[_-]?key|access[_-]?token|secret)[_-]?[=:]["']?[a-zA-Z0-9]{16,}["']?/gi,
  // Credit card numbers
  creditCard: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
};

// Default replacements
const DEFAULT_REPLACEMENTS = {
  email: '[EMAIL REDACTED]',
  uuid: '[UUID REDACTED]',
  ip: '[IP REDACTED]',
  phone: '[PHONE REDACTED]',
  apiKey: '[API KEY REDACTED]',
  creditCard: '[CREDIT CARD REDACTED]',
};

type PatternKey = keyof typeof DEFAULT_PATTERNS;
type Patterns = Record<string, RegExp>;
type Replacements = Record<string, string>;

interface DataMaskingOptions {
  defaultMasked?: boolean;
  patterns?: Partial<Patterns>;
  replacements?: Partial<Replacements>;
}

interface UseDataMaskingReturn {
  isMasked: boolean;
  setIsMasked: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMasking: () => void;
  maskText: (text: string) => string;
  patterns: Patterns;
}

/**
 * Hook for masking sensitive data in text content
 */
export function useDataMasking(options: DataMaskingOptions = {}): UseDataMaskingReturn {
  const {
    defaultMasked = true,
    patterns = {},
    replacements = {},
  } = options;
  
  const [isMasked, setIsMasked] = useState(defaultMasked);
  
  // Combine default patterns with custom patterns
  const allPatterns = useMemo(() => ({
    ...DEFAULT_PATTERNS,
    ...patterns,
  }), [patterns]);
  
  // Combine default replacements with custom replacements
  const allReplacements = useMemo(() => ({
    ...DEFAULT_REPLACEMENTS,
    ...replacements,
  }), [replacements]);
  
  /**
   * Mask sensitive data in text
   */
  const maskText = useCallback((text: string): string => {
    if (!text || typeof text !== 'string' || !isMasked) {
      return text;
    }
    
    let maskedText = text;
    
    // Apply each pattern and replacement
    Object.keys(allPatterns).forEach(patternKey => {
      const pattern = allPatterns[patternKey];
      const replacement = allReplacements[patternKey] || `[${patternKey.toUpperCase()} REDACTED]`;
      
      maskedText = maskedText.replace(pattern, replacement);
    });
    
    return maskedText;
  }, [isMasked, allPatterns, allReplacements]);
  
  /**
   * Toggle masking on/off
   */
  const toggleMasking = useCallback(() => {
    setIsMasked(prev => !prev);
  }, []);
  
  return {
    isMasked,
    setIsMasked,
    toggleMasking,
    maskText,
    patterns: allPatterns,
  };
}