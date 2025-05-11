import { EventType, TimeRange } from '../../types/eventTypes';

/**
 * EventTable component props definition
 */
export interface EventTableProps {
  projectId?: string;
  timeRange?: TimeRange;
  onEventSelect?: (event: EventType) => void;
  showFilters?: boolean;
  maxItems?: number;
  autoRefresh?: boolean;
  enableKeyboardNavigation?: boolean;
  refreshInterval?: number;
  optimized?: boolean;
  onEventUpdate?: (event: EventType) => void;
  onExport?: () => void;
  virtualized?: boolean;
}

/**
 * EventRow component props definition
 */
export interface EventRowProps {
  event: EventType;
  onClick?: (event: EventType) => void;
  onAction?: (action: string, event: EventType) => void;
  isSelected?: boolean;
}

/**
 * DeadlockColumn component props definition
 */
export interface DeadlockColumnProps {
  event: EventType;
}

/**
 * SparklineCell component props definition
 */
export interface SparklineCellProps {
  eventData: EventType;
  timeRange?: TimeRange;
}

/**
 * ImpactCell component props definition
 */
export interface ImpactCellProps {
  eventData: EventType;
}

/**
 * EventTable ref interface
 */
export interface EventTableRef {
  refresh: () => void;
}

/**
 * Keyboard navigation item props
 */
export interface KeyboardNavigationProps {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  containerRef: React.RefObject<HTMLElement>;
}