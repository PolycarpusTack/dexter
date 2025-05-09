// File: src/store/appStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Interface for app store state
 */
interface AppState {
  /** Active AI model for explanations */
  activeAIModel: string | null;
  /** Theme mode */
  darkMode: boolean;
  /** Selected organization ID */
  organizationId: string | null;
  /** Selected project ID */
  projectId: string | null;
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
  activeAIModel: 'mistral:latest',
  darkMode: false,
  organizationId: null,
  projectId: null,
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
