/**
 * Filter Store
 * Manages filter state for issues and events
 */
import { create } from 'zustand';

interface FilterState {
  // Filters
  statusFilter: string;
  searchQuery: string;
  
  // Actions
  setStatusFilter: (status: string) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS = {
  statusFilter: 'unresolved',
  searchQuery: ''
};

const useFilterStore = create<FilterState>((set) => ({
  // Initial state
  ...DEFAULT_FILTERS,
  
  // Actions
  setStatusFilter: (status) => 
    set({
      statusFilter: status,
      searchQuery: '' // Reset search on status change
    }),
  
  setSearchQuery: (query) => 
    set({ searchQuery: query }),
  
  resetFilters: () => 
    set(DEFAULT_FILTERS)
}));

// Note: When filters change, selection should be cleared.
// This is handled by components that use both stores.

export default useFilterStore;