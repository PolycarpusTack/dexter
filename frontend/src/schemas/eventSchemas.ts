import { EventsResponse } from '../types/eventTypes';

/**
 * Safely validate event response data
 * 
 * Attempts to validate the response with schema, falls back to original data if validation fails
 * Logs errors for debugging without crashing the application
 */
export function safeValidateEventResponse(data: any): EventsResponse {
  try {
    // In a real implementation, we would use Zod or another schema validation library
    // For now, we'll just do basic validation
    
    if (!data) throw new Error('Response data is null or undefined');
    
    if (!Array.isArray(data.items)) {
      throw new Error('Response items is not an array');
    }
    
    // Success - return validated data
    return data;
  } catch (error) {
    console.error('Event response validation error:', error);
    return data; // Fall back to original data
  }
}

/**
 * Safely validate event frequency response data
 */
export function safeValidateEventFrequencyResponse(data: any) {
  try {
    if (!data) throw new Error('Response data is null or undefined');
    
    if (!Array.isArray(data.points)) {
      throw new Error('Response points is not an array');
    }
    
    // Success - return validated data
    return data;
  } catch (error) {
    console.error('Event frequency response validation error:', error);
    return data; // Fall back to original data
  }
}

export default {
  safeValidateEventResponse,
  safeValidateEventFrequencyResponse,
};