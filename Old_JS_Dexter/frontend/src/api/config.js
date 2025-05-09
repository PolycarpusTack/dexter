// File: frontend/src/api/config.js

// Base URL for the backend API
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Axios default configuration
export const axiosConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
  // Add withCredentials for CORS with credentials
  withCredentials: false,
};

// Sentry Web URL for direct links
export const SENTRY_WEB_URL = import.meta.env.VITE_SENTRY_WEB_URL || 'https://sentry.io';