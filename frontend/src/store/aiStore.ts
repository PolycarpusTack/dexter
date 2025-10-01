/**
 * AI Store
 * Manages AI-related preferences including model selection and prompt engineering settings
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PromptEngineeringLevel } from '../context/PromptEngineeringContext';

interface PromptEngineeringPreferences {
  level: PromptEngineeringLevel;
  debugMode: boolean;
}

interface AIState {
  // Model selection
  activeAIModel: string | null;
  
  // Prompt engineering preferences
  promptEngineeringPreferences: PromptEngineeringPreferences;
  
  // Actions
  setActiveAIModel: (model: string) => void;
  setPromptEngineeringPreferences: (preferences: PromptEngineeringPreferences) => void;
  updatePromptEngineeringLevel: (level: PromptEngineeringLevel) => void;
  toggleDebugMode: () => void;
}

const DEFAULT_AI_SETTINGS = {
  activeAIModel: 'mistral:latest',
  promptEngineeringPreferences: {
    level: PromptEngineeringLevel.ENHANCED,
    debugMode: false
  }
};

const useAIStore = create<AIState>()(
  persist(
    (set) => ({
      // Initial state
      ...DEFAULT_AI_SETTINGS,
      
      // Actions
      setActiveAIModel: (model) => {
        // Also store in localStorage for backward compatibility
        if (model) {
          localStorage.setItem('activeAIModel', model);
        }
        set({ activeAIModel: model });
      },
      
      setPromptEngineeringPreferences: (preferences) => 
        set({ promptEngineeringPreferences: preferences }),
      
      updatePromptEngineeringLevel: (level) => 
        set((state) => ({
          promptEngineeringPreferences: {
            ...state.promptEngineeringPreferences,
            level
          }
        })),
      
      toggleDebugMode: () => 
        set((state) => ({
          promptEngineeringPreferences: {
            ...state.promptEngineeringPreferences,
            debugMode: !state.promptEngineeringPreferences.debugMode
          }
        }))
    }),
    {
      name: 'dexter-ai',
      storage: createJSONStorage(() => localStorage)
    }
  )
);

export default useAIStore;