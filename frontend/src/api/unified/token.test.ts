/**
 * Tests for the Token Manager
 */

// Mock enhancedApiClient
const mockCallEndpoint = jest.fn();
mockCallEndpoint.mockResolvedValue({
  data: {
    access_token: 'new-access-token',
    expires_in: 3600,
    refresh_token: 'new-refresh-token',
  }
});

jest.mock('./enhancedApiClient', () => ({
  callEndpoint: mockCallEndpoint,
}));

import { TokenManager } from './tokenManager';

// Create test instance
const tokenManager = new TokenManager();

// Test token setting
console.log('--- Testing token setting ---');
tokenManager.setToken('test-token', 3600, 'test-refresh-token');
console.log('Token expiry time:', tokenManager.getExpiryTime());
console.log('Time until expiry (seconds):', Math.floor(tokenManager.getTimeUntilExpiry() / 1000));

// Test token refresh
console.log('--- Testing token refresh flow ---');
console.log('Is expired:', tokenManager.isExpired());
console.log('Needs refresh:', tokenManager.needsRefresh());

// Test token retrieval
async function testGetToken() {
  try {
    const token = await tokenManager.getValidToken();
    console.log('Got valid token:', token.substring(0, 10) + '...');
  } catch (error) {
    console.error('Error getting token:', error);
  }
}

// Run tests
testGetToken().then(() => {
  console.log('Tests completed');
});