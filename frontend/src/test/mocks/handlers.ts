import { http, HttpResponse } from 'msw';

// Define issue interface for type safety
interface Issue {
  id: string;
  title: string;
  culprit: string;
  status: string;
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
}

// Mock data
const mockIssues: Issue[] = [
  {
    id: '1',
    title: 'Error in production',
    culprit: 'api/endpoints/users',
    status: 'unresolved',
    count: 42,
    userCount: 8,
    firstSeen: '2023-12-01T10:00:00Z',
    lastSeen: '2023-12-01T12:00:00Z',
  },
];

const mockEvent = {
  id: 'event-1',
  eventID: 'event-1',
  title: 'TypeError: Cannot read property x of undefined',
  platform: 'javascript',
  dateCreated: '2023-12-01T10:00:00Z',
  tags: [{ key: 'environment', value: 'production' }],
  user: { email: 'user@example.com' },
  contexts: {},
  entries: [],
};

// Handlers
export const handlers = [
  // Issues endpoints
  http.get('/api/issues', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    
    let filteredIssues = [...mockIssues];
    if (status) {
      filteredIssues = filteredIssues.filter(issue => issue.status === status);
    }
    
    return HttpResponse.json(filteredIssues);
  }),

  http.get('/api/issues/:id', ({ params }) => {
    const { id } = params;
    const issue = mockIssues.find(i => i.id === id);
    
    if (!issue) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }
    
    return HttpResponse.json(issue);
  }),

  http.put('/api/issues/:id', async ({ request, params }) => {
    const { id } = params;
    const body = await request.json();
    
    const issueIndex = mockIssues.findIndex(i => i.id === id);
    if (issueIndex === -1) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }
    
    // Ensure ID property is preserved even if body tries to overwrite it
    const updatedIssue: Issue = { 
      ...mockIssues[issueIndex], 
      ...(typeof body === 'object' && body !== null ? body : {}),
      id: mockIssues[issueIndex].id // Ensure ID is preserved
    };
    
    // Ensure all required fields are present
    mockIssues[issueIndex] = updatedIssue;
    return HttpResponse.json(mockIssues[issueIndex]);
  }),

  // Events endpoints
  http.get('/api/events/:id', ({ params }) => {
    const { id } = params;
    
    if (id === 'event-1') {
      return HttpResponse.json(mockEvent);
    }
    
    return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
  }),

  // Discover endpoints
  http.post('/api/discover/query', async ({ request }) => {
    const body = await request.json();
    console.log('Received query body:', body); // Using body to satisfy the linter
    
    return HttpResponse.json({
      data: [
        { event_id: '1', timestamp: '2023-12-01T10:00:00Z', error_count: 10 },
        { event_id: '2', timestamp: '2023-12-01T11:00:00Z', error_count: 15 },
      ],
      meta: {
        fields: {
          event_id: 'string',
          timestamp: 'datetime',
          error_count: 'integer',
        },
      },
    });
  }),
];

// Setup function for tests
export function setupMockServer() {
  return { handlers };
}
