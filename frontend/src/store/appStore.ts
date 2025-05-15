// File: src/store/appStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PromptEngineeringLevel } from '../context/PromptEngineeringContext';

/**
 * Interface for app store state
 */
interface AppState {
  // Organization and project
  organizationSlug: string | null;
  projectSlug: string | null;
  organizationId: string | null;
  projectId: string | null;
  
  // Selection state
  selectedIssueId: string | null;
  selectedEventId: string | null;
  
  // Filter state
  statusFilter: string;
  searchQuery: string;
  
  // Events to support "latest event" fetching when needed
  latestEventsByIssue: Record<string, string>;
  
  /** Active AI model for explanations */
  activeAIModel: string | null;
  /** Theme mode */
  darkMode: boolean;
  /** User ID */
  userId: string | null;
  /** API token */
  apiToken: string | null;
  /** Display preferences */
  displayPreferences: {
    /** Show expanded stack traces */
    expandedStackTraces: boolean;
    /** Show context data */
    showContext: boolean;
    /** Show raw data */
    showRawData: boolean;
    /** Default masking of sensitive data */
    defaultMasking: boolean;
  };
  /** User keyboard preferences */
  keyboard: {
    /** Use keyboard shortcuts */
    enabled: boolean;
    /** Custom keyboard shortcuts */
    customShortcuts: Record<string, string>;
  };
  /** Prompt engineering preferences */
  promptEngineeringPreferences?: {
    /** Context-aware prompting level */
    level: PromptEngineeringLevel;
    /** Debug mode for prompt development */
    debugMode: boolean;
  };
  
  // Actions
  /** Set organization and project */
  setOrgProject: (organizationSlug: string, projectSlug: string) => void;
  /** Set selected issue */
  setSelectedIssue: (issueId: string | null, eventId?: string | null) => void;
  /** Set active AI model */
  setActiveAIModel: (model: string) => void;
  /** Toggle theme mode */
  toggleDarkMode: () => void;
  /** Set dark mode */
  setDarkMode: (dark: boolean) => void;
  /** Set organization ID */
  setOrganizationId: (id: string | null) => void;
  /** Set project ID */
  setProjectId: (id: string | null) => void;
  /** Set user ID */
  setUserId: (id: string | null) => void;
  /** Set API token */
  setApiToken: (token: string | null) => void;
  /** Update display preference */
  updateDisplayPreference: <K extends keyof AppState['displayPreferences']>(
    key: K,
    value: AppState['displayPreferences'][K]
  ) => void;
  /** Update keyboard preference */
  updateKeyboardPreference: <K extends keyof AppState['keyboard']>(
    key: K,
    value: AppState['keyboard'][K]
  ) => void;
  /** Set custom keyboard shortcut */
  setCustomShortcut: (action: string, shortcut: string) => void;
  /** Set prompt engineering preferences */
  setPromptEngineeringPreferences: (preferences: AppState['promptEngineeringPreferences']) => void;
  /** Reset all settings to defaults */
  resetSettings: () => void;
  
  /** Store latest event ID for an issue (migrated from appStore.js) */
  storeLatestEventId: (issueId: string, eventId: string) => void;
  
  /** Set status filter (added for compatibility with old appStore.jsx) */
  setStatusFilter: (status: string) => void;
  
  /** Set search query (added for compatibility with old appStore.jsx) */
  setSearchQuery: (query: string) => void;
  
  /** Reset filters (migrated from appStore.js) */
  resetFilters: () => void;
  
  /** Set configuration (added for compatibility with old appStore.jsx) */
  setConfig: (config: { organization_slug: string, project_slug: string }) => void;
  
  /** Clear selection (added for compatibility with old appStore.jsx) */
  clearSelection: () => void;
}

