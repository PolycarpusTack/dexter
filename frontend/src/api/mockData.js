// File: frontend/src/api/mockData.js

/**
 * Mock data for development and testing
 */

// Mock events for testing UI
export const mockEvents = [
  {
    id: 'event-1',
    title: 'TypeError: Cannot read property "length" of undefined',
    message: 'TypeError: Cannot read property "length" of undefined',
    level: 'error',
    status: 'unresolved',
    count: 12,
    userCount: 5,
    lastSeen: new Date().toISOString(),
    firstSeen: new Date(Date.now() - 86400000 * 7).toISOString(),
    tags: [
      { key: 'browser', value: 'Chrome' },
      { key: 'device', value: 'Desktop' },
      { key: 'environment', value: 'production' }
    ],
    stacktrace: `TypeError: Cannot read property "length" of undefined
    at processData (app.js:120)
    at handleSubmit (form.js:45)
    at HTMLFormElement.submit (index.js:87)`,
    context: {
      url: 'https://example.com/dashboard',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
      userId: '12345'
    }
  },
  {
    id: 'event-2',
    title: 'SyntaxError: Unexpected token < in JSON at position 0',
    message: 'SyntaxError: Unexpected token < in JSON at position 0',
    level: 'error',
    status: 'unresolved',
    count: 8,
    userCount: 3,
    lastSeen: new Date().toISOString(),
    firstSeen: new Date(Date.now() - 86400000 * 3).toISOString(),
    tags: [
      { key: 'browser', value: 'Firefox' },
      { key: 'device', value: 'Mobile' },
      { key: 'environment', value: 'staging' }
    ],
    stacktrace: `SyntaxError: Unexpected token < in JSON at position 0
    at JSON.parse (<anonymous>)
    at parseResponse (api.js:78)
    at processApiResponse (dashboard.js:132)`,
    context: {
      url: 'https://staging.example.com/api/users',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Mobile/15E148 Safari/604.1',
      userId: '54321'
    }
  },
  {
    id: 'event-3',
    title: 'PostgreSQL Deadlock Detected: 40P01',
    message: 'ERROR: deadlock detected (SQLSTATE: 40P01)',
    level: 'error',
    status: 'unresolved',
    count: 5,
    userCount: 2,
    lastSeen: new Date().toISOString(),
    firstSeen: new Date(Date.now() - 86400000 * 1).toISOString(),
    tags: [
      { key: 'database', value: 'PostgreSQL' },
      { key: 'service', value: 'OrdersAPI' },
      { key: 'environment', value: 'production' }
    ],
    stacktrace: `ERROR: deadlock detected (SQLSTATE: 40P01)
    at Connection.parseE (db.js:682)
    at Connection.parseMessage (db.js:520)
    at Socket.<anonymous> (db.js:330)`,
    context: {
      sql: 'UPDATE orders SET status = $1 WHERE order_id = $2',
      params: ['processing', 1234567],
      deadlock_info: 'Process 1234 waits for ShareLock on transaction 5678; blocked by process 5678.'
    },
    isDeadlock: true,
    deadlockData: {
      nodes: [
        { id: 'process-1234', type: 'process', label: 'Process 1234', inCycle: true },
        { id: 'process-5678', type: 'process', label: 'Process 5678', inCycle: true },
        { id: 'table-orders', type: 'table', label: 'orders', inCycle: true },
        { id: 'table-order_items', type: 'table', label: 'order_items', inCycle: false }
      ],
      edges: [
        { from: 'process-1234', to: 'table-orders', label: 'Waiting for ShareLock' },
        { from: 'process-5678', to: 'table-order_items', label: 'Holds ShareLock' },
        { from: 'process-5678', to: 'table-orders', label: 'Holds ExclusiveLock' },
        { from: 'process-1234', to: 'table-order_items', label: 'Waiting for ExclusiveLock' }
      ]
    }
  },
  {
    id: 'event-4',
    title: 'Failed to load resource: the server responded with a status of 404',
    message: 'Failed to load resource: the server responded with a status of 404',
    level: 'warning',
    status: 'unresolved',
    count: 17,
    userCount: 10,
    lastSeen: new Date().toISOString(),
    firstSeen: new Date(Date.now() - 86400000 * 10).toISOString(),
    tags: [
      { key: 'resource', value: 'script.js' },
      { key: 'browser', value: 'Safari' },
      { key: 'environment', value: 'production' }
    ],
    stacktrace: 'No stack trace available',
    context: {
      url: 'https://example.com/assets/js/script.js',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
      referrer: 'https://example.com/store'
    }
  },
  {
    id: 'event-5',
    title: 'React Error: Maximum update depth exceeded',
    message: 'Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate.',
    level: 'error',
    status: 'unresolved',
    count: 3,
    userCount: 2,
    lastSeen: new Date().toISOString(),
    firstSeen: new Date(Date.now() - 86400000 * 2).toISOString(),
    tags: [
      { key: 'framework', value: 'React' },
      { key: 'browser', value: 'Edge' },
      { key: 'environment', value: 'development' }
    ],
    stacktrace: `Error: Maximum update depth exceeded
    at checkForNestedUpdates (react-dom.development.js:13509)
    at scheduleUpdateOnFiber (react-dom.development.js:25891)
    at dispatchAction (react-dom.development.js:25089)`,
    context: {
      componentStack: `
        in UserProfile
        in UserSettings
        in App
      `,
      url: 'http://localhost:3000/settings',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
    }
  }
];

// Get a specific mock event by ID
export function getMockEventById(eventId) {
  return mockEvents.find(event => event.id === eventId) || null;
}

// Get the latest event for an issue
export function getMockLatestEventForIssue(issueId) {
  // In mock data, we treat the issueId as eventId for simplicity
  return getMockEventById(issueId);
}

// Mock list response that would come from the API
export function getMockIssuesListResponse(options = {}) {
  const { 
    query = '', 
    level = '', 
    sort = 'timestamp', 
    sortDirection = 'desc',
    page = 1,
    perPage = 10
  } = options;
  
  // Filter the mock events based on query params
  let filteredEvents = [...mockEvents];
  
  // Apply query filter if provided
  if (query) {
    const lowerQuery = query.toLowerCase();
    filteredEvents = filteredEvents.filter(event => 
      event.title.toLowerCase().includes(lowerQuery) || 
      event.message.toLowerCase().includes(lowerQuery)
    );
  }
  
  // Apply level filter if provided
  if (level) {
    filteredEvents = filteredEvents.filter(event => 
      event.level.toLowerCase() === level.toLowerCase()
    );
  }
  
  // Apply sorting
  filteredEvents.sort((a, b) => {
    let valA, valB;
    
    // Get the values to compare based on sort field
    switch (sort) {
      case 'title':
        valA = a.title;
        valB = b.title;
        break;
      case 'level':
        valA = a.level;
        valB = b.level;
        break;
      case 'count':
        valA = a.count;
        valB = b.count;
        break;
      case 'timestamp':
      default:
        valA = new Date(a.lastSeen).getTime();
        valB = new Date(b.lastSeen).getTime();
        break;
    }
    
    // Compare based on direction
    if (sortDirection === 'asc') {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });
  
  // Apply pagination
  const startIndex = (page - 1) * perPage;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + perPage);
  
  // Return formatted response
  return {
    items: paginatedEvents,
    totalCount: filteredEvents.length,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(filteredEvents.length / perPage),
      hasNext: startIndex + perPage < filteredEvents.length,
      hasPrevious: page > 1
    }
  };
}
