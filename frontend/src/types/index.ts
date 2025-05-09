// File: src/types/index.ts

import { SentryEvent, EventTag, EventException, EventEntry, EventContext } from './deadlock';
import { VisualizationNode, VisualizationEdge, GraphData, VisualizationOptions } from './visualization';

// Re-export all types
export {
  SentryEvent,
  EventTag,
  EventException,
  EventEntry,
  EventContext,
  VisualizationNode,
  VisualizationEdge,
  GraphData,
  VisualizationOptions
};

// Error Analytics Types
export interface ErrorAnalyticsData {
  summary: ErrorSummary;
  byCategory: ErrorCountByCategory[];
  byTime: ErrorCountByTime[];
  topErrors: ErrorDetails[];
}

export interface ErrorSummary {
  totalErrors: number;
  uniqueErrors: number;
  affectedUsers: number;
  highImpactErrors: number;
  mostCommonCategory: string;
  trendingErrors: Array<{
    id: string;
    type: string;
    count: number;
    trend: number; // percentage change
  }>;
}

export interface ErrorCountByCategory {
  name: string;
  count: number;
  color: string;
}

export interface ErrorCountByTime {
  time: number; // time unit index
  [category: string]: number; // error counts by category
}

export interface ErrorDetails {
  id: string;
  type: string;
  message: string;
  category: string;
  impact: 'High' | 'Medium' | 'Low';
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
}

export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

export interface ErrorAnalyticsParams {
  timeRange?: TimeRange;
  category?: string;
  impact?: string;
}

// Model Types
export interface OllamaModel {
  name: string;
  status: 'available' | 'unavailable' | 'downloading' | 'error';
  size?: number;
  modified_at?: string;
  details?: any;
  error?: string;
}

export interface ModelsResponse {
  models: OllamaModel[];
  current_model?: string;
  ollama_status: 'available' | 'error';
  error?: string;
}

export interface PullModelResponse {
  status: string;
  message: string;
  name: string;
  estimated_time?: string;
}

export interface SelectModelResponse {
  status: string;
  model: string;
  message: string;
}

// UI Component Props
export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  message: string;
  buttonLabel?: string;
  buttonAction?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export interface InfoTooltipProps {
  content: string | React.ReactNode;
  size?: number;
  color?: string;
  position?: string;
  iconProps?: any;
  tooltipProps?: any;
}

export interface ProgressIndicatorProps {
  isLoading: boolean;
  operation?: string;
  expectedDuration?: number;
  model?: string | null;
}

export interface LoadingSkeletonProps {
  type?: 'table' | 'detail' | 'card' | 'list';
  rows?: number;
  height?: number | string;
  animate?: boolean;
}

export interface AccessibleIconProps {
  icon: React.ReactNode;
  label: string;
  hideLabel?: boolean;
}

export interface KeyboardShortcutsGuideProps {
  opened: boolean;
  onClose: () => void;
  isMac?: boolean;
}
