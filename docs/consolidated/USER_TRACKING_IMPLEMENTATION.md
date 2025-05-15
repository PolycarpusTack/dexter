# User Activity Tracking Implementation

**Date:** May 15, 2025  
**JIRA Epic:** DEXTER-330 (Observability Enhancements)  
**Story:** DEXTER-333 (Add user interaction tracking)

## Overview

This document details the implementation of user activity tracking for the Dexter application. The activity tracking system collects comprehensive data on user interactions, session information, feature usage, and navigation patterns to provide insights into how users are using the application and identify opportunities for improvement.

## Key Components

The user activity tracking implementation consists of the following key components:

### 1. User Activity Tracker Service

The core `UserActivityTracker` class (`userActivityTracker.ts`) is responsible for collecting, processing, and persisting user activity data. Key features include:

- **Session Management**:
  - Automatic session creation and renewal
  - Session timeout detection
  - Device and referrer tracking
  - Session persistence across page loads

- **Feature Usage Tracking**:
  - Interaction counts by feature
  - Time spent in features
  - Last used timestamps
  - Action-specific tracking

- **Path Flow Analysis**:
  - Navigation path tracking
  - Transition frequencies
  - Average time between pages
  - Entry and exit point analysis

- **Activity Categories**:
  - Views and page loads
  - User interactions (clicks, form submissions)
  - Navigation events
  - Search, filter, and sort operations
  - Error events and recoveries
  - Import/export actions

### 2. Integration Hook

The React hook `useUserActivity` provides an easy way to integrate activity tracking into components:

- Component-specific tracking context
- Automatic lifecycle tracking (mount/unmount)
- Time spent measurement
- Specialized tracking methods for common interactions

### 3. Integration with Telemetry

The activity tracking system integrates with the telemetry service to:

- Consolidate all tracking in a single system
- Provide consistent data structure and format
- Enable comprehensive analysis across all metrics
- Avoid duplicate event tracking

## Implementation Details

### Session Management

Sessions are tracked to understand user engagement patterns:

```typescript
private initializeSession(): void {
  try {
    // Try to load existing session
    const sessionJson = sessionStorage.getItem(SESSION_STORAGE_KEY);
    
    if (sessionJson) {
      const session = JSON.parse(sessionJson) as SessionInfo;
      
      // Check if session has expired
      if (Date.now() - session.lastActivityTime < SESSION_TIMEOUT) {
        this.session = session;
        this.session.isActive = true;
        return;
      }
    }
    
    // Create new session if none exists or has expired
    this.createNewSession();
  } catch (error) {
    console.error('Failed to initialize session:', error);
    this.createNewSession();
  }
}
```

Session timeouts are managed to ensure accurate session metrics:

```typescript
private checkSession(): void {
  if (!this.session) {
    this.initializeSession();
    return;
  }
  
  const now = Date.now();
  
  // Check if session has expired
  if (now - this.session.lastActivityTime > SESSION_TIMEOUT) {
    // End current session
    this.endSession();
    
    // Create new session
    this.createNewSession();
    
    // Track session timeout
    this.trackEvent('session_timeout', {
      previousSessionId: this.session.id
    });
  }
}
```

### Feature Usage Tracking

Feature usage is tracked to understand which features are most valuable:

```typescript
private trackFeatureUsage(
  featureId: string,
  category: FeatureCategory,
  action: string,
  options: TrackActivityOptions,
  timestamp: number
): void {
  // Get existing feature data or create new
  let feature = this.features.get(featureId);
  
  if (!feature) {
    feature = {
      featureId,
      category,
      usageCount: 0,
      lastUsed: timestamp,
      usageDuration: 0,
      interactions: {}
    };
  }
  
  // Update feature usage
  feature.usageCount += 1;
  feature.lastUsed = timestamp;
  
  // Add duration if provided
  if (options.duration) {
    feature.usageDuration += options.duration;
  }
  
  // Track specific interaction
  if (action) {
    feature.interactions[action] = (feature.interactions[action] || 0) + 1;
  }
  
  // Save to map
  this.features.set(featureId, feature);
}
```

Time spent in features is measured to understand engagement:

```typescript
public startFeatureTimer(featureId: string): void {
  this.featureStartTimes.set(featureId, Date.now());
}

public stopFeatureTimer(
  featureId: string,
  options: TrackActivityOptions = {}
): number {
  const startTime = this.featureStartTimes.get(featureId);
  if (!startTime) {
    return 0;
  }
  
  const now = Date.now();
  const duration = now - startTime;
  
  // Remove start time
  this.featureStartTimes.delete(featureId);
  
  // Track feature usage with duration
  options.duration = duration;
  this.trackActivity(`${featureId}_used`, options);
  
  return duration;
}
```

### Path Flow Analysis

Navigation paths are tracked to understand user journeys:

