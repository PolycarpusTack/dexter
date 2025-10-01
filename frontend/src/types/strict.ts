/**
 * Strict type definitions to replace 'any' types
 */

// Strict object type that requires all properties to be defined
export type StrictRecord<K extends keyof any, T> = Record<K, T>;

// Type for unknown object data
export type UnknownObject = Record<string, unknown>;

// Type for JSON-serializable values
export type JSONValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JSONObject 
  | JSONArray;

export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];

// Type for form data
export type FormData = Record<string, string | number | boolean | File>;

// Type for URL search parameters
export type SearchParams = Record<string, string | string[]>;

// Type for HTML element attributes
export type ElementAttributes = Record<string, string | number | boolean>;

// Type for CSS properties
export type CSSProperties = Record<string, string | number>;

// Type for event handlers
export type EventHandler<T = Event> = (event: T) => void;

// Type for async event handlers
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;

// Type for component props that can be anything but should be avoided
export type LegacyProps = UnknownObject;

// Type for function that accepts unknown parameters
export type UnknownFunction = (...args: unknown[]) => unknown;

// Type for async function that accepts unknown parameters
export type AsyncUnknownFunction = (...args: unknown[]) => Promise<unknown>;

// Type for React component props
export type ComponentProps<T = UnknownObject> = T & {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  'data-testid'?: string;
};

// Type for form field values
export type FieldValue = string | number | boolean | Date | null | undefined;

// Type for form field errors
export type FieldError = string | null;

// Type for form validation rules
export type ValidationRule<T = FieldValue> = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: T) => boolean | string;
};

// Type for filters that can have various value types
export type FilterValue = 
  | string 
  | number 
  | boolean 
  | Date 
  | string[] 
  | number[] 
  | null 
  | undefined;

// Type for sort configuration
export type SortConfig = {
  field: string;
  direction: 'asc' | 'desc';
};

// Type for table column definition
export type ColumnDefinition<T = UnknownObject> = {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  headerRender?: () => React.ReactNode;
};

// Type for chart data points
export type DataPoint = {
  x: string | number | Date;
  y: number;
  label?: string;
  color?: string;
  metadata?: UnknownObject;
};

// Type for chart series
export type ChartSeries = {
  name: string;
  data: DataPoint[];
  color?: string;
  type?: string;
  metadata?: UnknownObject;
};

// Type for notification/alert content
export type NotificationContent = {
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
};

// Type for modal configuration
export type ModalConfig = {
  title?: string;
  content: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'xl';
  closable?: boolean;
  footer?: React.ReactNode;
  onClose?: () => void;
  onConfirm?: () => void | Promise<void>;
};

// Type for navigation item
export type NavigationItem = {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
  path?: string;
  onClick?: () => void;
  children?: NavigationItem[];
  badge?: string | number;
  disabled?: boolean;
  hidden?: boolean;
};

// Type for breadcrumb item
export type BreadcrumbItem = {
  label: string;
  path?: string;
  onClick?: () => void;
  active?: boolean;
};

// Type for tab configuration
export type TabConfig = {
  id: string;
  label: string;
  content: React.ReactNode;
  icon?: React.ComponentType<any>;
  disabled?: boolean;
  badge?: string | number;
};

// Type for dropdown/select option
export type SelectOption<T = string | number> = {
  value: T;
  label: string;
  disabled?: boolean;
  group?: string;
  metadata?: UnknownObject;
};

// Type for key-value pairs
export type KeyValuePair<K = string, V = unknown> = {
  key: K;
  value: V;
};

// Type for metric/statistic
export type Metric = {
  name: string;
  value: number | string;
  unit?: string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  trend?: DataPoint[];
  metadata?: UnknownObject;
};

// Utility types for better type safety
export type NonEmptyArray<T> = [T, ...T[]];
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Type for environment variables
export type Environment = 'development' | 'staging' | 'production' | 'test';

// Type for log levels
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

// Type for theme configuration
export type ThemeMode = 'light' | 'dark' | 'system';

// Type for language/locale
export type Locale = string; // e.g., 'en-US', 'es-ES', etc.

// Type guards
export const isString = (value: unknown): value is string => typeof value === 'string';
export const isNumber = (value: unknown): value is number => typeof value === 'number' && !isNaN(value);
export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
export const isArray = <T>(value: unknown): value is T[] => Array.isArray(value);
export const isObject = (value: unknown): value is UnknownObject => 
  value !== null && typeof value === 'object' && !Array.isArray(value);
export const isFunction = (value: unknown): value is Function => typeof value === 'function';
export const isDefined = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;

// Assertion functions
export const assertString = (value: unknown): asserts value is string => {
  if (!isString(value)) throw new Error(`Expected string, got ${typeof value}`);
};

export const assertNumber = (value: unknown): asserts value is number => {
  if (!isNumber(value)) throw new Error(`Expected number, got ${typeof value}`);
};

export const assertObject = (value: unknown): asserts value is UnknownObject => {
  if (!isObject(value)) throw new Error(`Expected object, got ${typeof value}`);
};

export const assertArray = <T>(value: unknown): asserts value is T[] => {
  if (!isArray(value)) throw new Error(`Expected array, got ${typeof value}`);
};