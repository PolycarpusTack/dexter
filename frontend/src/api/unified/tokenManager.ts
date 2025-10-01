/**
 * Token manager with automatic refresh capability
 */

import { enhancedApiClient } from './enhancedApiClient';

export interface TokenInfo {
  token: string;
  expiresAt: number;
  refreshToken?: string;
}

export interface TokenRefreshResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

export class TokenManager {
  private tokenInfo: TokenInfo | null = null;
  private refreshPromise: Promise<TokenInfo> | null = null;
  private readonly storageKey = 'dexter_auth_token';
  private readonly refreshThreshold = 5 * 60 * 1000; // 5 minutes before expiry

  constructor() {
    this.loadFromStorage();
    // Set demo token if no token is available (for development)
    if (!this.tokenInfo && process.env.NODE_ENV === 'development') {
      this.setDemoToken();
    }
  }

  /**
   * Get a valid token, refreshing if necessary
   */
  async getValidToken(): Promise<string> {
    // If we're already refreshing, wait for that to complete
    if (this.refreshPromise) {
      const tokenInfo = await this.refreshPromise;
      return tokenInfo.token;
    }

    // If no token info, throw error
    if (!this.tokenInfo) {
      throw new Error('No authentication token available');
    }

    // Check if token needs refresh
    const now = Date.now();
    const timeUntilExpiry = this.tokenInfo.expiresAt - now;

    if (timeUntilExpiry < this.refreshThreshold) {
      return this.refreshToken();
    }

    return this.tokenInfo.token;
  }

  /**
   * Set token information
   */
  setToken(token: string, expiresIn?: number, refreshToken?: string): void {
    const expiresAt = expiresIn 
      ? Date.now() + (expiresIn * 1000)
      : Date.now() + (24 * 60 * 60 * 1000); // Default 24 hours

    this.tokenInfo = {
      token,
      expiresAt,
      refreshToken
    };

    this.saveToStorage();
  }

  /**
   * Clear token information
   */
  clearToken(): void {
    this.tokenInfo = null;
    this.refreshPromise = null;
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Check if token is expired
   */
  isExpired(): boolean {
    if (!this.tokenInfo) {
      return true;
    }

    return Date.now() >= this.tokenInfo.expiresAt;
  }

  /**
   * Check if token needs refresh soon
   */
  needsRefresh(): boolean {
    if (!this.tokenInfo) {
      return true;
    }

    const timeUntilExpiry = this.tokenInfo.expiresAt - Date.now();
    return timeUntilExpiry < this.refreshThreshold;
  }

  /**
   * Refresh the token
   */
  private async refreshToken(): Promise<string> {
    if (!this.tokenInfo?.refreshToken) {
      throw new Error('No refresh token available');
    }

    // Prevent concurrent refresh attempts
    if (!this.refreshPromise) {
      this.refreshPromise = this.performRefresh()
        .finally(() => {
          this.refreshPromise = null;
        });
    }

    const tokenInfo = await this.refreshPromise;
    return tokenInfo.token;
  }

  /**
   * Perform the actual token refresh
   */
  private async performRefresh(): Promise<TokenInfo> {
    if (!this.tokenInfo?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await enhancedApiClient.callEndpoint<TokenRefreshResponse>(
        'auth',
        'refresh',
        {},
        {},
        { refresh_token: this.tokenInfo.refreshToken },
        { 
          skipAuth: true, // Don't use auth interceptor for refresh
          retry: false // Don't retry refresh requests
        }
      );

      const { access_token, expires_in, refresh_token } = response.data;

      this.setToken(
        access_token,
        expires_in,
        refresh_token || this.tokenInfo.refreshToken
      );

      return this.tokenInfo!;
    } catch (error) {
      // Clear token on refresh failure
      this.clearToken();
      throw new Error('Token refresh failed');
    }
  }

  /**
   * Load token from storage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.token && parsed.expiresAt) {
          this.tokenInfo = parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load token from storage:', error);
    }
  }

  /**
   * Save token to storage
   */
  private saveToStorage(): void {
    if (this.tokenInfo) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.tokenInfo));
      } catch (error) {
        console.error('Failed to save token to storage:', error);
      }
    }
  }

  /**
   * Get token expiry time
   */
  getExpiryTime(): Date | null {
    if (!this.tokenInfo) {
      return null;
    }

    return new Date(this.tokenInfo.expiresAt);
  }

  /**
   * Get time until token expires
   */
  getTimeUntilExpiry(): number {
    if (!this.tokenInfo) {
      return 0;
    }

    const remaining = this.tokenInfo.expiresAt - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Set demo token for development
   */
  private setDemoToken(): void {
    const demoToken = 'demo-token';
    const expiresIn = 24 * 60 * 60; // 24 hours in seconds
    this.setToken(demoToken, expiresIn);
    console.log('Demo token set for development');
  }
}

// Export singleton instance
export const tokenManager = new TokenManager();