// File: frontend/src/test/mocks/handlers.ts

import { rest } from 'msw';
import { mockEvents, mockIssues, mockProjects } from './data';

export const handlers = [
  // Events endpoints
  rest.get('/api/v1/events', (req, res, ctx) => {
    const query = req.url.searchParams.get('query');
    const limit = req.url.searchParams.get('limit');
    
    let events = [...mockEvents];
    
    if (query) {
      events = events.filter(event => 
        event.message.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    if (limit) {
      events = events.slice(0, parseInt(limit));
    }
    
    return res(ctx.json(events));
  }),

  rest.get('/api/v1/events/:eventId', (req, res, ctx) => {
    const { eventId } = req.params;
    const event = mockEvents.find(e => e.id === eventId);
    
    if (!event) {
      return res(ctx.status(404), ctx.json({ detail: 'Event not found' }));
    }
    
    return res(ctx.json(event));
  }),

  // Issues endpoints
  rest.get('/api/v1/issues', (req, res, ctx) => {
    const cursor = req.url.searchParams.get('cursor');
    const limit = parseInt(req.url.searchParams.get('limit') || '25');
    
    if (cursor) {
      return res(ctx.json({
        results: mockIssues.slice(0, limit),
        next: 'next-cursor',
        previous: 'prev-cursor'
      }));
    }
    
    return res(ctx.json(mockIssues));
  }),

  rest.post('/api/v1/issues/batch', async (req, res, ctx) => {
    const { ids } = await req.json();
    
    const results = ids.map(id => {
      const issue = mockIssues.find(i => i.id === id);
      return issue || { id, error: 'Not found' };
    });
    
    return res(ctx.json(results));
  }),

  rest.put('/api/v1/issues/:issueId', async (req, res, ctx) => {
    const { issueId } = req.params;
    const update = await req.json();
    
    const issue = mockIssues.find(i => i.id === issueId);
    if (!issue) {
      return res(ctx.status(404), ctx.json({ detail: 'Issue not found' }));
    }
    
    const updatedIssue = { ...issue, ...update };
    return res(ctx.json(updatedIssue));
  }),

  rest.post('/api/v1/issues/bulk', async (req, res, ctx) => {
    const { updates } = await req.json();
    
    const results = updates.map(update => {
      const issue = mockIssues.find(i => i.id === update.id);
      if (!issue) {
        return { id: update.id, error: 'Not found' };
      }
      return { ...issue, ...update };
    });
    
    return res(ctx.json(results));
  }),

  // Projects endpoints
  rest.get('/api/v1/projects', (req, res, ctx) => {
    return res(ctx.json(mockProjects));
  }),

  // Error simulation endpoints
  rest.get('/api/v1/error/network', (req, res, ctx) => {
    return res.networkError('Network error');
  }),

  rest.get('/api/v1/error/timeout', (req, res, ctx) => {
    return res(ctx.delay(2000), ctx.status(504));
  }),

  rest.get('/api/v1/error/rate-limit', (req, res, ctx) => {
    return res(
      ctx.status(429),
      ctx.set('Retry-After', '60'),
      ctx.json({ detail: 'Rate limit exceeded' })
    );
  }),

  // Performance metrics
  rest.get('/api/v1/events/metrics/performance', (req, res, ctx) => {
    return res(ctx.json({
      totalEvents: 10000,
      avgResponseTime: 250,
      errorRate: 0.05,
      throughput: 100
    }));
  }),

  // Cache simulation
  rest.get('/api/v1/cached', (req, res, ctx) => {
    const etag = req.headers.get('If-None-Match');
    
    if (etag === '"123abc"') {
      return res(ctx.status(304));
    }
    
    return res(
      ctx.set('ETag', '"123abc"'),
      ctx.set('Cache-Control', 'max-age=300'),
      ctx.json({ data: 'cached response' })
    );
  })
];

// Error handlers for testing error scenarios
export const errorHandlers = [
  rest.get('/api/v1/*', (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ detail: 'Internal server error' }));
  }),
  
  rest.post('/api/v1/*', (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ detail: 'Internal server error' }));
  })
];
