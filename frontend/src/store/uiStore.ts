/**
 * UI Store
 * Manages UI preferences including theme, display settings, and layout preferences
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface DisplayPreferences {
  expandedStackTraces: boolean;
  showContext: boolean;
  showRawData: boolean;
  defaultMasking: boolean;
}

interface UIState {
  // Theme
  darkMode: boolean;
  
  // Display preferences
  displayPreferences: DisplayPreferences;
  
  // Actions
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
  updateDisplayPreference: <K extends keyof DisplayPreferences>(
    key: K,
    value: DisplayPreferences[K]
  ) => void;
  resetDisplayPreferences: () => void;
}

const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  expandedStackTraces: false,
  showContext: true,
  showRawData: false,
  defaultMasking: true
};

const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      darkMode: false,
      displayPreferences: DEFAULT_DISPLAY_PREFERENCES,
      
      // Actions
      toggleDarkMode: () => 
        set((state) => ({ darkMode: !state.darkMode })),
      
      setDarkMode: (dark) => 
        set({ darkMode: dark }),
      
      updateDisplayPreference: (key, value) => 
        set((state) => ({
          displayPreferences: {
            ...state.displayPreferences,
            [key]: value
          }
        })),
      
      resetDisplayPreferences: () => 
        set({ displayPreferences: DEFAULT_DISPLAY_PREFERENCES })
    }),
    {
      name: 'dexter-ui',
      storage: createJSONStorage(() => localStorage)
    }
  )
);

export default useUIStore;