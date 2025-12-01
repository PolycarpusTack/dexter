/**
 * Enrichment Data Types
 *
 * Type definitions for all 11 enrichment data sources
 */

// ===== Release Context =====
export interface ReleaseContext {
  version: string;
  url?: string;
  dateCreated?: string;
  commits?: Array<{
    id: string;
    message: string;
    author: string;
    timestamp: string;
  }>;
  newIssues?: number;
  deployments?: Array<{
    environment: string;
    dateFinished: string;
    url?: string;
  }>;
}

// ===== Suspect Commits =====
export interface SuspectCommit {
  id: string;
  message: string;
  author: {
    name: string;
    email?: string;
  };
  repository: {
    name: string;
    url?: string;
  };
  score: number; // 0-100
  suspectCommitType?: 'first-release' | 'in-release' | 'multiple-releases';
  dateCreated: string;
}

// ===== Performance Spans =====
export interface PerformanceSpan {
  op: string;
  description?: string;
  spanId: string;
  parentSpanId?: string;
  traceId: string;
  startTimestamp: number;
  timestamp: number;
  duration: number; // milliseconds
  tags?: Record<string, string>;
  data?: Record<string, unknown>;
  status?: 'ok' | 'error' | 'unknown';
}

export interface PerformanceContext {
  spans: PerformanceSpan[];
  slowSpans: PerformanceSpan[]; // Spans exceeding threshold
  nPlusOneDetected?: boolean;
  nPlusOneDetails?: {
    parentSpan: PerformanceSpan;
    repeatedSpans: PerformanceSpan[];
    count: number;
  };
  criticalPath?: string[]; // spanIds in critical path
}

// ===== Profiling Hotspots =====
export interface ProfilingHotspot {
  function: string;
  file: string;
  line?: number;
  selfTime: number; // milliseconds
  totalTime: number; // milliseconds
  callCount: number;
  package?: string;
}

export interface ProfilingContext {
  hotspots: ProfilingHotspot[];
  flamegraphUrl?: string;
  profileId?: string;
  duration: number;
  sampleCount: number;
}

// ===== Session Context =====
export interface SessionContext {
  id: string;
  started: string;
  duration?: number; // seconds
  crashFree: boolean;
  abnormal: boolean;
  errorsCount: number;
  userAgent?: string;
  os?: {
    name: string;
    version: string;
  };
  device?: {
    family: string;
    model?: string;
  };
  release?: string;
  environment?: string;
}

// ===== Replay Metadata =====
export interface ReplayMetadata {
  replayId: string;
  url: string; // URL to view replay in Sentry
  duration?: number; // seconds
  countErrors: number;
  countUrls: number;
  startedAt: string;
  finishedAt?: string;
  errorIds: string[];
  tags?: Record<string, string>;
}

// ===== Alert Context =====
export interface AlertContext {
  triggeredAlerts: Array<{
    id: string;
    name: string;
    triggeredAt: string;
    status: 'critical' | 'warning' | 'resolved';
    rule: {
      id: string;
      name: string;
      conditions: string;
    };
  }>;
  relatedIncidents?: Array<{
    id: string;
    title: string;
    status: 'open' | 'closed' | 'investigating';
    startedAt: string;
    url?: string;
  }>;
  alertStormDetected?: boolean;
  alertStormDetails?: {
    count: number;
    windowMinutes: number;
    patterns: string[];
  };
}

// ===== Breadcrumb Timeline =====
export interface Breadcrumb {
  timestamp: string;
  type: 'navigation' | 'http' | 'ui' | 'console' | 'error' | 'default';
  category?: string;
  message?: string;
  level?: 'info' | 'warning' | 'error' | 'fatal';
  data?: Record<string, unknown>;
}

// ===== Tag Distributions =====
export interface TagDistribution {
  key: string;
  topValues: Array<{
    value: string;
    count: number;
    percentage: number;
  }>;
  uniqueValues: number;
  totalCount: number;
}

// ===== Ownership Info =====
export interface OwnershipInfo {
  owners?: Array<{
    type: 'team' | 'user';
    id: string;
    name: string;
  }>;
  codeOwners?: Array<{
    path: string;
    owners: string[];
    source?: 'CODEOWNERS' | 'ownership-rules';
  }>;
  assignedTo?: {
    type: 'user' | 'team';
    id: string;
    name: string;
    email?: string;
  };
}

