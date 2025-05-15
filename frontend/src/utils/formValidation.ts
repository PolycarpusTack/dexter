// File: frontend/src/utils/formValidation.ts

/**
 * Form validation utilities for consistent validation across the application
 */

/**
 * Validation rule interface
 */
export interface ValidationRule {
  test: (value: any) => boolean;
  message: string;
}

/**
 * Field validation result
 */
export interface ValidationResult {
  isValid: boolean;
  message: string | null;
}

/**
 * Form field validator
 * @param value - The value to validate
 * @param rules - Array of validation rules to apply
 * @returns Validation result with validity and error message
 */
export const validateField = (value: any, rules: ValidationRule[]): ValidationResult => {
  // Run through all rules until one fails
  for (const rule of rules) {
    if (!rule.test(value)) {
      return {
        isValid: false,
        message: rule.message
      };
    }
  }
  
  // All rules passed
  return {
    isValid: true,
    message: null
  };
};

/**
 * Form validation result
 */
export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string | null>;
}

/**
 * Form validator
 * @param values - Record of form values
 * @param validationRules - Record of validation rules for each field
 * @returns Form validation result with overall validity and field errors
 */
export const validateForm = (
  values: Record<string, any>,
  validationRules: Record<string, ValidationRule[]>
): FormValidationResult => {
  const errors: Record<string, string | null> = {};
  let isValid = true;
  
  // Validate each field with its rules
  for (const [field, rules] of Object.entries(validationRules)) {
    const result = validateField(values[field], rules);
    errors[field] = result.message;
    
    // If any field is invalid, the form is invalid
    if (!result.isValid) {
      isValid = false;
    }
  }
  
  return {
    isValid,
    errors
  };
};

/**
 * Predefined validation rules
 */

/**
 * Required field validation
 * @param message - Custom error message
 * @returns Validation rule
 */
export const required = (message = 'This field is required'): ValidationRule => ({
  test: (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    return true;
  },
  message
});

/**
 * Minimum length validation
 * @param min - Minimum length
 * @param message - Custom error message
 * @returns Validation rule
 */
export const minLength = (min: number, message?: string): ValidationRule => ({
  test: (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length >= min;
    return false;
  },
  message: message || `Must be at least ${min} characters`
});

/**
 * Maximum length validation
 * @param max - Maximum length
 * @param message - Custom error message
 * @returns Validation rule
 */
export const maxLength = (max: number, message?: string): ValidationRule => ({
  test: (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length <= max;
    return false;
  },
  message: message || `Cannot exceed ${max} characters`
});

/**
 * Pattern validation
 * @param pattern - Regular expression pattern
 * @param message - Custom error message
 * @returns Validation rule
 */
export const pattern = (pattern: RegExp, message: string): ValidationRule => ({
  test: (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return pattern.test(value);
    return false;
  },
  message
});

/**
 * Email validation
 * @param message - Custom error message
 * @returns Validation rule
 */
export const email = (message = 'Must be a valid email address'): ValidationRule => ({
  test: (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') {
      // RFC5322 compliant email regex
      const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      return emailPattern.test(value);
    }
    return false;
  },
  message
});

/**
 * URL validation
 * @param message - Custom error message
 * @returns Validation rule
 */
export const url = (message = 'Must be a valid URL'): ValidationRule => ({
  test: (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  },
  message
});

/**
 * Number validation
 * @param message - Custom error message
 * @returns Validation rule
 */
export const number = (message = 'Must be a valid number'): ValidationRule => ({
  test: (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number') return !isNaN(value);
    if (typeof value === 'string') return !isNaN(Number(value));
    return false;
  },
  message
});

/**
 * Integer validation
 * @param message - Custom error message
 * @returns Validation rule
 */
export const integer = (message = 'Must be a valid integer'): ValidationRule => ({
  test: (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number') return Number.isInteger(value);
    if (typeof value === 'string') return /^-?\d+$/.test(value);
    return false;
  },
  message
});

/**
 * Minimum value validation
 * @param min - Minimum value
 * @param message - Custom error message
 * @returns Validation rule
 */
export const min = (min: number, message?: string): ValidationRule => ({
  test: (value) => {
    if (value === null || value === undefined) return false;
    const num = typeof value === 'number' ? value : Number(value);
    return !isNaN(num) && num >= min;
  },
  message: message || `Must be at least ${min}`
});

/**
 * Maximum value validation
 * @param max - Maximum value
 * @param message - Custom error message
 * @returns Validation rule
 */
export const max = (max: number, message?: string): ValidationRule => ({
  test: (value) => {
    if (value === null || value === undefined) return false;
    const num = typeof value === 'number' ? value : Number(value);
    return !isNaN(num) && num <= max;
  },
  message: message || `Cannot exceed ${max}`
});

/**
 * Custom validation
 * @param testFn - Custom test function
 * @param message - Custom error message
 * @returns Validation rule
 */
export const custom = (testFn: (value: any) => boolean, message: string): ValidationRule => ({
  test: testFn,
  message
});

/**
 * One of validation (value must be one of the provided options)
 * @param options - Array of valid options
 * @param message - Custom error message
 * @returns Validation rule
 */
export const oneOf = (options: any[], message?: string): ValidationRule => ({
  test: (value) => options.includes(value),
  message: message || `Must be one of: ${options.join(', ')}`
});

/**
 * Match validation (value must match another value)
 * @param getCompareValue - Function to get the value to compare against
 * @param message - Custom error message
 * @returns Validation rule
 */
export const matches = (getCompareValue: () => any, message = 'Values must match'): ValidationRule => ({
  test: (value) => value === getCompareValue(),
  message
});

/**
 * Alphanumeric validation
 * @param message - Custom error message
 * @returns Validation rule
 */
export const alphanumeric = (message = 'Must contain only letters and numbers'): ValidationRule => ({
  test: (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return /^[a-zA-Z0-9]+$/.test(value);
    return false;
  },
  message
});

/**
 * Slug validation (lowercase letters, numbers, and hyphens)
 * @param message - Custom error message
 * @returns Validation rule
 */
export const slug = (message = 'Must be a valid slug (lowercase letters, numbers, and hyphens)'): ValidationRule => ({
  test: (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return /^[a-z0-9-]+$/.test(value);
    return false;
  },
  message
});

export default {
  validateField,
  validateForm,
  required,
  minLength,
  maxLength,
  pattern,
  email,
  url,
  number,
  integer,
  min,
  max,
  custom,
  oneOf,
  matches,
  alphanumeric,
  slug
};