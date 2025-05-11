// Configuration for the frontend application
export const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  SENTRY_WEB_URL: import.meta.env.VITE_SENTRY_WEB_URL || 'https://sentry.io',
  APP_TITLE: import.meta.env.VITE_APP_TITLE || 'Dexter',
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10),
};

// Type declaration for the config
export type Config = typeof config;
