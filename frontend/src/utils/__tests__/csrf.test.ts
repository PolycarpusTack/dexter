/**
 * Tests for CSRF Protection
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import {
  getCSRFToken,
  fetchCSRFToken,
  addCSRFHeader,
  initializeCSRF,
  clearCSRFToken
} from '../csrf';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('CSRF Protection', () => {
  beforeEach(() => {
    // Clear any existing tokens
    clearCSRFToken();
    
    // Clear cookies
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Reset mocks
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    clearCSRFToken();
  });
  
  describe('getCSRFToken', () => {
    it('should return null when no token exists', () => {
      expect(getCSRFToken()).toBeNull();
    });
    
    it('should return token from memory if available', () => {
      // Set token by fetching
      mockedAxios.get.mockResolvedValueOnce({
        data: { csrf_token: 'test-token-123' }
      });
      
      return fetchCSRFToken().then(() => {
        expect(getCSRFToken()).toBe('test-token-123');
      });
    });
    
    it('should read token from cookie if not in memory', () => {
      // Set cookie
      document.cookie = 'csrf_token=cookie-token-456; path=/';
      
      expect(getCSRFToken()).toBe('cookie-token-456');
    });
  });
  
  describe('fetchCSRFToken', () => {
    it('should fetch token from server', async () => {
      const mockToken = 'server-token-789';
      mockedAxios.get.mockResolvedValueOnce({
        data: { csrf_token: mockToken }
      });
      
      const token = await fetchCSRFToken();
      
      expect(token).toBe(mockToken);
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/auth/csrf-token', {
        withCredentials: true
      });
    });
    
    it('should handle fetch errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(fetchCSRFToken()).rejects.toThrow('Failed to fetch CSRF token');
    });
  });
  
  describe('addCSRFHeader', () => {
    it('should add CSRF token to headers when token exists', async () => {
      // Set up token
      mockedAxios.get.mockResolvedValueOnce({
        data: { csrf_token: 'test-csrf-token' }
      });
      await fetchCSRFToken();
      
      const headers = { 'Content-Type': 'application/json' };
      const updatedHeaders = addCSRFHeader(headers);
      
      expect(updatedHeaders).toEqual({
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'test-csrf-token'
      });
    });
    
    it('should return original headers when no token exists', () => {
      const headers = { 'Content-Type': 'application/json' };
      const updatedHeaders = addCSRFHeader(headers);
      
      expect(updatedHeaders).toEqual(headers);
      expect(updatedHeaders['X-CSRF-Token']).toBeUndefined();
    });
  });
  
  describe('initializeCSRF', () => {
    it('should fetch token on initialization', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { csrf_token: 'init-token' }
      });
      
      await initializeCSRF();
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/auth/csrf-token', {
        withCredentials: true
      });
      expect(getCSRFToken()).toBe('init-token');
    });
    
    it('should not throw on initialization failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      
      // Should not throw
      await expect(initializeCSRF()).resolves.toBeUndefined();
    });
  });
  
  describe('clearCSRFToken', () => {
    it('should clear token from memory and cookie', async () => {
      // Set up token
      mockedAxios.get.mockResolvedValueOnce({
        data: { csrf_token: 'token-to-clear' }
      });
      await fetchCSRFToken();
      
      // Set cookie
      document.cookie = 'csrf_token=cookie-to-clear; path=/';
      
      // Verify token exists
      expect(getCSRFToken()).toBe('token-to-clear');
      
      // Clear token
      clearCSRFToken();
      
      // Verify token is cleared
      expect(getCSRFToken()).toBeNull();
      
      // Verify cookie is cleared (this is harder to test directly)
      // The cookie will have been set to expire in the past
    });
  });
  
  describe('Integration with API client', () => {
    it('should automatically include CSRF token in requests', async () => {
      // This would test the actual integration with the enhanced API client
      // For now, we just verify the header addition works correctly
      
      mockedAxios.get.mockResolvedValueOnce({
        data: { csrf_token: 'integration-test-token' }
      });
      
      await initializeCSRF();
      
      const headers = {};
      const updatedHeaders = addCSRFHeader(headers);
      
      expect(updatedHeaders['X-CSRF-Token']).toBe('integration-test-token');
    });
  });
});