// frontend/src/schemas/deadlockSchemas.ts

import { z } from 'zod';

/**
 * Zod schemas for validating deadlock analysis API responses
 */

// Define process schema
export const ProcessSchema = z.object({
  pid: z.number(),
  applicationName: z.string(),
  databaseName: z.string(),
  query: z.string(),
  blockingPids: z.array(z.number()),
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

// Define relation schema
export const RelationSchema = z.object({
  relationId: z.number(),
  schema: z.string(),
  name: z.string(),
  lockingProcesses: z.array(z.number()),
  accessPattern: z.string().optional(),
  totalRows: z.number().optional(),
  estimatedImpact: z.string().optional(),
  hasIndex: z.boolean().optional(),
  indexTypes: z.array(z.string()).optional()
});

// Define deadlock edge schema
export const DeadlockEdgeSchema = z.object({
  source: z.number(),
  target: z.number(),
  lockType: z.string().optional(),
  lockMode: z.string().optional(),
  tableName: z.string().optional()
});

// Define deadlock pattern schema
export const DeadlockPatternSchema = z.object({
  type: z.string(),
  commonality: z.string().optional(),
  risk: z.string().optional()
});

// Define visualization data schema
export const VisualizationDataSchema = z.object({
  processes: z.array(ProcessSchema),
  relations: z.array(RelationSchema),
  deadlockChain: z.array(DeadlockEdgeSchema).optional(),
  pattern: DeadlockPatternSchema.optional()
});

// Define metadata schema
export const MetadataSchema = z.object({
  execution_time_ms: z.number(),
  parser_version: z.string().optional(),
  cycles_found: z.number().optional(),
  confidence_score: z.number().optional()
});

// Define analysis schema
export const AnalysisSchema = z.object({
  timestamp: z.string(),
  metadata: MetadataSchema.optional(),
  visualization_data: VisualizationDataSchema,
  recommended_fix: z.string().optional()
});

// Define full response schema
export const DeadlockAnalysisResponseSchema = z.object({
  success: z.boolean(),
  analysis: AnalysisSchema
});

// Type for the validated response
export type DeadlockAnalysisResponse = z.infer<typeof DeadlockAnalysisResponseSchema>;

/**
 * Validates a deadlock analysis response against the schema
 * 
 * @param data Data to validate
 * @returns Validated data
 * @throws Error on validation failure
 */
export function validateDeadlockAnalysisResponse(data: unknown): DeadlockAnalysisResponse {
  try {
    return DeadlockAnalysisResponseSchema.parse(data);
  } catch (error) {
    console.error('Deadlock analysis validation error:', error);
    throw new Error('Invalid deadlock analysis response format');
  }
}

/**
 * Safely validates a deadlock analysis response, returning null on failure
 * 
 * @param data Data to validate
 * @returns Validated data or null on failure
 */
export function safeValidateDeadlockAnalysisResponse(data: unknown): DeadlockAnalysisResponse | null {
  try {
    return DeadlockAnalysisResponseSchema.parse(data);
  } catch (error) {
    console.error('Deadlock analysis validation error:', error);
    return null;
  }
}
