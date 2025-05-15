import { useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from '@mantine/hooks';

export interface TourStep {
  /**
   * Unique identifier for the tour step
   */
  id: string;
  
  /**
   * Element selector to highlight (CSS selector)
   */
  selector: string;
  
  /**
   * Title of the tour step
   */
  title: string;
  
  /**
   * Content of the tour step
   */
  content: string;
  
  /**
   * Position of the tooltip (optional)
   */
  position?: 'top' | 'right' | 'bottom' | 'left' | 'center';
  
  /**
   * Whether this step is required or can be skipped (optional)
   */
  required?: boolean;
  
  /**
   * Function to check if this step should be shown (optional)
   */
  shouldShow?: () => boolean;
  
  /**
   * Callback to execute before showing this step (optional)
   */
  onBeforeShow?: () => void | Promise<void>;
  
  /**
   * Callback to execute after completing this step (optional)
   */
  onComplete?: () => void | Promise<void>;
}

export interface Tour {
  /**
   * Unique identifier for the tour
   */
  id: string;
  
  /**
   * Display name of the tour
   */
  name: string;
  
  /**
   * Description of the tour
   */
  description?: string;
  
  /**
   * Array of tour steps
   */
  steps: TourStep[];
  
  /**
   * Whether the tour has been completed before
   */
  completed?: boolean;
  
  /**
   * Whether the tour should show again even if completed
   */
  showAgain?: boolean;
  
  /**
   * Number of times the tour has been completed
   */
  completionCount?: number;
  
  /**
   * Whether the tour is required
   */
  required?: boolean;
}

export interface TourStorage {
  /**
   * Map of tour ID to completion data
   */
  tours: Record<string, {
    completed: boolean;
    completedAt: string | null;
    completionCount: number;
    currentStep: number;
    dismissed: boolean;
  }>;
  
  /**
   * Whether guided tours are enabled globally
   */
  enabled: boolean;
}

export interface TourOptions {
  /**
   * Whether to start the tour immediately
   */
  autoStart?: boolean;
  
  /**
   * Whether to save tour progress
   */
  persistent?: boolean;
  
  /**
   * Whether to show tour again if completed
   */
  showCompleted?: boolean;
  
  /**
   * Default key for persistent storage
   */
  storageKey?: string;
  
  /**
   * Delay in ms before starting tour
   */
  startDelay?: number;
}

const defaultOptions: TourOptions = {
  autoStart: false,
  persistent: true,
  showCompleted: false,
  storageKey: 'dexter-guided-tours',
  startDelay: 500
};

const defaultTourStorage: TourStorage = {
  tours: {},
  enabled: true
};

/**
 * Hook for managing guided tours
 * 
 * Provides state and handlers for step-by-step user guidance
 */
export function useTour(
  tour: Tour,
  options: TourOptions = {}
) {
  // Merge options with defaults
  const config = { ...defaultOptions, ...options };
  
  // Local state for tour
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>([]);
  
  // Persistent storage for tour progress
  const [tourStorage, setTourStorage] = useLocalStorage<TourStorage>({
    key: config.storageKey || 'dexter-guided-tours',
    defaultValue: defaultTourStorage
  });
  
  // Get tour data from storage
  const tourData = tourStorage.tours[tour.id] || {
    completed: false,
    completedAt: null,
    completionCount: 0,
    currentStep: 0,
    dismissed: false
  };
  
  // Filter steps based on shouldShow condition
  useEffect(() => {
    const filteredSteps = tour.steps.filter(step => {
      if (typeof step.shouldShow === 'function') {
        return step.shouldShow();
      }
      return true;
    });
    
    setSteps(filteredSteps);
  }, [tour.steps]);
  
  // Auto-start tour if configured
  useEffect(() => {
    if (config.autoStart && tourStorage.enabled) {
      // Don't auto-start if already completed and showCompleted is false
      if (tourData.completed && !config.showCompleted && !tour.showAgain) {
        return;
      }
      
      // Don't auto-start if dismissed
      if (tourData.dismissed) {
        return;
      }
      
      // Start with delay
      const timer = setTimeout(() => {
        setIsActive(true);
        setCurrentStepIndex(tourData.currentStep || 0);
      }, config.startDelay);
      
      return () => clearTimeout(timer);
    }
  }, [config.autoStart, tourData, config.showCompleted, tour.showAgain, config.startDelay, tourStorage.enabled]);
  
  /**
   * Start the tour from the beginning or saved position
   */
  const startTour = useCallback(() => {
    if (steps.length === 0) return;
    
    setIsActive(true);
    setCurrentStepIndex(tourData.currentStep || 0);
    
    // Execute onBeforeShow callback if present
    const currentStep = steps[tourData.currentStep || 0];
    if (currentStep?.onBeforeShow) {
      currentStep.onBeforeShow();
    }
  }, [steps, tourData.currentStep]);
  
  /**
   * Stop the tour and optionally mark as completed
   */
  const stopTour = useCallback((completed = false) => {
    setIsActive(false);
    
    if (completed) {
      // Mark tour as completed
      setTourStorage(prev => ({
        ...prev,
        tours: {
          ...prev.tours,
          [tour.id]: {
            ...tourData,
            completed: true,
            completedAt: new Date().toISOString(),
            completionCount: (tourData.completionCount || 0) + 1,
            currentStep: 0
          }
        }
      }));
    } else {
      // Just save current position
      setTourStorage(prev => ({
        ...prev,
        tours: {
          ...prev.tours,
          [tour.id]: {
            ...tourData,
            currentStep
          }
        }
      }));
    }
  }, [setTourStorage, tour.id, tourData, currentStepIndex]);
  
  /**
   * Dismiss the tour without completing
   */
  const dismissTour = useCallback(() => {
    setIsActive(false);
    
    setTourStorage(prev => ({
      ...prev,
      tours: {
        ...prev.tours,
        [tour.id]: {
          ...tourData,
          dismissed: true,
          currentStep: 0
        }
      }
    }));
  }, [setTourStorage, tour.id, tourData]);
  
  /**
   * Move to the next step in the tour
   */
  const nextStep = useCallback(async () => {
    if (!isActive || currentStepIndex >= steps.length - 1) {
      // Complete tour if at last step
      if (isActive && currentStepIndex === steps.length - 1) {
        // Execute onComplete callback if present
        const currentStep = steps[currentStepIndex];
        if (currentStep?.onComplete) {
          await currentStep.onComplete();
        }
        
        stopTour(true);
      }
      return;
    }
    
    // Execute onComplete callback for current step if present
    const currentStep = steps[currentStepIndex];
    if (currentStep?.onComplete) {
      await currentStep.onComplete();
    }
    
    const nextIndex = currentStepIndex + 1;
    setCurrentStepIndex(nextIndex);
    
    // Execute onBeforeShow callback for next step if present
    const nextStep = steps[nextIndex];
    if (nextStep?.onBeforeShow) {
      await nextStep.onBeforeShow();
    }
    
    // Save progress if persistent
    if (config.persistent) {
      setTourStorage(prev => ({
        ...prev,
        tours: {
          ...prev.tours,
          [tour.id]: {
            ...tourData,
            currentStep: nextIndex
          }
        }
      }));
    }
  }, [isActive, currentStepIndex, steps, stopTour, config.persistent, setTourStorage, tour.id, tourData]);
  
  /**
   * Move to the previous step in the tour
   */
  const prevStep = useCallback(async () => {
    if (!isActive || currentStepIndex <= 0) return;
    
    const prevIndex = currentStepIndex - 1;
    setCurrentStepIndex(prevIndex);
    
    // Execute onBeforeShow callback for previous step if present
    const prevStepObj = steps[prevIndex];
    if (prevStepObj?.onBeforeShow) {
      await prevStepObj.onBeforeShow();
    }
    
    // Save progress if persistent
    if (config.persistent) {
      setTourStorage(prev => ({
        ...prev,
        tours: {
          ...prev.tours,
          [tour.id]: {
            ...tourData,
            currentStep: prevIndex
          }
        }
      }));
    }
  }, [isActive, currentStepIndex, steps, config.persistent, setTourStorage, tour.id, tourData]);
  
  /**
   * Reset tour progress
   */
  const resetTour = useCallback(() => {
    setCurrentStepIndex(0);
    
    setTourStorage(prev => ({
      ...prev,
      tours: {
        ...prev.tours,
        [tour.id]: {
          ...tourData,
          currentStep: 0,
          dismissed: false
        }
      }
    }));
  }, [setTourStorage, tour.id, tourData]);
  
  /**
   * Skip to a specific step
   */
  const goToStep = useCallback(async (stepIndex: number) => {
    if (!isActive || stepIndex < 0 || stepIndex >= steps.length) return;
    
    setCurrentStepIndex(stepIndex);
    
    // Execute onBeforeShow callback for the step if present
    const stepObj = steps[stepIndex];
    if (stepObj?.onBeforeShow) {
      await stepObj.onBeforeShow();
    }
    
    // Save progress if persistent
    if (config.persistent) {
      setTourStorage(prev => ({
        ...prev,
        tours: {
          ...prev.tours,
          [tour.id]: {
            ...tourData,
            currentStep: stepIndex
          }
        }
      }));
    }
  }, [isActive, steps, config.persistent, setTourStorage, tour.id, tourData]);
  
  /**
   * Enable or disable tours globally
   */
  const setToursEnabled = useCallback((enabled: boolean) => {
    setTourStorage(prev => ({
      ...prev,
      enabled
    }));
    
    if (!enabled && isActive) {
      setIsActive(false);
    }
  }, [setTourStorage, isActive]);
  
  const currentStep = steps[currentStepIndex] || null;
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;
  
  return {
    // State
    isActive,
    currentStep,
    currentStepIndex,
    steps,
    isLastStep,
    isFirstStep,
    isCompleted: tourData.completed,
    completionCount: tourData.completionCount || 0,
    isDismissed: tourData.dismissed,
    toursEnabled: tourStorage.enabled,
    
    // Actions
    startTour,
    stopTour,
    dismissTour,
    nextStep,
    prevStep,
    resetTour,
    goToStep,
    setToursEnabled
  };
}

export default useTour;