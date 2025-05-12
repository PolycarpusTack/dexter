// Unified Analyzers API client

import { callEndpoint } from './apiClient';

/**
 * Analyze a PostgreSQL deadlock error
 * 
 * @param {string} eventId - Event ID to analyze
 * @returns {Promise} - Promise resolving to the analysis result
 */
export const analyzeDeadlock = async (eventId) => {
  return callEndpoint(
    'analyzers',
    'analyze_deadlock',
    { event_id: eventId }
  );
};

/**
 * Analyze a PostgreSQL deadlock error with the enhanced parser
 * 
 * @param {string} eventId - Event ID to analyze
 * @returns {Promise} - Promise resolving to the enhanced analysis result
 */
export const analyzeDeadlockEnhanced = async (eventId) => {
  return callEndpoint(
    'enhanced_analyzers',
    'analyze_deadlock',
    { event_id: eventId }
  );
};

/**
 * Get the PostgreSQL lock compatibility matrix
 * 
 * @returns {Promise} - Promise resolving to the lock compatibility matrix
 */
export const getLockCompatibilityMatrix = async () => {
  return callEndpoint(
    'enhanced_analyzers',
    'lock_compatibility_matrix',
    {}
  );
};

export default {
  analyzeDeadlock,
  analyzeDeadlockEnhanced,
  getLockCompatibilityMatrix
};
