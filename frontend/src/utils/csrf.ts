/**
 * CSRF Token Management
 * Handles CSRF token fetching and storage for API requests
 */

import axios from 'axios';

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_HEADER = 'X-CSRF-Token';

let csrfToken: string | null = null;

/**
 * Get CSRF token from memory or cookie
 */
export function getCSRFToken(): string | null {
  // First check memory
  if (csrfToken) {
    return csrfToken;
  }
  
  // Then check cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf_token') {
      csrfToken = value;
      return value;
    }
  }
  
  return null;
}

/**
 * Fetch a new CSRF token from the server
 */
export async function fetchCSRFToken(): Promise<string> {
  try {
    const response = await axios.get('/api/v1/auth/csrf-token', {
      withCredentials: true, // Include cookies
    });
    
    // Token will be set in cookie automatically
    // Also store in memory for quick access
    const token = response.data.csrf_token;
    csrfToken = token;
    
    return token;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw new Error('Failed to fetch CSRF token');
  }
}

/**
 * Add CSRF token to request headers
 */
export function addCSRFHeader(headers: Record<string, string>): Record<string, string> {
  const token = getCSRFToken();
  
  if (token) {
    return {
      ...headers,
      [CSRF_HEADER]: token,
    };
  }
  
  return headers;
}

/**
 * Initialize CSRF protection
 * Should be called on app startup
 */
export async function initializeCSRF(): Promise<void> {
  try {
    await fetchCSRFToken();
  } catch (error) {
    console.warn('Failed to initialize CSRF token:', error);
    // Don't fail app startup if CSRF token fetch fails
    // It will be retried on first API request
  }
}

/**
 * Clear CSRF token (e.g., on logout)
 */
export function clearCSRFToken(): void {
  csrfToken = null;
  // Remove cookie by setting expiry in the past
  document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}