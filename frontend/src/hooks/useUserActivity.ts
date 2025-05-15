import { useCallback, useEffect, useRef } from 'react';
import userActivityTracker, {
  ActivityType,
  FeatureCategory,
  TrackActivityOptions
} from '../services/userActivityTracker';

export interface UseUserActivityOptions {
  /**
   * Component name for tracking context
   */
  component?: string;
  
  /**
   * Feature ID for tracking
   */
  featureId?: string;
  
  /**
   * Feature category
   */
  category?: FeatureCategory;
  
  /**
   * Whether to automatically track component mount/unmount
   */
  trackLifecycle?: boolean;
  
  /**
   * Whether to automatically track time spent in the component
   */
  trackTimeSpent?: boolean;
  
  /**
   * Additional metadata to include with all tracked activities
   */
  metadata?: Record<string, any>;
}

/**
 * Hook for tracking user activity within a component
 */
export function useUserActivity(options: UseUserActivityOptions = {}) {
  const {
    component,
    featureId,
    category = FeatureCategory.CORE,
    trackLifecycle = true,
    trackTimeSpent = true,
    metadata = {}
  } = options;
  
  // Use refs to store component information
  const mountTimeRef = useRef<number>(0);
  const featureIdRef = useRef<string>(featureId || component || 'unknown');
  
  /**
   * Track a user activity
   */
  const trackActivity = useCallback((
    name: string,
    activityOptions: Partial<TrackActivityOptions> = {}
  ) => {
    userActivityTracker.trackActivity(name, {
      component,
      feature: featureIdRef.current,
      category,
      metadata: {
        ...metadata,
        ...activityOptions.metadata
      },
      ...activityOptions
    });
  }, [component, category, metadata]);
  
  /**
   * Track a view
   */
  const trackView = useCallback((
    viewName: string,
    activityOptions: Partial<TrackActivityOptions> = {}
  ) => {
    trackActivity(viewName, {
      type: ActivityType.VIEW,
      ...activityOptions
    });
  }, [trackActivity]);
  
  /**
   * Track a button click
   */
  const trackClick = useCallback((
    buttonName: string,
    activityOptions: Partial<TrackActivityOptions> = {}
  ) => {
    trackActivity(`${buttonName}_clicked`, {
      type: ActivityType.INTERACTION,
      action: 'click',
      ...activityOptions
    });
  }, [trackActivity]);
  
  /**
   * Track a form submission
   */
  const trackFormSubmit = useCallback((
    formName: string,
    formData?: Record<string, any>,
    activityOptions: Partial<TrackActivityOptions> = {}
  ) => {
    trackActivity(`${formName}_submitted`, {
      type: ActivityType.INTERACTION,
      action: 'submit',
      details: formData,
      ...activityOptions
    });
  }, [trackActivity]);
  
  /**
   * Track a search action
   */
  const trackSearch = useCallback((
    searchTerm: string,
    activityOptions: Partial<TrackActivityOptions> = {}
  ) => {
    trackActivity('search', {
      type: ActivityType.SEARCH,
      value: searchTerm,
      ...activityOptions
    });
  }, [trackActivity]);
  
  /**
   * Track a filter action
   */
  const trackFilter = useCallback((
    filterCriteria: Record<string, any>,
    activityOptions: Partial<TrackActivityOptions> = {}
  ) => {
    trackActivity('filter', {
      type: ActivityType.FILTER,
      details: filterCriteria,
      ...activityOptions
    });
  }, [trackActivity]);
  
  /**
   * Track a sort action
   */
  const trackSort = useCallback((
    sortField: string,
    sortDirection: 'asc' | 'desc',
    activityOptions: Partial<TrackActivityOptions> = {}
  ) => {
    trackActivity('sort', {
      type: ActivityType.SORT,
      details: {
        field: sortField,
        direction: sortDirection
      },
      ...activityOptions
    });
  }, [trackActivity]);
  
  /**
   * Track a navigation action
   */
  const trackNavigation = useCallback((
    from: string,
    to: string,
    activityOptions: Partial<TrackActivityOptions> = {}
  ) => {
    trackActivity('navigation', {
      type: ActivityType.NAVIGATION,
      source: from,
      target: to,
      ...activityOptions
    });
  }, [trackActivity]);
  
  /**
   * Track an export action
   */
  const trackExport = useCallback((
    exportType: string,
    activityOptions: Partial<TrackActivityOptions> = {}
  ) => {
    trackActivity('export', {
      type: ActivityType.EXPORT,
      value: exportType,
      ...activityOptions
    });
  }, [trackActivity]);
  
  /**
   * Track an error
   */
  const trackError = useCallback((
    errorMessage: string,
    errorDetails?: Record<string, any>,
    activityOptions: Partial<TrackActivityOptions> = {}
  ) => {
    trackActivity('error', {
      type: ActivityType.ERROR,
      details: {
        message: errorMessage,
        ...errorDetails
      },
      result: 'failure',
      ...activityOptions
    });
  }, [trackActivity]);
  
  /**
   * Start timing a feature or action
   */
  const startTimer = useCallback((
    activityName?: string
  ) => {
    const timerName = activityName || featureIdRef.current;
    userActivityTracker.startFeatureTimer(timerName);
    
    // Return function to stop timer
    return () => {
      userActivityTracker.stopFeatureTimer(timerName, {
        component,
        feature: featureIdRef.current,
        category
      });
    };
  }, [component, category]);
  
  /**
   * Track component lifecycle
   */
  useEffect(() => {
    // Store mount time
    mountTimeRef.current = Date.now();
    
    // Track component mount
    if (trackLifecycle) {
      trackActivity('component_mounted', {
        type: ActivityType.LIFECYCLE,
        action: 'mount'
      });
    }
    
    // Start feature timer if tracking time spent
    const stopTimer = trackTimeSpent ? startTimer() : undefined;
    
    // Track component unmount
    return () => {
      // Stop timer if tracking time spent
      if (stopTimer) {
        stopTimer();
      } else if (trackLifecycle) {
        // Calculate time spent manually if not using timer
        const timeSpent = Date.now() - mountTimeRef.current;
        
        trackActivity('component_unmounted', {
          type: ActivityType.LIFECYCLE,
          action: 'unmount',
          duration: timeSpent
        });
      }
    };
  }, [trackLifecycle, trackTimeSpent, trackActivity, startTimer]);
  
  return {
    trackActivity,
    trackView,
    trackClick,
    trackFormSubmit,
    trackSearch,
    trackFilter,
    trackSort,
    trackNavigation,
    trackExport,
    trackError,
    startTimer,
    
    // Export types for convenience
    ActivityType,
    FeatureCategory
  };
}

export default useUserActivity;