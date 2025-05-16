/**
 * Entry point for manually fixing the MIME type issue with the configApi module
 */
import { z } from 'zod';
import enhancedApiClient from './enhancedApiClient.js';
import { createErrorHandler } from './errorHandler.js';
import { validateParams } from './apiResolver.js';

// Re-export the entire module
export * from './configApi.js';

// Default export
import configApi from './configApi.js';
export default configApi;
