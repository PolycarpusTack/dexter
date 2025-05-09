// File: frontend/src/api/config.ts

import { AxiosRequestConfig } from 'axios';

// Base URL for the backend API
export const API_BASE_URL: string = 
  (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Axios default configuration
export const axiosConfig: AxiosRequestConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
  // Add withCredentials for CORS with credentials
  withCredentials: false,
};

// Sentry Web URL for direct links
export const SENTRY_WEB_URL: string = 
  (import.meta as any).env.VITE_SENTRY_WEB_URL || 'https://sentry.io';

// API timeout constants
export const DEFAULT_TIMEOUT: number = 30000; // 30 seconds
export const EXTENDED_TIMEOUT: number = 60000; // 60 seconds for long-running operations
export const LLM_TIMEOUT: number = 120000; // 120 seconds for LLM operations