// File: frontend/src/store/appStore.ts
// Unified store implementation that combines both previous versions

import { create } from 'zustand';

/**
 * Interface for the application store state
 */
interface AppState {
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
  
  // Actions
  setOrgProject: (organizationSlug: string, projectSlug: string) => void;
  setSelectedIssue: (issueId: string | null, eventId?: string | null) => void;
  setStatusFilter: (statusFilter: string) => void;
  setSearchQuery: (searchQuery: string) => void;
  setActiveAIModel: (modelName: string) => void;
  storeLatestEventId: (issueId: string, eventId: string) => void;
  resetFilters: () => void;
  clearSelection: () => void;
}

/**
 * Global application state store
 */
const useAppStore = create<AppState>((set) => ({
  // Configuration
  organizationSlug: localStorage.getItem('organizationSlug') || '',
  projectSlug: localStorage.getItem('projectSlug') || '',
  
  // Selection state
  selectedIssueId: null,
  selectedEventId: null,
  
  // Filter state
  statusFilter: 'unresolved', // Default filter
  searchQuery: '',
  
  // AI model settings
  activeAIModel: localStorage.getItem('activeAIModel') || '',
  
  // Events to support "latest event" fetching when needed
  latestEventsByIssue: {}, // Map of issueId -> eventId for the latest event per issue
  
  // Set Sentry org/project
  setOrgProject: (organizationSlug, projectSlug) => {
    if (organizationSlug) localStorage.setItem('organizationSlug', organizationSlug);
    if (projectSlug) localStorage.setItem('projectSlug', projectSlug);
    
    set({ 
      organizationSlug, 
      projectSlug,
      // Clear selections when changing project
      selectedIssueId: null,
      selectedEventId: null,
    });
  },
  
  // Set selected issue and optionally its event
  setSelectedIssue: (issueId, eventId = null) => {
    set((state) => {
      // If no eventId provided, try to get it from our stored latest events
      const resolvedEventId = eventId || (issueId ? state.latestEventsByIssue[issueId] : null);
      
      console.log('Setting selected issue:', issueId, 'with event ID:', resolvedEventId);
      
      return {
        selectedIssueId: issueId,
        selectedEventId: resolvedEventId,
      };
    });
  },
  
  // Set status filter
  setStatusFilter: (statusFilter) => set({ 
    statusFilter,
    selectedIssueId: null, // Reset selection when filters change
    selectedEventId: null,
  }),
  
  // Set search query
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  
  // Set active AI model
  setActiveAIModel: (modelName) => {
    if (modelName) localStorage.setItem('activeAIModel', modelName);
    set({ activeAIModel: modelName });
  },
  
  // Store latest event ID for an issue (called when receiving issue data)
  storeLatestEventId: (issueId, eventId) => {
    set((state) => ({
      latestEventsByIssue: {
        ...state.latestEventsByIssue,
        [issueId]: eventId,
      }
    }));
  },
  
  // Reset all filters
  resetFilters: () => set({ 
    statusFilter: 'unresolved',
    searchQuery: '',
    selectedIssueId: null,
    selectedEventId: null,
  }),
  
  // Clear selection
  clearSelection: () => set({
    selectedIssueId: null,
    selectedEventId: null,
  }),
}));

export default useAppStore;