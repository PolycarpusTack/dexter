/**
 * Store Index
 * Exports all domain-specific stores and provides migration utilities
 */
import useAuthStore from './authStore';
import useUIStore from './uiStore';
import useSelectionStore from './selectionStore';
import useFilterStore from './filterStore';
import useKeyboardStore from './keyboardStore';
import useAIStore from './aiStore';
// Export individual stores
export {
  useAuthStore,
  useUIStore,
  useSelectionStore,
  useFilterStore,
  useKeyboardStore,
  useAIStore
};

// Export types if needed
export * from './types';

// Convenience hooks that combine multiple stores
export const useAuth = () => {
  const auth = useAuthStore();
  return {
    isAuthenticated: auth.isAuthenticated(),
    userId: auth.userId,
    apiToken: auth.apiToken,
    organizationSlug: auth.organizationSlug,
    projectSlug: auth.projectSlug,
    setOrgProject: auth.setOrgProject,
    clearAuth: auth.clearAuth
  };
};

export const useFiltersAndSelection = () => {
  const filters = useFilterStore();
  const selection = useSelectionStore();
  
  // When filters change, clear selection
  const setStatusFilter = (status: string) => {
    filters.setStatusFilter(status);
    selection.clearSelection();
  };
  
  return {
    // Filters
    statusFilter: filters.statusFilter,
    searchQuery: filters.searchQuery,
    setStatusFilter,
    setSearchQuery: filters.setSearchQuery,
    resetFilters: filters.resetFilters,
    
    // Selection
    selectedIssueId: selection.selectedIssueId,
    selectedEventId: selection.selectedEventId,
    setSelectedIssue: selection.setSelectedIssue,
    clearSelection: selection.clearSelection
  };
};

// Migration from appStore has been completed
// The appStore no longer exists and all components use individual domain stores

// Default export for backward compatibility
export default {
  useAuthStore,
  useUIStore,
  useSelectionStore,
  useFilterStore,
  useKeyboardStore,
  useAIStore
};