// ===== Measurements =====
export interface WebVitals {
  lcp?: number; // Largest Contentful Paint (ms)
  fid?: number; // First Input Delay (ms)
  cls?: number; // Cumulative Layout Shift (score)
  ttfb?: number; // Time to First Byte (ms)
  fcp?: number; // First Contentful Paint (ms)
  inp?: number; // Interaction to Next Paint (ms)
}

export interface CustomMeasurement {
  name: string;
  value: number;
  unit?: string;
}

export interface Measurements {
  webVitals?: WebVitals;
  custom: CustomMeasurement[];
}

// ===== Grouping Info =====
export interface GroupingInfo {
  similarIssues: Array<{
    id: string;
    title: string;
    similarity: number; // 0-1
    count: number;
    lastSeen: string;
  }>;
  mergeCandidates?: Array<{
    id: string;
    title: string;
    confidence: number; // 0-1
    reason: string;
  }>;
  fingerprint: string[];
  groupingConfig?: {
    id: string;
    enhancements: string[];
  };
}

// ===== Attachments Summary =====
export interface AttachmentSummary {
  id: string;
  name: string;
  size: number; // bytes
  type: string;
  dateCreated: string;
  contentType?: string;
}

// ===== Enrichment Status =====
export interface EnrichmentSourceStatus {
  success: boolean;
  fetchedAt?: string;
  error?: string;
  ttl?: number; // Time to live in seconds
}

export interface EnrichmentStatus {
  release: EnrichmentSourceStatus;
  commits: EnrichmentSourceStatus;
  performance: EnrichmentSourceStatus;
  profiling: EnrichmentSourceStatus;
  session: EnrichmentSourceStatus;
  replay: EnrichmentSourceStatus;
  alerts: EnrichmentSourceStatus;
  breadcrumbs: EnrichmentSourceStatus;
  tags: EnrichmentSourceStatus;
  ownership: EnrichmentSourceStatus;
  measurements: EnrichmentSourceStatus;
  grouping: EnrichmentSourceStatus;
  attachments: EnrichmentSourceStatus;
}

// ===== Complete Enrichment Data =====
export interface EnrichmentData {
  // Core data
  releaseContext?: ReleaseContext;
  suspectCommits?: SuspectCommit[];
  performanceSpans?: PerformanceContext;
  profilingHotspots?: ProfilingContext;
  sessionContext?: SessionContext;
  replayMetadata?: ReplayMetadata;
  alertContext?: AlertContext;
  breadcrumbTimeline?: Breadcrumb[];
  tagDistributions?: TagDistribution[];
  ownershipInfo?: OwnershipInfo;
  measurements?: Measurements;
  groupingInfo?: GroupingInfo;
  attachmentsSummary?: AttachmentSummary[];

  // Metadata
  enrichmentStatus: EnrichmentStatus;
  enrichedAt: string;
}

// ===== RAG Context =====
export interface SimilarIssue {
  id: string;
  title: string;
  similarity: number; // 0-1
  description?: string;
  resolution?: string;
  status: string;
}

export interface RAGContext {
  similarIssues: SimilarIssue[];
  enrichmentDataUsed: string[]; // List of enrichment sources used
  query: string;
  modelInfo: {
    provider: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
  retrievedAt: string;
}

// ===== AI Analysis =====
export interface AIAnalysis {
  summary: string;
  confidence: number; // 0-1
  citations?: Array<{
    text: string;
    source: string; // e.g., "release_context", "similar_issue_123"
  }>;
  ragContext?: RAGContext;
  generatedAt: string;
}

// ===== Complete Issue Detail =====
export interface IssueDetail {
  id: string;
  title: string;
  status: string;
  level: 'error' | 'warning' | 'info' | 'fatal';
  culprit?: string;
  metadata?: {
    type?: string;
    value?: string;
    function?: string;
    filename?: string;
  };

  // Enrichment
  enrichment?: EnrichmentData;

  // AI Analysis
  aiAnalysis?: AIAnalysis;

  // Standard fields
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
}

// ===== Freshness Levels =====
export enum FreshnessLevel {
  FRESH = 'fresh',        // < 5 min
  RECENT = 'recent',      // 5-30 min
  STALE = 'stale',        // 30 min - TTL
  VERY_STALE = 'very_stale', // > TTL
  FAILED = 'failed'       // Fetch failed
}

// ===== Timeline Event (merged breadcrumbs + spans) =====
export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'breadcrumb' | 'span';
  category: string;
  message?: string;
  duration?: number; // For spans
  data?: Record<string, unknown>;
  level?: 'info' | 'warning' | 'error' | 'fatal';
  isCriticalPath?: boolean;
}
