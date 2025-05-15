// File: src/schemas/deadlockSchemas.ts

import { z } from 'zod';
import { DeadlockAnalysisResponse } from '../types/deadlock';

/**
 * Schema for process data in deadlock
 */
export const deadlockProcessSchema = z.object({
  pid: z.number(),
  applicationName: z.string().optional(),
  username: z.string().optional(),
  databaseName: z.string().optional(),
  query: z.string().optional(),
  blockingPids: z.array(z.number()).optional(),
  waitEventType: z.string().optional(),
  waitEvent: z.string().optional(),
  tableName: z.string().optional(),
  relation: z.number().optional(),
  lockType: z.string().optional(),
  lockMode: z.string().optional(),
  startTime: z.string().optional(),
  executionTimeMs: z.number().optional(),
  sessionUser: z.string().optional(),
  clientAddr: z.string().optional(),
  transactionStartTime: z.string().optional(),
  critical: z.boolean().optional(),
  inCycle: z.boolean().optional(),
  tables: z.array(z.string()).optional(),
  locks_held: z.array(z.string()).optional(),
  locks_waiting: z.array(z.string()).optional()
});

/**
 * Schema for relation data in deadlock
 */
export const deadlockRelationSchema = z.object({
  relationId: z.number(),
  schema: z.string().optional(),
  name: z.string().optional().or(z.string()),
  lockingProcesses: z.array(z.number()).optional(),
  accessPattern: z.string().optional(),
  totalRows: z.number().optional(),
  estimatedImpact: z.string().optional(),
  hasIndex: z.boolean().optional(),
  indexTypes: z.array(z.string()).optional()
});

/**
 * Schema for edge in deadlock graph
 */
export const deadlockEdgeSchema = z.object({
  source: z.number(),
  target: z.number(),
  lockType: z.string().optional(),
  lockMode: z.string().optional(),
  tableName: z.string().optional()
});

/**
 * Schema for cycle in deadlock graph
 */
export const deadlockCycleSchema = z.array(z.number());

/**
 * Schema for deadlock pattern
 */
export const deadlockPatternSchema = z.object({
  type: z.string(),
  commonality: z.string().optional(),
  risk: z.string().optional()
});

/**
 * Schema for visualization data
 */
export const deadlockVisualizationDataSchema = z.object({
  processes: z.array(deadlockProcessSchema),
  relations: z.array(deadlockRelationSchema).optional(),
  deadlockChain: z.array(z.number()).or(z.array(deadlockEdgeSchema)).optional(),
  pattern: deadlockPatternSchema.or(z.string()).optional(),
  cycles: z.array(deadlockCycleSchema).optional(),
  severity: z.number().optional()
});

/**
 * Schema for deadlock metadata
 */
export const deadlockMetadataSchema = z.object({
  execution_time_ms: z.number(),
  parser_version: z.string().optional(),
  cycles_found: z.number().optional(),
  confidence_score: z.number().optional(),
  severity: z.number().optional()
});

/**
 * Schema for deadlock analysis
 */
export const deadlockAnalysisSchema = z.object({
  timestamp: z.string().optional(),
  metadata: deadlockMetadataSchema.optional(),
  visualization_data: deadlockVisualizationDataSchema.or(z.literal("visualization_data")).optional(),
  recommended_fix: z.string().optional()
});

/**
 * Schema for deadlock analysis response
 */
export const deadlockAnalysisResponseSchema = z.object({
  success: z.boolean(),
  analysis: deadlockAnalysisSchema.optional(),
  error: z.string().optional()
});

/**
 * Schema for lock compatibility matrix
 */
export const lockCompatibilitySchema = z.record(
  z.string(),
  z.record(z.string(), z.boolean())
);

/**
 * Schema for deadlock pattern recommendation
 */
export const deadlockPatternRecommendationSchema = z.object({
  pattern: z.string(),
  description: z.string(),
  commonality: z.string().optional(),
  risk: z.string().optional(),
  recommendation: z.string(),
  prevention: z.array(z.string()).optional()
});

/**
 * Schema for deadlock history entry
 */
export const deadlockHistoryEntrySchema = z.object({
  timestamp: z.string(),
  eventId: z.string(),
  analyzedBy: z.string().optional(),
  severity: z.number().optional(),
  affectedTables: z.array(z.string()).optional(),
  resolution: z.string().optional()
});

