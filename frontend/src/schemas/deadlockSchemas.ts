// File: src/schemas/deadlockSchemas.ts

import { z } from 'zod';
import { DeadlockAnalysisResponse } from '../types/deadlock';

/**
 * Schema for process data in deadlock
 */
export const deadlockProcessSchema = z.object({
  pid: z.number(),
  applicationName: z.string().optional(),
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
  critical: z.boolean().optional()
});

/**
 * Schema for relation data in deadlock
 */
export const deadlockRelationSchema = z.object({
  relationId: z.number(),
  schema: z.string().optional(),
  name: z.string(),
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
  deadlockChain: z.array(deadlockEdgeSchema).optional(),
  pattern: deadlockPatternSchema.optional()
});

/**
 * Schema for deadlock metadata
 */
export const deadlockMetadataSchema = z.object({
  execution_time_ms: z.number(),
  parser_version: z.string().optional(),
  cycles_found: z.number().optional(),
  confidence_score: z.number().optional()
});

/**
 * Schema for deadlock analysis
 */
export const deadlockAnalysisSchema = z.object({
  timestamp: z.string(),
  metadata: deadlockMetadataSchema.optional(),
  visualization_data: deadlockVisualizationDataSchema,
  recommended_fix: z.string().optional()
});

/**
 * Schema for deadlock analysis response
 */
export const deadlockAnalysisResponseSchema = z.object({
  success: z.boolean(),
  analysis: deadlockAnalysisSchema
});

/**
 * Safe validator that returns data even if validation fails
 * 
 * @param data - Data to validate
 * @returns Validated data
 */
export function safeValidateDeadlockAnalysisResponse(
  data: any
): DeadlockAnalysisResponse {
  try {
    // Try to validate
    return deadlockAnalysisResponseSchema.parse(data) as DeadlockAnalysisResponse;
  } catch (error) {
    // Log validation errors
    console.warn('Deadlock analysis data validation failed:', error);
    
    // Return original data
    return data as DeadlockAnalysisResponse;
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
    critical: Boolean(process.critical)
  };
}



export default {
  safeValidateDeadlockAnalysisResponse,
  validateDeadlockRelationship,
  normalizeProcess
};
