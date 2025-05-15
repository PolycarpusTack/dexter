import React, { useEffect } from 'react';
import { Portal } from '@mantine/core';
import type { Tour as TourType } from '../../hooks/useTour';
import useTour from '../../hooks/useTour';
import TourStep from './TourStep';
import useAnnouncer from '../../hooks/useAnnouncer';

interface GuidedTourProps {
  /**
   * Tour configuration
   */
  tour: TourType;
  
  /**
   * Whether to start the tour automatically
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
   * Delay in ms before starting tour
   */
  startDelay?: number;
  
  /**
   * Custom key for persistent storage
   */
  storageKey?: string;
  
  /**
   * Optional custom render function for tooltip content
   */
  renderStepContent?: (step: TourType['steps'][0]) => React.ReactNode;
  
  /**
   * Z-index for the tour elements
   */
  zIndex?: number;
  
  /**
   * Callback when tour is completed
   */
  onComplete?: () => void;
  
  /**
   * Callback when tour is started
   */
  onStart?: () => void;
  
  /**
   * Callback when tour is stopped
   */
  onStop?: () => void;
  
  /**
   * Callback when tour is dismissed
   */
  onDismiss?: () => void;
}

/**
 * Guided Tour component that manages step-by-step user guidance
 */
const GuidedTour: React.FC<GuidedTourProps> = ({
  tour,
  autoStart = false,
  persistent = true,
  showCompleted = false,
  startDelay = 500,
  storageKey,
  renderStepContent,
  zIndex = 1000,
  onComplete,
  onStart,
  onStop,
  onDismiss
}) => {
  const {
    isActive,
    currentStep,
    currentStepIndex,
    steps,
    isLastStep,
    isFirstStep,
    startTour,
    stopTour,
    dismissTour,
    nextStep,
    prevStep,
  } = useTour(tour, {
    autoStart,
    persistent,
    showCompleted,
    startDelay,
    storageKey
  });
  
  const { announceStatus } = useAnnouncer();
  
  // Handle tour completion
  const handleNext = () => {
    if (isLastStep) {
      stopTour(true);
      announceStatus('Tour completed');
      onComplete?.();
    } else {
      nextStep();
    }
  };
  
  // Handle tour stop
  const handleClose = () => {
    dismissTour();
    announceStatus('Tour dismissed');
    onDismiss?.();
  };
  
  // Call onStart when tour becomes active
  useEffect(() => {
    if (isActive) {
      onStart?.();
      announceStatus(`Starting guided tour: ${tour.name}`);
    } else {
      onStop?.();
    }
  }, [isActive, onStart, onStop, tour.name, announceStatus]);
  
  // Don't render anything if tour is not active
  if (!isActive || !currentStep) {
    return null;
  }
  
  return (
    <Portal>
      <TourStep
        step={currentStep}
        currentIndex={currentStepIndex}
        totalSteps={steps.length}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        onNext={handleNext}
        onPrev={prevStep}
        onClose={handleClose}
        renderContent={renderStepContent}
        zIndex={zIndex}
      />
    </Portal>
  );
};

export default GuidedTour;