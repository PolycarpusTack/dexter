import { useCallback, useEffect, useRef } from 'react';
import telemetry, { 
  InteractionCategory,
  ErrorCategory,
  EventSeverity,
  PerformanceMetricType,
  TelemetryEvent
} from '../services/telemetry';

/**
 * Hook for using the telemetry service in components
 */
export function useTelemetry(componentName?: string) {
  // Store component render start time
  const renderStart = useRef<number>(performance.now());
  
  // Track component mount time
  useEffect(() => {
    const endTime = performance.now();
    if (componentName) {
      telemetry.trackRender(componentName, endTime - renderStart.current);
      
      // Track component lifecycle
      telemetry.trackLifecycle({
        name: `${componentName} mounted`,
        phase: 'mount',
        status: 'complete',
        duration: endTime - renderStart.current,
        component: componentName
      });
    }
    
    // Track unmount
    return () => {
      if (componentName) {
        telemetry.trackLifecycle({
          name: `${componentName} unmounted`,
          phase: 'unmount',
          status: 'complete',
          component: componentName
        });
      }
    };
  }, [componentName]);
  
  /**
   * Track a user interaction
   */
  const trackInteraction = useCallback((
    name: string,
    category: InteractionCategory,
    details?: Record<string, any>
  ) => {
    telemetry.trackInteraction({
      name,
      category,
      component: componentName,
      details
    });
  }, [componentName]);
  
  /**
   * Track a button click
   */
  const trackClick = useCallback((
    buttonName: string,
    details?: Record<string, any>
  ) => {
    telemetry.trackInteraction({
      name: `${buttonName} clicked`,
      category: 'click',
      component: componentName,
      details
    });
  }, [componentName]);
  
  /**
   * Track a form submission
   */
  const trackFormSubmit = useCallback((
    formName: string,
    details?: Record<string, any>
  ) => {
    telemetry.trackInteraction({
      name: `${formName} submitted`,
      category: 'form',
      component: componentName,
      details
    });
  }, [componentName]);
  
  /**
   * Track an input change
   */
  const trackInputChange = useCallback((
    inputName: string,
    details?: Record<string, any>
  ) => {
    telemetry.trackInteraction({
      name: `${inputName} changed`,
      category: 'input',
      component: componentName,
      details
    });
  }, [componentName]);
  
  /**
   * Track a selection change
   */
  const trackSelection = useCallback((
    selectionName: string,
    value: string | number | boolean,
    details?: Record<string, any>
  ) => {
    telemetry.trackInteraction({
      name: `${selectionName} selected`,
      category: 'selection',
      component: componentName,
      value,
      details
    });
  }, [componentName]);
  
  /**
   * Track an error
   */
  const trackError = useCallback((
    message: string,
    category: ErrorCategory = 'unknown',
    severity: EventSeverity = 'error',
    details?: Record<string, any>
  ) => {
    telemetry.trackError({
      name: `${componentName || 'App'} error`,
      message,
      category,
      severity,
      component: componentName,
      details
    });
  }, [componentName]);
  
  /**
   * Track a performance metric
   */
  const trackPerformance = useCallback((
    name: string,
    metricValue: number,
    metricType: PerformanceMetricType = 'custom_measurement',
    metricUnit: 'ms' | 'bytes' | 'count' | 'percent' | 'score' = 'ms'
  ) => {
    telemetry.trackPerformance({
      name,
      metricType,
      metricValue,
      metricUnit,
      component: componentName
    });
  }, [componentName]);
  
  /**
   * Measure the execution time of a function
   */
  const measure = useCallback(<T>(
    name: string,
    fn: () => T,
    metricType: PerformanceMetricType = 'custom_measurement'
  ): T => {
    return telemetry.measure(
      componentName ? `${componentName} - ${name}` : name,
      fn,
      metricType
    );
  }, [componentName]);
  
  /**
   * Start measuring a performance period
   */
  const startMeasurement = useCallback((
    name: string,
    metricType: PerformanceMetricType = 'custom_measurement'
  ): () => void => {
    return telemetry.startMeasurement(
      componentName ? `${componentName} - ${name}` : name,
      metricType
    );
  }, [componentName]);
  
  /**
   * Track an API call
   */
  const trackApiCall = useCallback((
    endpoint: string,
    method: string,
    duration: number,
    status?: number,
    success?: boolean
  ) => {
    telemetry.trackApiCall(endpoint, method, duration, status, success);
  }, []);
  
  /**
   * Create a render performance hook for measuring component render time
   */
  const createRenderHook = useCallback(() => {
    return telemetry.createRenderHook(componentName || 'Unknown Component');
  }, [componentName]);
  
  /**
   * Subscribe to telemetry events
   */
  const subscribe = useCallback((
    eventType: 'user_interaction' | 'error' | 'performance' | 'lifecycle' | 'navigation' | 'resource' | 'custom' | 'all',
    callback: (event: TelemetryEvent) => void
  ): string => {
    return telemetry.subscribe(eventType, callback);
  }, []);
  
  /**
   * Unsubscribe from telemetry events
   */
  const unsubscribe = useCallback((subscriptionId: string) => {
    telemetry.unsubscribe(subscriptionId);
  }, []);
  
  return {
    trackInteraction,
    trackClick,
    trackFormSubmit,
    trackInputChange,
    trackSelection,
    trackError,
    trackPerformance,
    measure,
    startMeasurement,
    trackApiCall,
    createRenderHook,
    subscribe,
    unsubscribe
  };
}

export default useTelemetry;