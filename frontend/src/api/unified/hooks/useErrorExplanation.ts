/**
 * Error Explanation API Hooks
 * 
 * This file provides React Query hooks for the AI-powered error explanation functionality.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  explainError, 
  explainErrorByEventId, 
  explainErrorByIssueId, 
  explainErrorText,
  ErrorExplanationRequest,
  ErrorExplanationResponse
} from '../aiApi';

// Query keys
const QUERY_KEYS = {
  errorExplanation: 'errorExplanation',
};

/**
 * Hook for getting an AI explanation for errors
 * 
 * @returns Mutation for requesting error explanations
 */
export const useExplainError = () => {
  return useMutation({
    mutationFn: (params: ErrorExplanationRequest) => explainError(params)
  });
};

/**
 * Hook for getting an AI explanation for a specific event
 * 
 * @param eventId - Event ID
 * @param model - Model to use (optional)
 * @param options - Additional options for the explanation
 * @param queryOptions - React Query options
 * @returns Query result with error explanation
 */
export const useEventErrorExplanation = (
  eventId: string,
  model?: string,
  options?: Partial<ErrorExplanationRequest['options']>,
  queryOptions = {}
) => {
  return useQuery({
    queryKey: [QUERY_KEYS.errorExplanation, 'event', eventId, model],
    queryFn: () => explainErrorByEventId(eventId, model, options),
    enabled: !!eventId,
    ...queryOptions
  });
};

/**
 * Hook for getting an AI explanation for a specific issue
 * 
 * @param issueId - Issue ID
 * @param model - Model to use (optional)
 * @param options - Additional options for the explanation
 * @param queryOptions - React Query options
 * @returns Query result with error explanation
 */
export const useIssueErrorExplanation = (
  issueId: string,
  model?: string,
  options?: Partial<ErrorExplanationRequest['options']>,
  queryOptions = {}
) => {
  return useQuery({
    queryKey: [QUERY_KEYS.errorExplanation, 'issue', issueId, model],
    queryFn: () => explainErrorByIssueId(issueId, model, options),
    enabled: !!issueId,
    ...queryOptions
  });
};

/**
 * Hook for getting an AI explanation for raw error text
 * 
 * @param errorText - Error text to explain
 * @param stackTrace - Stack trace (optional)
 * @param model - Model to use (optional)
 * @param options - Additional options for the explanation
 * @param queryOptions - React Query options
 * @returns Query result with error explanation
 */
export const useErrorTextExplanation = (
  errorText: string,
  stackTrace?: string,
  model?: string,
  options?: Partial<ErrorExplanationRequest['options']>,
  queryOptions = {}
) => {
  return useQuery({
    queryKey: [QUERY_KEYS.errorExplanation, 'text', errorText, stackTrace, model],
    queryFn: () => explainErrorText(errorText, stackTrace, model, options),
    enabled: !!errorText,
    ...queryOptions
  });
};

/**
 * Hook for manually triggering an error explanation
 * 
 * This is useful when you want more control over when the explanation is requested
 * 
 * @returns Mutation for requesting error explanations
 */
export const useManualErrorExplanation = () => {
  return useMutation({
    mutationFn: (params: {
      eventId?: string;
      issueId?: string;
      errorText?: string;
      stackTrace?: string;
      model?: string;
      options?: Partial<ErrorExplanationRequest['options']>;
    }) => {
      const { eventId, issueId, errorText, stackTrace, model, options } = params;
      
      if (eventId) {
        return explainErrorByEventId(eventId, model, options);
      } else if (issueId) {
        return explainErrorByIssueId(issueId, model, options);
      } else if (errorText) {
        return explainErrorText(errorText, stackTrace, model, options);
      } else {
        throw new Error('At least one of eventId, issueId, or errorText must be provided');
      }
    }
  });
};

// Export hooks
export default {
  useExplainError,
  useEventErrorExplanation,
  useIssueErrorExplanation,
  useErrorTextExplanation,
  useManualErrorExplanation
};