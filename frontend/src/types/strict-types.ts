/**
 * Strict Type Definitions
 * 
 * Replace overly permissive `any` types with proper definitions
 */

import { z } from 'zod';

// Event types with proper structure
export const StrictEventSchema = z.object({
  id: z.string(),
  eventID: z.string().optional(),
  groupID: z.string().optional(),
  projectSlug: z.string().optional(),
  platform: z.string().optional(),
  message: z.string(),
  level: z.enum(['debug', 'info', 'warning', 'error', 'fatal']).optional(),
  type: z.string().optional(),
  timestamp: z.string().optional(),
  dateCreated: z.string().optional(),
  dateReceived: z.string().optional(),
  tags: z.array(z.object({
    key: z.string(),
    value: z.string()
  })).optional(),
  user: z.object({
    id: z.string().optional(),
    username: z.string().optional(),
    email: z.string().optional(),
    ip_address: z.string().optional()
  }).optional(),
  contexts: z.object({
    os: z.any().optional(),
    device: z.any().optional(),
    runtime: z.any().optional(),
    browser: z.any().optional()
  }).optional(),
  entries: z.array(z.object({
    type: z.string(),
    data: z.record(z.any())
  })).optional(),
  exception: z.object({
    values: z.array(z.object({
      type: z.string(),
      value: z.string(),
      stacktrace: z.any().optional()
    }))
  }).optional(),
  title: z.string().optional(),
  location: z.string().optional(),
  culprit: z.string().optional()
});

export type StrictEvent = z.infer<typeof StrictEventSchema>;

// Issue types with proper structure  
export const StrictIssueSchema = z.object({
  id: z.string(),
  shortId: z.string().optional(),
  title: z.string(),
  culprit: z.string().optional(),
  level: z.enum(['debug', 'info', 'warning', 'error', 'fatal']).optional(),
  status: z.enum(['resolved', 'unresolved', 'ignored']).optional(),
  statusDetails: z.any().optional(),
  platform: z.string().optional(),
  project: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string()
  }).optional(),
  type: z.string().optional(),
  metadata: z.object({
    value: z.string().optional(),
    type: z.string().optional(),
    filename: z.string().optional(),
    function: z.string().optional()
  }).optional(),
  numEvents: z.number().optional(),
  userCount: z.number().optional(),
  count: z.string().optional(),
  stats: z.any().optional(),
  firstSeen: z.string().optional(),
  lastSeen: z.string().optional(),
  isPublic: z.boolean().optional(),
  isBookmarked: z.boolean().optional(),
  isSubscribed: z.boolean().optional(),
  hasSeen: z.boolean().optional(),
  annotations: z.array(z.string()).optional(),
  assignedTo: z.any().nullable().optional(),
  logger: z.string().nullable().optional(),
  permalink: z.string().optional()
});

export type StrictIssue = z.infer<typeof StrictIssueSchema>;

// Replace index signatures with explicit properties
export interface StrictApiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      total: number;
      page: number;
      pageSize: number;
      pageCount: number;
    };
  };
  links?: {
    self: string;
    first?: string;
    last?: string;
    prev?: string;
    next?: string;
  };
}

// Model configuration with explicit fields
export interface StrictModelConfig {
  name: string;
  provider: 'ollama' | 'openai' | 'anthropic' | 'gemini';
  status: 'available' | 'unavailable' | 'downloading' | 'error';
  size?: number;
  modified_at?: string;
  capabilities: Array<'text' | 'code' | 'image' | 'embedding'>;
  details?: {
    family?: string;
    parameter_size?: string;
    quantization?: string;
  };
}