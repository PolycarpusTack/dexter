/**
 * UI-related constants
 */

// Layout dimensions
export const LAYOUT = {
  /** Header height in pixels */
  HEADER_HEIGHT: 60,
  
  /** Sidebar width in pixels */
  SIDEBAR_WIDTH: 300,
  
  /** Content padding in pixels */
  CONTENT_PADDING: 16,
  
  /** Navbar height in pixels */
  NAVBAR_HEIGHT: 48,
  
  /** Footer height in pixels */
  FOOTER_HEIGHT: 40
} as const;

// Table configurations
export const TABLE = {
  /** Default page size for tables */
  DEFAULT_PAGE_SIZE: 20,
  
  /** Maximum rows to display without pagination */
  MAX_ROWS_WITHOUT_PAGINATION: 100,
  
  /** Row height in pixels for virtualization */
  ROW_HEIGHT: 40,
  
  /** Header height in pixels */
  HEADER_HEIGHT: 48,
  
  /** Minimum column width in pixels */
  MIN_COLUMN_WIDTH: 100,
  
  /** Maximum column width in pixels */
  MAX_COLUMN_WIDTH: 400
} as const;

// Modal and dialog sizes
export const MODAL = {
  /** Small modal width */
  SMALL_WIDTH: 400,
  
  /** Medium modal width */
  MEDIUM_WIDTH: 600,
  
  /** Large modal width */
  LARGE_WIDTH: 800,
  
  /** Extra large modal width */
  XL_WIDTH: 1200,
  
  /** Maximum modal height (90% of viewport) */
  MAX_HEIGHT_PERCENT: 90
} as const;

// Animation durations (in milliseconds)
export const ANIMATION = {
  /** Fast animations */
  FAST: 150,
  
  /** Normal animations */
  NORMAL: 300,
  
  /** Slow animations */
  SLOW: 500,
  
  /** Page transitions */
  PAGE_TRANSITION: 200,
  
  /** Notification display duration */
  NOTIFICATION_DURATION: 5000,
  
  /** Tooltip delay */
  TOOLTIP_DELAY: 500
} as const;

// Z-index layers
export const Z_INDEX = {
  /** Base layer */
  BASE: 1,
  
  /** Dropdown menus */
  DROPDOWN: 100,
  
  /** Fixed headers */
  HEADER: 200,
  
  /** Sidebars */
  SIDEBAR: 300,
  
  /** Modals */
  MODAL: 1000,
  
  /** Notifications */
  NOTIFICATION: 1100,
  
  /** Tooltips */
  TOOLTIP: 1200,
  
  /** Loading overlays */
  LOADING: 1300,
  
  /** Maximum z-index */
  MAX: 9999
} as const;

// Breakpoints (in pixels)
export const BREAKPOINTS = {
  /** Extra small devices */
  XS: 0,
  
  /** Small devices */
  SM: 576,
  
  /** Medium devices */
  MD: 768,
  
  /** Large devices */
  LG: 992,
  
  /** Extra large devices */
  XL: 1200,
  
  /** Extra extra large devices */
  XXL: 1400
} as const;

// Form validation
export const VALIDATION = {
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 8,
  
  /** Maximum input length for text fields */
  MAX_TEXT_LENGTH: 255,
  
  /** Maximum length for textarea */
  MAX_TEXTAREA_LENGTH: 2000,
  
  /** Maximum file size in bytes (10MB) */
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  
  /** Debounce delay for search inputs (milliseconds) */
  SEARCH_DEBOUNCE: 300
} as const;

// Chart and visualization
export const CHART = {
  /** Default chart height */
  DEFAULT_HEIGHT: 300,
  
  /** Minimum chart height */
  MIN_HEIGHT: 200,
  
  /** Maximum chart height */
  MAX_HEIGHT: 600,
  
  /** Default chart margin */
  DEFAULT_MARGIN: 20,
  
  /** Number of data points to show by default */
  DEFAULT_DATA_POINTS: 50,
  
  /** Animation duration for chart transitions */
  ANIMATION_DURATION: 750
} as const;

// Loading states
export const LOADING = {
  /** Skeleton animation duration */
  SKELETON_DURATION: 1500,
  
  /** Minimum loading time to prevent flicker */
  MIN_DISPLAY_TIME: 200,
  
  /** Spinner size (small) */
  SPINNER_SMALL: 16,
  
  /** Spinner size (medium) */
  SPINNER_MEDIUM: 24,
  
  /** Spinner size (large) */
  SPINNER_LARGE: 32
} as const;