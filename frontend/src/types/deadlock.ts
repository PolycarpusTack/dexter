/**
 * Process involved in a deadlock
 */
export interface DeadlockProcess {
  pid: number;
  applicationName?: string;
  username?: string;
  databaseName?: string;
  query?: string;
  blockingPids?: number[];
  waitEventType?: string;
  waitEvent?: string;
  tableName?: string;
  relation?: number;
  lockType?: string;
  lockMode?: string;
  inCycle?: boolean;
  tables?: string[];
  locks_held?: string[];
  locks_waiting?: string[];
}

/**
 * Relation (table) involved in a deadlock
 */
export interface DeadlockRelation {
  relationId: number;
  schema?: string;
  name?: string;
  lockingProcesses?: number[];
}

/**
 * Metadata about the deadlock analysis
 */
export interface DeadlockMetadata {
  execution_time_ms: number;
  parser_version?: string;
  cycles_found: number;
  severity?: number;
}

/**
 * Detailed data about the deadlock visualization
 */
export interface DeadlockVisualizationData {
  processes: DeadlockProcess[];
  relations: DeadlockRelation[];
  deadlockChain?: number[];
  pattern?: string;
  cycles?: number[][];
  severity?: number;
}

/**
 * Result of a deadlock analysis
 */
export interface DeadlockAnalysis {
  timestamp?: string;
  metadata?: DeadlockMetadata;
  visualization_data?: DeadlockVisualizationData;
  recommended_fix?: string;
}

/**
 * Complete deadlock analysis response
 */
export interface DeadlockAnalysisResponse {
  success: boolean;
  analysis?: DeadlockAnalysis;
  error?: string;
}

/**
 * Options for deadlock analysis
 */
export interface DeadlockAnalysisOptions {
  useEnhancedAnalysis?: boolean;
  apiPath?: string;
  includeRawData?: boolean;
}

export default {
  DeadlockProcess,
  DeadlockRelation,
  DeadlockMetadata,
  DeadlockVisualizationData,
  DeadlockAnalysis,
  DeadlockAnalysisResponse,
  DeadlockAnalysisOptions
};