/**
 * Strict validator that throws on validation failure
 * 
 * @param data - Data to validate
 * @returns Validated data
 * @throws Zod validation error
 */
export function validateDeadlockAnalysisResponse(
  data: unknown
): DeadlockAnalysisResponse {
  try {
    return deadlockAnalysisResponseSchema.parse(data) as DeadlockAnalysisResponse;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Deadlock analysis validation failed:', 
        error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
    } else {
      console.error('Deadlock analysis validation failed with unknown error:', error);
    }
    throw error;
  }
}

/**
 * Safe validator that returns data even if validation fails
 * 
 * @param data - Data to validate
 * @returns Validated data or null if validation fails
 */
export function safeValidateDeadlockAnalysisResponse(
  data: unknown
): DeadlockAnalysisResponse | null {
  try {
    return deadlockAnalysisResponseSchema.parse(data) as DeadlockAnalysisResponse;
  } catch (error) {
    // Log validation errors with detailed information
    if (error instanceof z.ZodError) {
      console.warn('Deadlock analysis data validation failed:', 
        error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
    } else {
      console.warn('Deadlock analysis validation failed with unknown error:', error);
    }
    
    // Return null to indicate validation failure
    return null;
  }
}

/**
 * Validate and normalize deadlock data
 * 
 * @param data - Potentially malformed data
 * @returns Normalized data that conforms to schema
 */
export function normalizeDeadlockData(data: unknown): DeadlockAnalysisResponse {
  // Default response for completely invalid data
  const defaultResponse: DeadlockAnalysisResponse = {
    success: false,
    error: 'Invalid deadlock data structure'
  };

  // If data is null or undefined, return default
  if (!data) return defaultResponse;
  
  try {
    // Try to parse with schema first
    const validData = safeValidateDeadlockAnalysisResponse(data);
    if (validData) return validData;
    
    // If parsing fails, try to normalize the structure
    const typedData = data as any;
    
    // Check if we have a basic structure to work with
    if (typeof typedData !== 'object') return defaultResponse;
    
    // Construct a valid response
    const normalizedResponse: DeadlockAnalysisResponse = {
      success: Boolean(typedData.success),
      error: typedData.error || undefined
    };
    
    // Try to normalize the analysis if it exists
    if (typedData.analysis) {
      const analysis = typedData.analysis as any;
      
      normalizedResponse.analysis = {
        timestamp: typeof analysis.timestamp === 'string' ? analysis.timestamp : new Date().toISOString(),
        recommended_fix: typeof analysis.recommended_fix === 'string' ? analysis.recommended_fix : undefined
      };
      
      // Try to extract visualization data
      if (analysis.visualization_data) {
        const vizData = analysis.visualization_data as any;
        
        // Ensure we have at least an empty processes array
        const processes = Array.isArray(vizData.processes) 
          ? vizData.processes.map((p: any) => normalizeProcess(p))
          : [];
        
        normalizedResponse.analysis.visualization_data = {
          processes
        };
        
        // Add other visualization data if available
        if (Array.isArray(vizData.relations)) {
          normalizedResponse.analysis.visualization_data.relations = 
            vizData.relations.map((r: any) => normalizeRelation(r));
        }
        
        if (vizData.deadlockChain) {
          normalizedResponse.analysis.visualization_data.deadlockChain = 
            Array.isArray(vizData.deadlockChain) ? vizData.deadlockChain : [];
        }
        
        if (vizData.pattern) {
          normalizedResponse.analysis.visualization_data.pattern = 
            typeof vizData.pattern === 'string' ? vizData.pattern : 
            typeof vizData.pattern === 'object' ? normalizePattern(vizData.pattern) : undefined;
        }
      }
      
      // Try to extract metadata
      if (analysis.metadata) {
        const meta = analysis.metadata as any;
        
        normalizedResponse.analysis.metadata = {
          execution_time_ms: typeof meta.execution_time_ms === 'number' ? meta.execution_time_ms : 0,
          parser_version: typeof meta.parser_version === 'string' ? meta.parser_version : undefined,
          cycles_found: typeof meta.cycles_found === 'number' ? meta.cycles_found : 0,
          severity: typeof meta.severity === 'number' ? meta.severity : undefined
        };
      }
    }
    
    return normalizedResponse;
  } catch (error) {
    console.error('Error normalizing deadlock data:', error);
    return defaultResponse;
  }
}

/**
 * Validate a relationship in a deadlock
 * 
 * @param source - Source process ID
 * @param target - Target process ID
 * @param processes - Available processes
 * @returns Whether the relationship is valid
 */
export function validateDeadlockRelationship(
  source: number,
  target: number,
  processes: any[]
): boolean {
  // Check if both source and target exist in processes
  const sourceExists = processes.some(p => p.pid === source);
  const targetExists = processes.some(p => p.pid === target);
  
  return sourceExists && targetExists;
}

/**
 * Get a schema-compliant process object
 * 
 * @param process - Process data
 * @returns Schema-compliant process
 */
export function normalizeProcess(process: any): z.infer<typeof deadlockProcessSchema> {
  // Create a schema-compliant process object
  return {
    pid: Number(process.pid || 0),
    applicationName: process.applicationName || process.application_name || '',
    username: process.username || '',
    databaseName: process.databaseName || process.database_name || '',
    query: process.query || '',
    blockingPids: Array.isArray(process.blockingPids) 
      ? process.blockingPids 
      : Array.isArray(process.blocking_pids) 
        ? process.blocking_pids 
        : [],
    waitEventType: process.waitEventType || process.wait_event_type || '',
    waitEvent: process.waitEvent || process.wait_event || '',
    tableName: process.tableName || process.table_name || '',
    relation: Number(process.relation || 0),
    lockType: process.lockType || process.lock_type || '',
    lockMode: process.lockMode || process.lock_mode || '',
    startTime: process.startTime || process.start_time || '',
    executionTimeMs: Number(process.executionTimeMs || process.execution_time_ms || 0),
    sessionUser: process.sessionUser || process.session_user || '',
    clientAddr: process.clientAddr || process.client_addr || '',
    transactionStartTime: process.transactionStartTime || process.transaction_start_time || '',
    critical: Boolean(process.critical),
    inCycle: Boolean(process.inCycle || process.in_cycle),
    tables: Array.isArray(process.tables) ? process.tables : [],
    locks_held: Array.isArray(process.locks_held) ? process.locks_held : [],
    locks_waiting: Array.isArray(process.locks_waiting) ? process.locks_waiting : []
  };
}

/**
 * Get a schema-compliant relation object
 * 
 * @param relation - Relation data
 * @returns Schema-compliant relation
 */
export function normalizeRelation(relation: any): z.infer<typeof deadlockRelationSchema> {
  return {
    relationId: Number(relation.relationId || relation.relation_id || 0),
    schema: relation.schema || '',
    name: relation.name || '',
    lockingProcesses: Array.isArray(relation.lockingProcesses) 
      ? relation.lockingProcesses
      : Array.isArray(relation.locking_processes)
        ? relation.locking_processes
        : [],
    accessPattern: relation.accessPattern || relation.access_pattern || '',
    totalRows: Number(relation.totalRows || relation.total_rows || 0),
    estimatedImpact: relation.estimatedImpact || relation.estimated_impact || '',
    hasIndex: Boolean(relation.hasIndex || relation.has_index),
    indexTypes: Array.isArray(relation.indexTypes)
      ? relation.indexTypes
      : Array.isArray(relation.index_types)
        ? relation.index_types
        : []
  };
}

/**
 * Get a schema-compliant pattern object
 * 
 * @param pattern - Pattern data
 * @returns Schema-compliant pattern
 */
export function normalizePattern(pattern: any): z.infer<typeof deadlockPatternSchema> {
  return {
    type: pattern.type || '',
    commonality: pattern.commonality || '',
    risk: pattern.risk || ''
  };
}

export default {
  deadlockProcessSchema,
  deadlockRelationSchema,
  deadlockEdgeSchema,
  deadlockCycleSchema,
  deadlockPatternSchema,
  deadlockVisualizationDataSchema,
  deadlockMetadataSchema,
  deadlockAnalysisSchema,
  deadlockAnalysisResponseSchema,
  lockCompatibilitySchema,
  deadlockPatternRecommendationSchema,
  deadlockHistoryEntrySchema,
  validateDeadlockAnalysisResponse,
  safeValidateDeadlockAnalysisResponse,
  normalizeDeadlockData,
  validateDeadlockRelationship,
  normalizeProcess,
  normalizeRelation,
  normalizePattern
};