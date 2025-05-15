/**
 * API Hooks Index
 * 
 * This file exports all React Query hooks for the unified API client.
 */

// Export API domain hooks
export { default as useIssues } from './useIssues';
export { default as useEvents } from './useEvents';
export { default as useDiscover } from './useDiscover';
export { default as useAlerts } from './useAlerts';
export { default as useAi } from './useAi';
export { default as useConfig } from './useConfig';

// Export individual hooks
export { 
  useExplainError,
  useEventErrorExplanation,
  useIssueErrorExplanation,
  useErrorTextExplanation,
  useManualErrorExplanation
} from './useErrorExplanation';

export {
  useAiModels
} from './useAi';

export {
  useConfig as useGetConfig,
  useCheckConfig,
  useUpdateConfig,
  useHealthStatus
} from './useConfig';

// Export types
export * from './types';