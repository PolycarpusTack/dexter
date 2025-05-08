// File: frontend/src/utils/sentryDataExtractors.js

/**
 * Advanced utilities for extracting and formatting Sentry data
 */

/**
 * Extract full exception chain from event data
 */
export function extractExceptionChain(eventData) {
  const exceptionValues = [];
  
  // Check direct exception field
  if (eventData.exception?.values) {
    exceptionValues.push(...eventData.exception.values);
  }
  
  // Check in entries
  if (eventData.entries) {
    for (const entry of eventData.entries) {
      if (entry.type === 'exception' && entry.data?.values) {
        exceptionValues.push(...entry.data.values);
      }
    }
  }
  
  // Process and link exceptions as a chain
  return exceptionValues.map((exception, index) => {
    return {
      ...exception,
      isRootCause: index === exceptionValues.length - 1,
      isFirstException: index === 0
    };
  });
}

/**
 * Extract and format breadcrumbs with timestamps
 */
export function extractBreadcrumbs(eventData) {
  const breadcrumbs = [];
  
  // Check direct breadcrumbs field
  if (eventData.breadcrumbs) {
    breadcrumbs.push(...eventData.breadcrumbs);
  }
  
  // Check in entries
  if (eventData.entries) {
    for (const entry of eventData.entries) {
      if (entry.type === 'breadcrumbs' && entry.data?.values) {
        breadcrumbs.push(...entry.data.values);
      }
    }
  }
  
  // Sort breadcrumbs by timestamp
  return breadcrumbs.sort((a, b) => {
    if (!a.timestamp) return -1;
    if (!b.timestamp) return 1;
    return new Date(a.timestamp) - new Date(b.timestamp);
  });
}

/**
 * Extract all context data (browser, OS, device, custom) from event data
 */
export function extractAllContexts(eventData) {
  const contexts = { ...eventData.contexts };
  
  // Extract request data if available
  if (eventData.request) {
    contexts.request = eventData.request;
  }
  
  // Extract user data if available
  if (eventData.user) {
    contexts.user = eventData.user;
  }
  
  // Extract environment data
  if (eventData.environment) {
    contexts.environment = { name: eventData.environment };
  }
  
  // Extract SDK data
  if (eventData.sdk) {
    contexts.sdk = eventData.sdk;
  }
  
  return contexts;
}

/**
 * Analyze stack frames to identify potential issues
 */
export function analyzeStackFrames(frames) {
  if (!frames || !Array.isArray(frames)) {
    return {
      applicationFrames: [],
      libraryFrames: [],
      suspiciousFrames: [],
      mostRelevantFrame: null
    };
  }
  
  const applicationFrames = frames.filter(frame => frame.inApp);
  const libraryFrames = frames.filter(frame => !frame.inApp);
  
  // Identify interesting frames for debugging
  const suspiciousFrames = frames.filter(frame => {
    // Look for common error patterns
    const code = frame.context_line || '';
    return (
      code.includes('undefined') ||
      code.includes('null') ||
      code.includes('try') ||
      code.includes('catch') ||
      code.includes('throw')
    );
  });
  
  return {
    applicationFrames,
    libraryFrames,
    suspiciousFrames,
    mostRelevantFrame: applicationFrames[0] || frames[0]
  };
}

/**
 * Extract HTTP request details from event data
 */
export function extractRequestData(eventData) {
  // Check direct request field
  if (eventData.request) {
    return eventData.request;
  }
  
  // Check in contexts
  if (eventData.contexts?.request) {
    return eventData.contexts.request;
  }
  
  // Check in entries
  if (eventData.entries) {
    for (const entry of eventData.entries) {
      if (entry.type === 'request' && entry.data) {
        return entry.data;
      }
    }
  }
  
  return null;
}

/**
 * Extract release information from event data
 */
export function extractReleaseInfo(eventData) {
  if (!eventData.release) {
    return null;
  }
  
  // Build basic release info
  const releaseInfo = {
    version: eventData.release,
    dateCreated: eventData.timestamp || new Date().toISOString(),
    url: null,
    lastCommit: null
  };
  
  // Extract additional release info if available
  if (eventData.contexts?.release) {
    return {
      ...releaseInfo,
      ...eventData.contexts.release
    };
  }
  
  // Check in tags for commit info
  if (eventData.tags) {
    const commitTag = eventData.tags.find(tag => tag.key === 'commit');
    if (commitTag) {
      releaseInfo.lastCommit = {
        id: commitTag.value,
        message: 'Commit information',
        author: 'Unknown'
      };
    }
  }
  
  return releaseInfo;
}

/**
 * Extract related events from event data (if available)
 */
export function extractRelatedEvents(eventData) {
  // Check for related events in contexts
  if (eventData.contexts?.related_events) {
    return eventData.contexts.related_events;
  }
  
  // Check for related events in entries
  if (eventData.entries) {
    for (const entry of eventData.entries) {
      if (entry.type === 'related_events' && entry.data) {
        return entry.data;
      }
    }
  }
  
  return [];
}

/**
 * Check if an event is a PostgreSQL deadlock error
 */
export function isDeadlockError(eventData) {
  if (!eventData) return false;
  
  // Check for deadlock keywords in message or 40P01 error code
  const message = eventData.message || '';
  const hasDeadlockMessage = message.toLowerCase().includes('deadlock detected');
  
  // Check tags for error code
  const tags = eventData.tags || [];
  const hasDeadlockCode = tags.some(tag => 
    (tag.key === 'error_code' || tag.key === 'db_error_code' || tag.key === 'sql_state') && 
    tag.value === '40P01'
  );
  
  // Check exception values
  const exception = eventData.exception?.values?.[0] || {};
  const hasDeadlockException = 
    (exception.value?.toLowerCase()?.includes('deadlock detected')) || 
    (exception.type?.toLowerCase()?.includes('deadlock'));
  
  return hasDeadlockMessage || hasDeadlockCode || hasDeadlockException;
}

/**
 * Extract error type from event data
 */
export function extractErrorType(eventData) {
  if (!eventData) return 'Unknown';
  
  // Check in exception values
  if (eventData.exception?.values?.length > 0) {
    return eventData.exception.values[0].type || 'Unknown';
  }
  
  // Check in entries
  if (eventData.entries?.length > 0) {
    for (const entry of eventData.entries) {
      if (entry.type === 'exception' && entry.data?.values?.length > 0) {
        return entry.data.values[0].type || 'Unknown';
      }
    }
  }
  
  // Get from title as fallback
  const title = eventData.title || '';
  if (title.includes(': ')) {
    return title.split(': ')[0];
  }
  
  return eventData.level || 'Error';
}

/**
 * Extract error message from event data
 */
export function extractErrorMessage(eventData) {
  if (!eventData) return '';
  
  // Check direct message field
  if (eventData.message) {
    return eventData.message;
  }
  
  // Check in exception values
  if (eventData.exception?.values?.length > 0) {
    return eventData.exception.values[0].value || '';
  }
  
  // Check in entries
  if (eventData.entries?.length > 0) {
    for (const entry of eventData.entries) {
      if (entry.type === 'exception' && entry.data?.values?.length > 0) {
        return entry.data.values[0].value || '';
      }
    }
  }
  
  // Get from title as fallback
  const title = eventData.title || '';
  if (title.includes(': ')) {
    return title.split(': ').slice(1).join(': ');
  }
  
  return title;
}
