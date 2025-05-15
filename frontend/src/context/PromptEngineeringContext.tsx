// File: frontend/src/context/PromptEngineeringContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { EventDetails } from '../types/eventDetails';
import { createPromptBundle } from '../utils/promptEngineering';
import { createEnhancedPromptBundle } from '../utils/enhancedPromptEngineering';
import { analyzeErrorEnhanced, EnhancedErrorContext } from '../utils/enhancedErrorAnalytics';
import useAppStore from '../store/appStore';

/**
 * Levels of context-aware prompting
 */
export enum PromptEngineeringLevel {
  DISABLED = 'disabled',
  BASIC = 'basic',
  ENHANCED = 'enhanced'
}

/**
 * Prompt engineering state
 */
interface PromptEngineeringState {
  /** Current level of context-aware prompting */
  level: PromptEngineeringLevel;
  /** Enhanced error context (if available) */
  enhancedContext: EnhancedErrorContext | null;
  /** System prompt for the AI */
  systemPrompt: string;
  /** User prompt for the AI */
  userPrompt: string;
  /** Whether enhanced prompting mode is available */
  enhancedAvailable: boolean;
  /** Debug mode for showing prompts */
  debugMode: boolean;
}

/**
 * Prompt engineering context interface
 */
interface PromptEngineeringContextType extends PromptEngineeringState {
  /** Toggle between prompt engineering levels */
  setLevel: (level: PromptEngineeringLevel) => void;
  /** Generate prompts for an event */
  generatePrompts: (eventDetails: EventDetails) => void;
  /** Toggle debug mode */
  toggleDebugMode: () => void;
  /** Reset to default settings */
  resetToDefaults: () => void;
}

// Default context
const defaultContext: PromptEngineeringContextType = {
  level: PromptEngineeringLevel.ENHANCED,
  enhancedContext: null,
  systemPrompt: '',
  userPrompt: '',
  enhancedAvailable: true,
  debugMode: false,
  setLevel: () => {},
  generatePrompts: () => {},
  toggleDebugMode: () => {},
  resetToDefaults: () => {}
};

// Create context
const PromptEngineeringContext = createContext<PromptEngineeringContextType>(defaultContext);

/**
 * Hook to use prompt engineering context
 */
export const usePromptEngineering = () => useContext(PromptEngineeringContext);

/**
 * Provider component for prompt engineering context
 */
export const PromptEngineeringProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // Get user preferences from app store
  const { promptEngineeringPreferences, setPromptEngineeringPreferences } = useAppStore(state => ({
    promptEngineeringPreferences: state.promptEngineeringPreferences || {
      level: PromptEngineeringLevel.ENHANCED,
      debugMode: false
    },
    setPromptEngineeringPreferences: state.setPromptEngineeringPreferences
  }));

  // State
  const [level, setLevelState] = useState<PromptEngineeringLevel>(
    promptEngineeringPreferences.level || PromptEngineeringLevel.ENHANCED
  );
  const [enhancedContext, setEnhancedContext] = useState<EnhancedErrorContext | null>(null);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [enhancedAvailable, setEnhancedAvailable] = useState<boolean>(true);
  const [debugMode, setDebugMode] = useState<boolean>(
    promptEngineeringPreferences.debugMode || false
  );

  // Set level and update preferences
  const setLevel = useCallback((newLevel: PromptEngineeringLevel) => {
    setLevelState(newLevel);
    setPromptEngineeringPreferences({
      ...promptEngineeringPreferences,
      level: newLevel
    });
  }, [promptEngineeringPreferences, setPromptEngineeringPreferences]);

  // Toggle debug mode
  const toggleDebugMode = useCallback(() => {
    const newDebugMode = !debugMode;
    setDebugMode(newDebugMode);
    setPromptEngineeringPreferences({
      ...promptEngineeringPreferences,
      debugMode: newDebugMode
    });
  }, [debugMode, promptEngineeringPreferences, setPromptEngineeringPreferences]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    const defaults = {
      level: PromptEngineeringLevel.ENHANCED,
      debugMode: false
    };
    setLevelState(defaults.level);
    setDebugMode(defaults.debugMode);
    setPromptEngineeringPreferences(defaults);
  }, [setPromptEngineeringPreferences]);

  // Generate prompts based on the current level
  const generatePrompts = useCallback((eventDetails: EventDetails) => {
    if (!eventDetails) {
      return;
    }

    try {
      // Always analyze with enhanced analytics for context
      const enhancedErrorContext = analyzeErrorEnhanced(eventDetails);
      setEnhancedContext(enhancedErrorContext);

      // Generate prompts based on level
      if (level === PromptEngineeringLevel.ENHANCED) {
        const { systemPrompt, userPrompt } = createEnhancedPromptBundle(eventDetails);
        setSystemPrompt(systemPrompt);
        setUserPrompt(userPrompt);
      } else if (level === PromptEngineeringLevel.BASIC) {
        const { systemPrompt, userPrompt } = createPromptBundle(eventDetails);
        setSystemPrompt(systemPrompt);
        setUserPrompt(userPrompt);
      } else {
        // When disabled, use basic prompts but mark them as not used
        setSystemPrompt('');
        setUserPrompt('');
      }

      setEnhancedAvailable(true);
    } catch (error) {
      console.error("Error generating prompts:", error);
      setEnhancedAvailable(false);
      
      // Fallback to basic if enhanced fails
      if (level === PromptEngineeringLevel.ENHANCED) {
        try {
          const { systemPrompt, userPrompt } = createPromptBundle(eventDetails);
          setSystemPrompt(systemPrompt);
          setUserPrompt(userPrompt);
        } catch (basicError) {
          console.error("Error generating basic prompts:", basicError);
          setSystemPrompt('');
          setUserPrompt('');
        }
      }
    }
  }, [level]);

  // Effect to load preferences from app store on mount
  useEffect(() => {
    if (promptEngineeringPreferences) {
      setLevelState(promptEngineeringPreferences.level || PromptEngineeringLevel.ENHANCED);
      setDebugMode(promptEngineeringPreferences.debugMode || false);
    }
  }, [promptEngineeringPreferences]);

  // Context value
  const value: PromptEngineeringContextType = {
    level,
    enhancedContext,
    systemPrompt,
    userPrompt,
    enhancedAvailable,
    debugMode,
    setLevel,
    generatePrompts,
    toggleDebugMode,
    resetToDefaults
  };

  return (
    <PromptEngineeringContext.Provider value={value}>
      {children}
    </PromptEngineeringContext.Provider>
  );
};

export default PromptEngineeringContext;