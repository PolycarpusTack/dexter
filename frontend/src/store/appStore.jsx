// File: frontend/src/store/appStore.js (Refactored for TanStack Query)

import { create } from 'zustand';
// No API calls needed here anymore for data fetching

const useAppStore = create((set, get) => ({
  // --- Configuration & Status (Managed via useQuery/useMutation now, but keep slugs) ---
  organizationSlug: null, // Still useful to hold the selected value
  projectSlug: null,      // Still useful to hold the selected value
  // backendStatus: null, // Fetched via useQuery
  // isLoadingConfig: false, // Handled by useQuery
  // errorConfig: null, // Handled by useQuery
  // isUpdatingConfig: false, // Handled by useMutation

  // --- UI State / Filters ---
  issueStatusFilter: 'unresolved', // Keep filter state
  issueSearchTerm: '',           // Keep filter state
  selectedIssueId: null,         // Store ID of the selected issue
  selectedEventId: null,         // Store ID of the event to view details for

  // --- Remove Data & Loading/Error States ---
  // issues: [], // Handled by useQuery('issuesList', ...)
  // issuesNextCursor: null, // Handled by useInfiniteQuery or passed via query data
  // issuesPrevCursor: null, // Handled by useInfiniteQuery or passed via query data
  // isLoadingIssues: false, // Handled by useQuery
  // selectedEventDetails: null, // Handled by useQuery('eventDetail', ...)
  // parsedDeadlockInfo: null, // Derived from eventDetail query data
  // isLoadingDetails: false, // Handled by useQuery
  // aiExplanation: null, // Handled by useMutation or local component state
  // isLoadingExplanation: false, // Handled by useMutation
  // isUpdatingStatus: false, // Handled by useMutation

  // --- Actions ---

  // Actions to set config slugs (still needed for other components to read)
  setConfig: ({ organization_slug, project_slug }) => {
      set({ organizationSlug: organization_slug, projectSlug: project_slug });
  },

  // Actions to set filters
  setIssueStatusFilter: (status) => {
    set({
        issueStatusFilter: status,
        issueSearchTerm: '', // Reset search on status change
        selectedIssueId: null, // Reset selection when filters change
        selectedEventId: null,
    });
    // Fetching is now handled by components observing these state changes
    // and TanStack Query refetching based on query key changes.
  },

  setIssueSearchTerm: (term) => {
      set({ issueSearchTerm: term });
      // Fetching can be triggered by components based on this change
      // (e.g., when an "Apply" button is clicked)
  },

  // Action to set the selected issue/event for detail view
  setSelectedIssue: (issueId, eventId = null) => {
      // When selecting an issue from the table, we might need its latest event ID.
      // The API `getIssues` doesn't easily provide this.
      // Simplification: Assume the table provides the event ID we want to view,
      // or we derive it somehow (e.g., from issue.latestEvent.id if backend adds it).
      // Let's store both issueId and a potentially derived eventId.
      set({ selectedIssueId: issueId, selectedEventId: eventId });
  },

  clearSelection: () => {
      set({ selectedIssueId: null, selectedEventId: null });
  },

  // Data fetching actions (fetchIssues, selectAndFetchEvent, fetchExplanation, fetchStatus, fetchConfig) are REMOVED.
  // Mutation action (updateIssueStatus) is REMOVED - useMutation hook used instead.

}));

export default useAppStore;