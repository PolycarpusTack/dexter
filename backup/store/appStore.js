// File: frontend/src/store/appStore.js

import { create } from 'zustand';

/**
 * Global application state store
 */
const useAppStore = create((set) => ({
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
  activeAIModel: localStorage.getItem('activeAIModel') || '', // Store selected model
  
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
      const resolvedEventId = eventId || state.latestEventsByIssue[issueId];
      
      console.log('Setting selected issue:', issueId, 'with event ID:', resolvedEventId);
      
      return {
        selectedIssueId: issueId,
        selectedEventId: resolvedEventId,
      };
    });
  },
  
  // Set status filter
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  
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
    searchQuery: '' 
  }),
}));

export default useAppStore;