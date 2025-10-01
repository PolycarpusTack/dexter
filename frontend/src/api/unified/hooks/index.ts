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
export { default as useTemplates } from './useTemplates';
export { default as useAnalyzers } from './useAnalyzers';

// Export individual hooks from useAi
export { 
  useOllamaModels,
  useModelsEnhanced,
  useAiModels,
  usePullModel,
  useSelectModel,
  useSetActiveModel
} from './useAi';

// Export individual hooks for error explanation
export { 
  useExplainError,
  useEventErrorExplanation,
  useIssueErrorExplanation,
  useExplainErrorText
} from './useAi';

// Export configuration hooks
export {
  useConfig as useGetConfig,
  useCheckConfig,
  useUpdateConfig,
  useHealthStatus
} from './useConfig';

// Export template hooks
export {
  useTemplates as useGetTemplates,
  useTemplate,
  useTemplateVersions,
  useDefaultTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useRenderTemplate,
  useSetTemplateAsDefault
} from './useTemplates';

// Export analyzer hooks
export {
  useListAnalyzers,
  useAnalyzerCapabilities,
  useAnalyzeEvent,
  useAnalyzeWithSpecificAnalyzer,
  useAnalyzerHealth,
  useAnalyzerMetrics,
  useClearAnalyzerCache,
  useAnalyzeDeadlock,
  useDeadlockPatterns,
  useLockCompatibilityMatrix
} from './useAnalyzers';

// Export memory leak analyzer hooks
export {
  useAnalyzeMemoryLeak,
  useMemoryLeakAnalysis,
  useMemoryLeakDataAnalysis,
  useUploadHeapSnapshot,
  useMemoryLeakCapabilities,
  useReanalyzeMemoryLeak,
  useExportMemoryLeakSVG,
  useMemoryLeakWorkflow
} from './useMemoryLeak';

// Export N+1 Query analyzer hooks
export {
  useAnalyzeN1Query,
  useN1QueryAnalysis,
  useN1QueryDataAnalysis,
  useExportN1QuerySVG,
  useN1QueryWorkflow,
  useBatchN1QueryAnalysis
} from './useN1Query';

// Export types
export * from './types';