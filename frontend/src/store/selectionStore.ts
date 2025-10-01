/**
 * Selection Store
 * Manages current selection state for issues and events
 */
import { create } from 'zustand';

interface SelectionState {
  // Selected items
  selectedIssueId: string | null;
  selectedEventId: string | null;
  
  // Event cache for quick access
  latestEventsByIssue: Record<string, string>;
  
  // Actions
  setSelectedIssue: (issueId: string | null, eventId?: string | null) => void;
  storeLatestEventId: (issueId: string, eventId: string) => void;
  clearSelection: () => void;
  getLatestEventId: (issueId: string) => string | undefined;
}

const useSelectionStore = create<SelectionState>((set, get) => ({
  // Initial state
  selectedIssueId: null,
  selectedEventId: null,
  latestEventsByIssue: {},
  
  // Actions
  setSelectedIssue: (issueId, eventId) => 
    set((state) => {
      // If no eventId provided, try to get it from stored latest events
      const resolvedEventId = eventId || (issueId ? state.latestEventsByIssue[issueId] : null);
      
      return { 
        selectedIssueId: issueId, 
        selectedEventId: resolvedEventId || null 
      };
    }),
  
  storeLatestEventId: (issueId, eventId) => 
    set((state) => ({
      latestEventsByIssue: {
        ...state.latestEventsByIssue,
        [issueId]: eventId,
      }
    })),
  
  clearSelection: () => 
    set({ 
      selectedIssueId: null, 
      selectedEventId: null 
    }),
    
  getLatestEventId: (issueId) => 
    get().latestEventsByIssue[issueId]
}));

export default useSelectionStore;