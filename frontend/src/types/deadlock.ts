// frontend/src/types/deadlock.ts

/**
 * Type definitions for the Deadlock Analyzer
 */

export interface DeadlockProcess {
  pid: number;
  applicationName: string;
  databaseName: string;
  query: string;
  blockingPids: number[];
  waitEventType?: string;
  waitEvent?: string;
  tableName?: string;
  relation?: number;
  lockType?: string;
  lockMode?: string;
  startTime?: string;
  executionTimeMs?: number;
  sessionUser?: string;
  clientAddr?: string;
  transactionStartTime?: string;
  critical?: boolean;
}

export interface DeadlockRelation {
  relationId: number;
  schema: string;
  name: string;
  lockingProcesses: number[];
  accessPattern?: string;
  totalRows?: number;
  estimatedImpact?: string;
  hasIndex?: boolean;
  indexTypes?: string[];
}

export interface DeadlockEdge {
  source: number;
  target: number;
  lockType?: string;
  lockMode?: string;
  tableName?: string;
}

export interface DeadlockPattern {
  type: string;
  commonality?: string;
  risk?: string;
}

export interface DeadlockVisualizationData {
  processes: DeadlockProcess[];
  relations: DeadlockRelation[];
  deadlockChain?: DeadlockEdge[];
  pattern?: DeadlockPattern;
}

export interface DeadlockMetadata {
  execution_time_ms: number;
  parser_version?: string;
  cycles_found?: number;
  confidence_score?: number;
}

export interface DeadlockAnalysis {
  timestamp: string;
  metadata?: DeadlockMetadata;
  visualization_data: DeadlockVisualizationData;
  recommended_fix?: string;
}

export interface DeadlockAnalysisResponse {
  success: boolean;
  analysis: DeadlockAnalysis;
}

export interface EventTag {
  key: string;
  value: string;
}

export interface EventException {
  type: string;
  value: string;
  stacktrace?: any[];
}

export interface EventExceptionData {
  values: EventException[];
}

export interface EventEntry {
  type: string;
  data: any;
}

export interface EventContext {
  [key: string]: any;
}

export interface SentryEvent {
  id: string;
  projectId?: string;
  project?: {
    id: string;
    name: string;
    slug?: string;
  };
  title?: string;
  message?: string;
  level?: string;
  timestamp: string;
  tags?: EventTag[];
  entries?: EventEntry[];
  exception?: {
    values: EventException[];
  };
  contexts?: {
    [key: string]: EventContext;
  };
  [key: string]: any;
}

export interface AnalyzeDeadlockOptions {
  useEnhancedAnalysis?: boolean;
  apiPath?: string;
}

export interface UseClipboardOptions {
  successMessage?: string;
  errorMessage?: string;
  successDuration?: number;
  showNotification?: boolean;
}

export interface UseDataMaskingOptions {
  defaultMasked?: boolean;
  patterns?: Record<string, RegExp>;
  replacements?: Record<string, string>;
}

export interface AuditLogEvent {
  timestamp: string;
  userId: string;
  organizationId: string;
  component: string;
  action: string;
  details: Record<string, any>;
}
