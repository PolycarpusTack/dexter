// File: frontend/tests/mocks/handlers.ts (MSW setup)

import { http, HttpResponse } from 'msw'; // Use msw v2+ handlers

const API_BASE_URL = '/api/v1'; // Use relative URL matching test setup

export const handlers = [
  // Mock GET /status
  http.get(`${API_BASE_URL}/status`, () => {
    return HttpResponse.json({
        sentry_api_token_configured: true,
        ollama_connection_status: "OK",
        ollama_model_configured: "mistral:latest",
    });
  }),

  // Mock GET /config
  http.get(`${API_BASE_URL}/config`, () => {
      return HttpResponse.json({
           organization_slug: 'mock-org',
           project_slug: 'mock-project',
      });
  }),

  // Mock PUT /config
  http.put(`${API_BASE_URL}/config`, async ({ request }) => {
       const body = await request.json() as any;
       // Return the updated config as the backend does
       return HttpResponse.json({
            organization_slug: body.organization_slug,
            project_slug: body.project_slug,
       });
  }),

  // Add mocks for /issues, /events, /explain etc. as needed
  // Example: Mock GET /issues
   http.get(`${API_BASE_URL}/organizations/:org/projects/:proj/issues`, ({ request }) => {
      const url = new URL(request.url);
      const cursor = url.searchParams.get('cursor');
      // Return different data based on cursor for pagination tests
      if (cursor === 'page2_cursor') {
            return HttpResponse.json({
                data: [{ id: 'issue3', shortId: 'P-3', title: 'Issue 3', /* ... other fields */ }],
                pagination: { next_cursor: null, prev_cursor: 'page1_cursor' }
            });
      } else {
           return HttpResponse.json({
                data: [{ id: 'issue1', shortId: 'P-1', title: 'Issue 1', /* ... */ }, { id: 'issue2', shortId: 'P-2', title: 'Issue 2', /* ... */ }],
                pagination: { next_cursor: 'page2_cursor', prev_cursor: null }
           });
      }
  }),

  // Mock GET /events
  http.get(`${API_BASE_URL}/organizations/:org/projects/:proj/events`, () => {
    return HttpResponse.json({
      data: [
        {
          id: 'event1',
          title: 'Test Event 1',
          message: 'Test message',
          timestamp: new Date().toISOString(),
          level: 'error'
        }
      ],
      pagination: { next_cursor: null, prev_cursor: null }
    });
  }),

  // Mock POST /explain
  http.post(`${API_BASE_URL}/explain`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      event_id: body.event_id,
      explanation: 'This is a mock explanation for the error.',
      confidence: 0.85,
      suggestions: [
        'Check the database connection',
        'Verify API credentials'
      ]
    });
  }),

  // Mock deadlock analysis
  http.get(`${API_BASE_URL}/analyze-deadlock/:eventId`, ({ params }) => {
    return HttpResponse.json({
      event_id: params.eventId,
      deadlock_type: 'PostgreSQL Deadlock',
      transactions: [
        {
          process_id: '12345',
          transaction_id: '678',
          waiting_for: 'ShareLock',
          blocked_by: '67890',
          query: 'UPDATE users SET last_active = NOW() WHERE id = 123'
        }
      ],
      resolution_suggestions: [
        'Always acquire locks in the same order'
      ]
    });
  })
];