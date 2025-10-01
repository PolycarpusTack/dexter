/**
 * Specific interfaces for API data structures
 */

// Provider and model configuration interfaces
export interface ModelConfig {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  stop?: string[];
  [key: string]: any;
}

export interface Metadata {
  [key: string]: any;
}

// Event interfaces
export interface EventEntry {
  id: string;
  eventID: string;
  groupID?: string;
  projectSlug?: string;
  message: string;
  platform?: string;
  dateCreated: string;
  [key: string]: any;
}

export interface EventUser {
  id?: string;
  username?: string;
  email?: string;
  ip_address?: string;
  [key: string]: any;
}

export interface EventContext {
  [key: string]: any;
}

export interface BreadcrumbData {
  type: string;
  category: string;
  message: string;
  timestamp: string;
  level?: string;
  data?: Record<string, any>;
}

// Alert interfaces
export interface AlertCondition {
  type: string;
  name: string;
  value: number | string;
  comparison: string;
}

export interface AlertAction {
  type: string;
  name: string;
  destination: string;
  options?: Record<string, any>;
}

// Progress tracking
export interface ProgressEvent {
  type: string;
  message: string;
  progress: number;
  total?: number;
  status: 'pending' | 'processing' | 'complete' | 'error';
}

// API metadata
export interface ApiMetadata {
  version: string;
  documentation_url?: string;
  support_email?: string;
  features?: string[];
}

export interface ApiErrorDetails {
  code: string;
  message: string;
  field?: string;
  suggestion?: string;
  context?: Record<string, any>;
}

// Settings interfaces
export interface UISettings {
  theme: 'light' | 'dark' | 'system';
  density: 'compact' | 'comfortable' | 'spacious';
  timezone: string;
  dateFormat: string;
  language: string;
  colorBlindMode: boolean;
}

export interface ProviderSettings {
  openai?: {
    apiKey?: string;
    organization?: string;
    defaultModel?: string;
  };
  anthropic?: {
    apiKey?: string;
    defaultModel?: string;
  };
  google?: {
    apiKey?: string;
    defaultModel?: string;
  };
  [key: string]: any;
}

// Error handling
export interface ErrorContext {
  url?: string;
  method?: string;
  status?: number;
  timestamp?: string;
  requestId?: string;
  component?: string;
  action?: string;
  [key: string]: any;
}

// Metrics
export interface ModelMetrics {
  model: string;
  provider: string;
  latency: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  tokens: {
    input: {
      total: number;
      avg: number;
    };
    output: {
      total: number;
      avg: number;
    };
  };
  requests: {
    total: number;
    success: number;
    error: number;
  };
  cost: {
    total: number;
    avg: number;
  };
}

// Deadlock related interfaces
export interface DeadlockNode {
  id: string;
  pid: number;
  query: string;
  state: 'waiting' | 'held';
  lockType: string;
  relation: string;
}

export interface DeadlockEdge {
  source: string;
  target: string;
  type: 'waits-for' | 'holding';
}

export interface VisualizationMetadata {
  timestamp: string;
  source: string;
  cycleCount: number;
  nodeCount: number;
  edgeCount: number;
}

export interface DeadlockVisualizationData {
  nodes: DeadlockNode[];
  edges: DeadlockEdge[];
  metadata: VisualizationMetadata;
}

// Error context interfaces
export interface StackFrame {
  filename: string;
  function: string;
  lineno: number;
  colno?: number;
  abs_path?: string;
  context_line?: string;
  pre_context?: string[];
  post_context?: string[];
  in_app: boolean;
}

export interface ExceptionValue {
  type: string;
  value: string;
  module?: string;
  thread_id?: number;
  stacktrace?: {
    frames: StackFrame[];
  };
}

export interface ThreadInfo {
  id: number;
  crashed: boolean;
  current: boolean;
  name?: string;
  stacktrace?: {
    frames: StackFrame[];
  };
}

// UI/UX related interfaces
export interface ToastNotification {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ModalState {
  isOpen: boolean;
  title?: string;
  content?: React.ReactNode;
  actions?: ModalAction[];
  onClose?: () => void;
}

export interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

// Request/Response metadata
export interface RequestMetadata {
  requestId: string;
  timestamp: number;
  duration?: number;
  cached?: boolean;
  retries?: number;
}

export interface PaginationMetadata {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Model-specific interfaces
export interface ModelCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsJson: boolean;
  contextWindow: number;
  maxOutputTokens: number;
}

export interface ModelPerformance {
  averageLatency: number;
  successRate: number;
  errorRate: number;
  totalRequests: number;
}

export interface ProviderConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
  defaultModel?: string;
}

// Error categorization
export interface ErrorPattern {
  id: string;
  name: string;
  regex: RegExp;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestedFix?: string;
}

export interface ErrorAnalysis {
  category: string;
  patterns: ErrorPattern[];
  rootCause?: string;
  affectedComponents: string[];
  suggestedActions: string[];
  relatedIssues?: string[];
}

// Template system interfaces
export interface PromptVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: unknown;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: unknown[];
  };
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: PromptVariable[];
  category: string;
  version: string;
  tags: string[];
  author?: string;
  createdAt: string;
  updatedAt: string;
}

// Integration interfaces
export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}

export interface IntegrationStatus {
  service: string;
  status: 'connected' | 'disconnected' | 'error';
  lastChecked: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}