```typescript
private trackPathFlow(
  options: TrackActivityOptions,
  timestamp: number
): void {
  let from = options.source || options.path || '';
  let to = options.target || '';
  
  // If either is missing, try to use current path
  if (!from) {
    from = window.location.pathname;
  }
  
  if (!to) {
    to = from;
  }
  
  // Create key for path flow
  const key = `${from}:${to}`;
  
  // Get existing path flow or create new
  let pathFlow = this.pathFlows.get(key);
  
  if (!pathFlow) {
    pathFlow = {
      from,
      to,
      count: 0,
      averageDuration: 0
    };
  }
  
  // Update path flow
  pathFlow.count += 1;
  
  // Update duration if provided
  if (options.duration) {
    const newAverage = 
      (pathFlow.averageDuration * (pathFlow.count - 1) + options.duration) / 
      pathFlow.count;
    
    pathFlow.averageDuration = newAverage;
  }
  
  // Save to map
  this.pathFlows.set(key, pathFlow);
}
```

### React Hook Integration

The `useUserActivity` hook provides easy component integration:

```typescript
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
  
  // Track component lifecycle
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
  
  // ...tracking methods
}
```

## Security and Privacy Considerations

The implementation includes several security and privacy features:

1. **Data Minimization**:
   - Only track necessary interaction data
   - Avoid collecting sensitive information
   - Focus on aggregate patterns over individual actions

2. **Local Storage**:
   - Session data stored in sessionStorage (cleared on browser close)
   - Feature usage stored in localStorage with minimal personal data
   - No cross-domain sharing of activity data

3. **Configurable Tracking**:
   - Activity tracking can be disabled at component level
   - Session tracking requires browser storage consent
   - User identification is optional

## Integration Examples

### Basic Component Integration

```tsx
import React, { useState } from 'react';
import useUserActivity from '../hooks/useUserActivity';
import { FeatureCategory } from '../services/userActivityTracker';

const MyComponent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { 
    trackClick, 
    trackSearch,
    trackView 
  } = useUserActivity({
    component: 'MyComponent',
    featureId: 'search_feature',
    category: FeatureCategory.SEARCH
  });
  
  // Track component view
  useEffect(() => {
    trackView('search_page_view');
  }, [trackView]);
  
  const handleSearch = () => {
    trackSearch(searchTerm);
    // Perform search...
  };
  
  const handleClear = () => {
    trackClick('clear_search');
    setSearchTerm('');
  };
  
  return (
    <div>
      <input 
        value={searchTerm} 
        onChange={e => setSearchTerm(e.target.value)}
      />
      <button onClick={handleSearch}>Search</button>
      <button onClick={handleClear}>Clear</button>
    </div>
  );
};
```

### Tracking Complex User Flows

```tsx
import React, { useState } from 'react';
import useUserActivity from '../hooks/useUserActivity';
import { ActivityType, FeatureCategory } from '../services/userActivityTracker';

const CheckoutFlow = () => {
  const [step, setStep] = useState('cart');
  
  const { trackActivity, startTimer } = useUserActivity({
    component: 'CheckoutFlow',
    featureId: 'checkout',
    category: FeatureCategory.CORE
  });
  
  // Start timing the step
  useEffect(() => {
    const stopTimer = startTimer(`checkout_step_${step}`);
    
    // Track step change
    trackActivity('checkout_step_change', {
      type: ActivityType.NAVIGATION,
      source: previousStep.current,
      target: step,
      details: { step }
    });
    
    // Update previous step ref
    previousStep.current = step;
    
    return stopTimer;
  }, [step, startTimer, trackActivity]);
  
  const goToNextStep = (nextStep) => {
    setStep(nextStep);
  };
  
  // Render checkout flow...
};
```

## Analysis Capabilities

The activity tracking implementation enables several analysis capabilities:

1. **Feature Usage Analysis**:
   - Most/least used features
   - Time spent in features
   - Feature adoption over time
   - Feature abandonment patterns

2. **User Journey Analysis**:
   - Common navigation paths
   - Entry and exit points
   - Funnel conversion rates
   - Bounce rates and abandonment points

3. **Session Analysis**:
   - Session duration and frequency
   - Session depth (pages per session)
   - Device and browser patterns
   - Time of day and usage patterns

4. **Error and Recovery Analysis**:
   - Common error scenarios
   - Recovery success rates
   - Impact of errors on user journeys
   - Error patterns by device/browser

## Conclusion

The user activity tracking implementation provides comprehensive insights into how users interact with the application. By tracking sessions, feature usage, navigation paths, and specific interactions, the system enables data-driven decisions for improving the user experience, identifying pain points, and optimizing feature development.

The implementation is designed with security and privacy in mind, providing valuable insights while respecting user privacy and minimizing data collection to what is necessary for analysis.

## Future Enhancements

Potential future improvements include:

1. **User Segmentation**: Analyze behavior patterns across different user segments
2. **Real-time Monitoring**: Live dashboard for current activity
3. **Predictive Analytics**: Anticipate user needs based on behavior patterns
4. **Custom Event Definition**: Allow teams to define custom trackable events
5. **Integration with Business Metrics**: Connect user activity to business outcomes