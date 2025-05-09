import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Custom hook for managing state in URL search parameters
 * 
 * This hook synchronizes state with URL search parameters, allowing for:
 * - Shareable URLs with current application state
 * - Back button support for navigation between states
 * - Persistence across page refreshes
 * 
 * @param paramName - The name of the search parameter
 * @param defaultValue - Default value to use if parameter is not present
 * @returns A tuple containing the current value and a setter function
 */
export function useSearchParamState<T extends string | number | boolean>(
  paramName: string,
  defaultValue: T
): [T, (newValue: T) => void] {
  // Get search params from React Router
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial value from URL or use default
  const getInitialValue = (): T => {
    const paramValue = searchParams.get(paramName);
    
    if (paramValue === null) {
      return defaultValue;
    }
    
    // Convert param string to appropriate type
    if (typeof defaultValue === 'number') {
      return Number(paramValue) as T;
    } else if (typeof defaultValue === 'boolean') {
      return (paramValue === 'true') as T;
    } else {
      return paramValue as T;
    }
  };
  
  // State to track current value
  const [value, setValue] = useState<T>(getInitialValue());
  
  // Update state when URL changes
  useEffect(() => {
    const newValue = getInitialValue();
    if (newValue !== value) {
      setValue(newValue);
    }
  }, [searchParams, paramName]);
  
  // Update URL when state changes
  const updateValue = useCallback((newValue: T) => {
    setValue(newValue);
    
    // Create a new URLSearchParams to avoid modifying the original
    const newSearchParams = new URLSearchParams(searchParams);
    
    if (newValue === defaultValue) {
      // Remove parameter if it's set to default value to keep URL clean
      newSearchParams.delete(paramName);
    } else {
      // Otherwise set the parameter value
      newSearchParams.set(paramName, String(newValue));
    }
    
    // Update URL without navigating
    setSearchParams(newSearchParams, { replace: true });
  }, [searchParams, setSearchParams, paramName, defaultValue]);
  
  return [value, updateValue];
}

export default useSearchParamState;