// Default settings
const DEFAULT_SETTINGS = {
  organizationSlug: null,
  projectSlug: null,
  organizationId: null,
  projectId: null,
  selectedIssueId: null,
  selectedEventId: null,
  statusFilter: 'unresolved', // Updated default to match old stores
  searchQuery: '',
  activeAIModel: 'mistral:latest',
  darkMode: false,
  userId: null,
  apiToken: null,
  latestEventsByIssue: {}, // Added from appStore.js
  displayPreferences: {
    expandedStackTraces: false,
    showContext: true,
    showRawData: false,
    defaultMasking: true
  },
  keyboard: {
    enabled: true,
    customShortcuts: {}
  },
  promptEngineeringPreferences: {
    level: PromptEngineeringLevel.ENHANCED,
    debugMode: false
  }
};

/**
 * Zustand store for app state with persistence
 */
const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      
      setOrgProject: (organizationSlug: string, projectSlug: string) => 
        set({ 
          organizationSlug, 
          projectSlug,
          // Clear selections when changing project (behavior from appStore.js)
          selectedIssueId: null,
          selectedEventId: null,
        }),
      
      setSelectedIssue: (issueId: string | null, eventId?: string | null) => 
        set((state) => {
          // If no eventId provided, try to get it from stored latest events (from appStore.js)
          const resolvedEventId = eventId || (issueId ? state.latestEventsByIssue[issueId] : null);
          
          return { 
            selectedIssueId: issueId, 
            selectedEventId: resolvedEventId || null 
          };
        }),
      
      setActiveAIModel: (model: string) => {
        // Store in localStorage directly (behavior from appStore.js)
        if (model) localStorage.setItem('activeAIModel', model);
        return set({ activeAIModel: model });
      },
      
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
      
      setDarkMode: (dark: boolean) => set({ darkMode: dark }),
      
      setOrganizationId: (id: string | null) => set({ organizationId: id }),
      
      setProjectId: (id: string | null) => set({ projectId: id }),
      
      setUserId: (id: string | null) => set({ userId: id }),
      
      setApiToken: (token: string | null) => set({ apiToken: token }),
      
      updateDisplayPreference: (key, value) => set((state) => ({
        displayPreferences: {
          ...state.displayPreferences,
          [key]: value
        }
      })),
      
      updateKeyboardPreference: (key, value) => set((state) => ({
        keyboard: {
          ...state.keyboard,
          [key]: value
        }
      })),
      
      setCustomShortcut: (action, shortcut) => set((state) => ({
        keyboard: {
          ...state.keyboard,
          customShortcuts: {
            ...state.keyboard.customShortcuts,
            [action]: shortcut
          }
        }
      })),
      
      setPromptEngineeringPreferences: (preferences) => set({ 
        promptEngineeringPreferences: preferences 
      }),
      
      resetSettings: () => set(DEFAULT_SETTINGS),
      
      // Added from appStore.js
      storeLatestEventId: (issueId: string, eventId: string) => {
        set((state) => ({
          latestEventsByIssue: {
            ...state.latestEventsByIssue,
            [issueId]: eventId,
          }
        }));
      },
      
      // Added for compatibility with appStore.jsx
      setStatusFilter: (status: string) => set({
        statusFilter: status,
        searchQuery: '', // Reset search on status change
        selectedIssueId: null, // Reset selection when filters change
        selectedEventId: null,
      }),
      
      // Added for compatibility with appStore.jsx
      setSearchQuery: (query: string) => set({ searchQuery: query }),
      
      // Added from appStore.js
      resetFilters: () => set({ 
        statusFilter: 'unresolved',
        searchQuery: '' 
      }),
      
      // Added for compatibility with appStore.jsx
      setConfig: ({ organization_slug, project_slug }) => {
        set({ 
          organizationSlug: organization_slug, 
          projectSlug: project_slug 
        });
      },
      
      // Added for compatibility with appStore.jsx
      clearSelection: () => {
        set({ selectedIssueId: null, selectedEventId: null });
      },
    }),
    {
      name: 'dexter-settings',
      storage: createJSONStorage(() => localStorage)
    }
  )
);

export default useAppStore;