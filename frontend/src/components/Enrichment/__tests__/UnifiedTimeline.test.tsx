/**
 * UnifiedTimeline Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { UnifiedTimeline } from '../UnifiedTimeline';
import { Breadcrumb, PerformanceContext } from '../../../types/enrichment';

const renderWithProviders = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('UnifiedTimeline', () => {
  describe('Empty state', () => {
    it('should show message when no events available', () => {
      renderWithProviders(<UnifiedTimeline />);

      expect(screen.getByText(/No timeline events available/)).toBeTruthy();
    });
  });

  describe('With breadcrumbs', () => {
    const mockBreadcrumbs: Breadcrumb[] = [
      {
        timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
        type: 'navigation',
        category: 'navigation',
        message: 'User navigated to /dashboard',
        level: 'info',
      },
      {
        timestamp: new Date('2025-01-01T10:01:00Z').toISOString(),
        type: 'ui',
        category: 'ui',
        message: 'Clicked submit button',
        level: 'info',
      },
      {
        timestamp: new Date('2025-01-01T10:02:00Z').toISOString(),
        type: 'error',
        category: 'error',
        message: 'Database timeout',
        level: 'error',
      },
    ];

    it('should display all breadcrumbs', () => {
      renderWithProviders(<UnifiedTimeline breadcrumbs={mockBreadcrumbs} />);

      expect(screen.getByText(/User navigated to \/dashboard/)).toBeTruthy();
      expect(screen.getByText(/Clicked submit button/)).toBeTruthy();
      expect(screen.getByText(/Database timeout/)).toBeTruthy();
    });

    it('should show event count badge', () => {
      renderWithProviders(<UnifiedTimeline breadcrumbs={mockBreadcrumbs} />);

      expect(screen.getByText(/3 events/)).toBeTruthy();
    });

    it('should display events in chronological order', () => {
      renderWithProviders(<UnifiedTimeline breadcrumbs={mockBreadcrumbs} />);

      const messages = screen.getAllByText(/User navigated|Clicked submit|Database timeout/);
      expect(messages.length).toBe(3);
      // First event should be navigation (earliest timestamp)
      expect(messages[0].textContent).toContain('User navigated');
    });
  });

  describe('With performance spans', () => {
    const mockPerformanceContext: PerformanceContext = {
      spans: [
        {
          op: 'http.client',
          description: 'GET /api/users',
          spanId: 'span1',
          traceId: 'trace1',
          startTimestamp: new Date('2025-01-01T10:00:00Z').getTime() / 1000,
          timestamp: new Date('2025-01-01T10:00:01Z').getTime() / 1000,
          duration: 1000,
          status: 'ok',
        },
        {
          op: 'db.query',
          description: 'SELECT * FROM users',
          spanId: 'span2',
          traceId: 'trace1',
          startTimestamp: new Date('2025-01-01T10:00:01Z').getTime() / 1000,
          timestamp: new Date('2025-01-01T10:00:03Z').getTime() / 1000,
          duration: 2000,
          status: 'ok',
        },
      ],
      slowSpans: [],
      criticalPath: ['span2'],
    };

    it('should display performance spans', () => {
      renderWithProviders(<UnifiedTimeline performanceSpans={mockPerformanceContext} />);

      expect(screen.getByText(/GET \/api\/users/)).toBeTruthy();
      expect(screen.getByText(/SELECT \* FROM users/)).toBeTruthy();
    });

    it('should show critical path badge', () => {
      renderWithProviders(<UnifiedTimeline performanceSpans={mockPerformanceContext} />);

      expect(screen.getByText(/Critical path detected/)).toBeTruthy();
    });

    it('should mark critical path spans', () => {
      renderWithProviders(<UnifiedTimeline performanceSpans={mockPerformanceContext} />);

      const criticalBadges = screen.getAllByText('Critical');
      expect(criticalBadges.length).toBeGreaterThan(0);
    });

    it('should format durations correctly', () => {
      renderWithProviders(<UnifiedTimeline performanceSpans={mockPerformanceContext} />);

      expect(screen.getByText(/1000ms/)).toBeTruthy();
      expect(screen.getByText(/2000ms/)).toBeTruthy();
    });
  });

  describe('Merged timeline', () => {
    const mockBreadcrumbs: Breadcrumb[] = [
      {
        timestamp: new Date('2025-01-01T10:00:00Z').toISOString(),
        type: 'navigation',
        message: 'Page load',
        level: 'info',
      },
    ];

    const mockPerformanceContext: PerformanceContext = {
      spans: [
        {
          op: 'http.client',
          description: 'API call',
          spanId: 'span1',
          traceId: 'trace1',
          startTimestamp: new Date('2025-01-01T10:00:01Z').getTime() / 1000,
          timestamp: new Date('2025-01-01T10:00:02Z').getTime() / 1000,
          duration: 1000,
          status: 'ok',
        },
      ],
      slowSpans: [],
    };

    it('should merge breadcrumbs and spans chronologically', () => {
      renderWithProviders(
        <UnifiedTimeline breadcrumbs={mockBreadcrumbs} performanceSpans={mockPerformanceContext} />
      );

      expect(screen.getByText(/Page load/)).toBeTruthy();
      expect(screen.getByText(/API call/)).toBeTruthy();
      expect(screen.getByText(/2 events/)).toBeTruthy();
    });

    it('should show relative timestamps from first event', () => {
      renderWithProviders(
        <UnifiedTimeline breadcrumbs={mockBreadcrumbs} performanceSpans={mockPerformanceContext} />
      );

      // Should show relative time like "+1.00s" for the second event
      const relativeTime = screen.getAllByText(/\+/);
      expect(relativeTime.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    const mockBreadcrumbs: Breadcrumb[] = [
      {
        timestamp: new Date().toISOString(),
        type: 'navigation',
        message: 'Test event',
        level: 'info',
      },
    ];

    it('should have proper structure for screen readers', () => {
      const { container } = renderWithProviders(<UnifiedTimeline breadcrumbs={mockBreadcrumbs} />);

      // Timeline should be present
      expect(container.querySelector('[class*="Timeline"]')).toBeTruthy();
    });

    it('should have descriptive event categories', () => {
      renderWithProviders(<UnifiedTimeline breadcrumbs={mockBreadcrumbs} />);

      expect(screen.getByText('navigation')).toBeTruthy();
      expect(screen.getByText('breadcrumb')).toBeTruthy();
    });
  });
});
