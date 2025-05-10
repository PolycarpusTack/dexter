// File: src/store/appStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
    /** Show raw event data */
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
  /** Reset all settings to defaults */
  resetSettings: () => void;
}

// Default settings
const DEFAULT_SETTINGS = {
  organizationSlug: null,
  projectSlug: null,
  organizationId: null,
  projectId: null,
  selectedIssueId: null,
  selectedEventId: null,
  statusFilter: '',
  searchQuery: '',
  activeAIModel: 'mistral:latest',
  darkMode: false,
  userId: null,
  apiToken: null,
  displayPreferences: {
    expandedStackTraces: false,
    showContext: true,
    showRawData: false,
    defaultMasking: true
  },
  keyboard: {
    enabled: true,
    customShortcuts: {}
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
        set({ organizationSlug, projectSlug }),
      
      setSelectedIssue: (issueId: string | null, eventId?: string | null) => 
        set({ selectedIssueId: issueId, selectedEventId: eventId || null }),
      
      setActiveAIModel: (model: string) => set({ activeAIModel: model }),
      
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
      
      resetSettings: () => set(DEFAULT_SETTINGS)
    }),
    {
      name: 'dexter-settings',
      storage: createJSONStorage(() => localStorage)
    }
  )
);

export default useAppStore;
