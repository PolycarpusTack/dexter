/**
 * Keyboard Store
 * Manages keyboard shortcut preferences and custom mappings
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface KeyboardState {
  // Preferences
  enabled: boolean;
  customShortcuts: Record<string, string>;
  
  // Actions
  setEnabled: (enabled: boolean) => void;
  setCustomShortcut: (action: string, shortcut: string) => void;
  removeCustomShortcut: (action: string) => void;
  resetCustomShortcuts: () => void;
  getShortcut: (action: string) => string | undefined;
}

const useKeyboardStore = create<KeyboardState>()(
  persist(
    (set, get) => ({
      // Initial state
      enabled: true,
      customShortcuts: {},
      
      // Actions
      setEnabled: (enabled) => 
        set({ enabled }),
      
      setCustomShortcut: (action, shortcut) => 
        set((state) => ({
          customShortcuts: {
            ...state.customShortcuts,
            [action]: shortcut
          }
        })),
      
      removeCustomShortcut: (action) => 
        set((state) => {
          const { [action]: _, ...rest } = state.customShortcuts;
          return { customShortcuts: rest };
        }),
      
      resetCustomShortcuts: () => 
        set({ customShortcuts: {} }),
        
      getShortcut: (action) => 
        get().customShortcuts[action]
    }),
    {
      name: 'dexter-keyboard',
      storage: createJSONStorage(() => localStorage)
    }
  )
);

export default useKeyboardStore;