// frontend/src/constants/visualizationConstants.ts

/**
 * Constants for visualization components
 */

// Impact thresholds
export const IMPACT_THRESHOLDS = {
  HIGH: 50,
  MEDIUM: 20,
  LOW: 5,
};

// Impact colors
export const IMPACT_COLORS = {
  HIGH: 'red',
  MEDIUM: 'orange',
  LOW: 'yellow',
  MINIMAL: 'gray',
};

// Impact labels
export const IMPACT_LABELS = {
  HIGH: 'High Impact',
  MEDIUM: 'Medium Impact',
  LOW: 'Low Impact',
  MINIMAL: 'Minimal Impact',
};

// Event level colors
export const EVENT_LEVEL_COLORS = {
  error: 'red',
  warning: 'orange',
  info: 'blue',
  debug: 'gray',
  fatal: 'dark',
  default: 'gray',
};

// Sparkline trend configurations
export const SPARKLINE_TREND = {
  POSITIVE: {
    COLOR: 'green',
    LABEL: 'Improving',
    ICON: '↓',
  },
  NEGATIVE: {
    COLOR: 'red',
    LABEL: 'Worsening',
    ICON: '↑',
  },
  STABLE: {
    COLOR: 'blue',
    LABEL: 'Stable',
    ICON: '→',
  },
};

// Time range labels
export const TIME_RANGE_LABELS = {
  '24h': 'last 24 hours',
  '7d': 'last 7 days',
  '30d': 'last 30 days',
};

// Chart dimensions
export const CHART_DIMENSIONS = {
  SPARKLINE: {
    WIDTH: 120,
    HEIGHT: 40,
  },
  IMPACT: {
    WIDTH: 100,
    HEIGHT: 30,
  },
};
