import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';

const ONBOARDING_COMPLETED_KEY = 'dexter_onboarding_completed';
const ONBOARDING_DISMISSED_KEY = 'dexter_onboarding_dismissed';

interface UseOnboardingReturn {
  shouldShowOnboarding: boolean;
  showOnboarding: () => void;
  hideOnboarding: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

export function useOnboarding(): UseOnboardingReturn {
  const { organizationSlug, projectSlug } = useAuthStore();
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Check if onboarding has been completed or dismissed
    const isCompleted = localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
    const isDismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY) === 'true';
    
    // Show onboarding if:
    // 1. It hasn't been completed
    // 2. It hasn't been dismissed
    // 3. No configuration exists (first-time user)
    if (!isCompleted && !isDismissed && (!organizationSlug || !projectSlug)) {
      setShouldShow(true);
    }
  }, [organizationSlug, projectSlug]);

  const showOnboarding = () => {
    setShouldShow(true);
    localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
  };

  const hideOnboarding = () => {
    setShouldShow(false);
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
  };

  const completeOnboarding = () => {
    setShouldShow(false);
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
    localStorage.removeItem('dexter_onboarding_state');
    setShouldShow(true);
  };

  return {
    shouldShowOnboarding: shouldShow,
    showOnboarding,
    hideOnboarding,
    completeOnboarding,
    resetOnboarding
  };
}

export default useOnboarding;