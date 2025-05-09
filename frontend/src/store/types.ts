// File: frontend/src/store/types.ts

/**
 * Interface for the application store state
 */
export interface AppState {
  // Configuration
  organizationSlug: string;
  projectSlug: string;
  
  // Selection state
  selectedIssueId: string | null;
  selectedEventId: string | null;
  
  // Filter state
  statusFilter: string;
  searchQuery: string;
  
  // AI model settings
  activeAIModel: string;
  
  // Events map for "latest event" information
  latestEventsByIssue: Record<string, string>;
}

/**
 * Interface for the application store actions
 */
export interface AppActions {
  // Organization and project actions
  setOrgProject: (organizationSlug: string, projectSlug: string) => void;
  
  // Selection actions
  setSelectedIssue: (issueId: string | null, eventId?: string | null) => void;
  clearSelection: () => void;
  
  // Filter actions
  setStatusFilter: (statusFilter: string) => void;
  setSearchQuery: (searchQuery: string) => void;
  resetFilters: () => void;
  
  // AI model actions
  setActiveAIModel: (modelName: string) => void;
  
  // Event tracking actions
  storeLatestEventId: (issueId: string, eventId: string) => void;
}

/**
 * Complete application store type combining state and actions
 */
export type AppStore = AppState & AppActions;