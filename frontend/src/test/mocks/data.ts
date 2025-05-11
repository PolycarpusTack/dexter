// File: frontend/src/test/mocks/data.ts

export const mockEvents = [
  {
    id: 'event-1',
    title: 'TypeError: Cannot read property \'foo\' of undefined',
    message: 'TypeError: Cannot read property \'foo\' of undefined',
    timestamp: '2024-01-01T12:00:00Z',
    level: 'error',
    platform: 'javascript',
    project: {
      id: 'project-1',
      slug: 'frontend',
      name: 'Frontend'
    },
    user: {
      id: 'user-1',
      email: 'user@example.com',
      username: 'testuser'
    },
    tags: {
      environment: 'production',
      release: '1.0.0',
      server: 'app-01'
    },
    context: {
      browser: {
        name: 'Chrome',
        version: '120.0.0'
      },
      os: {
        name: 'Windows',
        version: '10'
      }
    },
    stacktrace: {
      frames: [
        {
          filename: 'app.js',
          function: 'doSomething',
          lineNo: 123,
          colNo: 45,
          inApp: true
        }
      ]
    }
  },
  {
    id: 'event-2',
    title: 'Database connection failed',
    message: 'Connection timeout after 30000ms',
    timestamp: '2024-01-01T12:05:00Z',
    level: 'warning',
    platform: 'python',
    project: {
      id: 'project-2',
      slug: 'backend',
      name: 'Backend'
    },
    tags: {
      environment: 'staging',
      release: '2.0.0'
    }
  }
];

export const mockIssues = [
  {
    id: 'issue-1',
    shortId: 'PROJ-123',
    title: 'TypeError: Cannot read property \'foo\' of undefined',
    culprit: 'app.js in doSomething',
    permalink: 'https://sentry.io/organizations/test/issues/issue-1/',
    level: 'error',
    status: 'unresolved',
    platform: 'javascript',
    project: {
      id: 'project-1',
      slug: 'frontend',
      name: 'Frontend'
    },
    count: '573',
    userCount: 387,
    firstSeen: '2024-01-01T00:00:00Z',
    lastSeen: '2024-01-02T12:00:00Z',
    assignedTo: null,
    isBookmarked: false,
    hasSeen: false,
    metadata: {
      type: 'TypeError',
      value: 'Cannot read property \'foo\' of undefined'
    },
    stats: {
      '24h': [
        [1704067200, 12],
        [1704070800, 45],
        [1704074400, 23],
        [1704078000, 67]
      ]
    }
  },
  {
    id: 'issue-2',
    shortId: 'PROJ-124',
    title: 'Database connection failed',
    culprit: 'db.py in connect',
    level: 'warning',
    status: 'unresolved',
    platform: 'python',
    project: {
      id: 'project-2',
      slug: 'backend',
      name: 'Backend'
    },
    count: '45',
    userCount: 12,
    firstSeen: '2024-01-01T10:00:00Z',
    lastSeen: '2024-01-01T15:00:00Z'
  }
];

export const mockProjects = [
  {
    id: 'project-1',
    slug: 'frontend',
    name: 'Frontend',
    platform: 'javascript',
    dateCreated: '2023-01-01T00:00:00Z',
    hasAccess: true,
    isMember: true,
    organization: {
      id: 'org-1',
      slug: 'test-org',
      name: 'Test Organization'
    }
  },
  {
    id: 'project-2',
    slug: 'backend',
    name: 'Backend',
    platform: 'python',
    dateCreated: '2023-01-02T00:00:00Z',
    hasAccess: true,
    isMember: true,
    organization: {
      id: 'org-1',
      slug: 'test-org',
      name: 'Test Organization'
    }
  }
];

export const mockComments = [
  {
    id: 'comment-1',
    issue: 'issue-1',
    data: {
      text: 'This looks like a regression from the last release'
    },
    user: {
      id: 'user-2',
      name: 'John Doe',
      email: 'john@example.com'
    },
    dateCreated: '2024-01-01T13:00:00Z'
  }
];

export const mockReleases = [
  {
    version: '1.0.0',
    ref: 'abc123',
    url: 'https://github.com/test/repo/releases/tag/1.0.0',
    dateCreated: '2024-01-01T00:00:00Z',
    dateReleased: '2024-01-01T01:00:00Z',
    commitCount: 45,
    newGroups: 3
  },
  {
    version: '2.0.0',
    ref: 'def456',
    url: 'https://github.com/test/repo/releases/tag/2.0.0',
    dateCreated: '2024-01-02T00:00:00Z',
    dateReleased: '2024-01-02T01:00:00Z',
    commitCount: 78,
    newGroups: 5
  }
];

export const mockPerformanceData = {
  totalEvents: 10000,
  avgResponseTime: 250,
  errorRate: 0.05,
  throughput: 100,
  apdex: 0.95,
  p95: 500,
  p99: 800
};

export const createMockEvent = (overrides = {}) => ({
  ...mockEvents[0],
  id: `event-${Date.now()}`,
  ...overrides
});

export const createMockIssue = (overrides = {}) => ({
  ...mockIssues[0],
  id: `issue-${Date.now()}`,
  ...overrides
});
