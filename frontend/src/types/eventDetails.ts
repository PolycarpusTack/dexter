// File: frontend/src/types/eventDetails.ts

/**
 * Type definitions for event details 
 */

/**
 * Event details structure from Sentry events
 */
export interface EventDetails {
  message?: string;
  exception?: {
    values?: Array<{
      type?: string;
      value?: string;
      stacktrace?: {
        frames?: Array<{
          function?: string;
          filename?: string;
          lineno?: number;
          colno?: number;
        }>;
      };
    }>;
  };
  entries?: Array<{
    type: string;
    data?: {
      values?: Array<{
        type?: string;
        value?: string;
        stacktrace?: {
          frames?: Array<{
            function?: string;
            filename?: string;
            lineno?: number;
            colno?: number;
          }>;
        };
      }>;
    };
  }>;
  title?: string;
  level?: string;
  platform?: string;
  environment?: string;
  release?: string;
  tags?: Record<string, string>;
  user?: {
    id?: string;
    ip_address?: string;
    email?: string;
    username?: string;
  };
  breadcrumbs?: Array<{
    timestamp?: string;
    type?: string;
    category?: string;
    message?: string;
    data?: Record<string, any>;
  }>;
  _fallback?: boolean;
  [key: string]: any; // For any additional fields
}

// Export the interface directly