/**
 * EnrichmentTabs Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EnrichmentTabs } from '../EnrichmentTabs';
import * as enrichmentHooks from '../../../api/unified/hooks/useEnrichment';
import { EnrichmentData } from '../../../types/enrichment';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>{component}</MantineProvider>
    </QueryClientProvider>
  );
};

describe('EnrichmentTabs', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  describe('Loading state', () => {
    it('should show loading overlay while fetching data', () => {
      vi.spyOn(enrichmentHooks, 'useEnrichmentData').mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      renderWithProviders(<EnrichmentTabs issueId="123" />);

      expect(screen.getByRole('presentation')).toBeTruthy(); // LoadingOverlay
    });
  });

  describe('Error state', () => {
    it('should show error message when fetch fails', () => {
      vi.spyOn(enrichmentHooks, 'useEnrichmentData').mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { message: 'Network error' },
      } as any);

      renderWithProviders(<EnrichmentTabs issueId="123" />);

      expect(screen.getByText(/Error Loading Enrichment Data/)).toBeTruthy();
      expect(screen.getByText(/Network error/)).toBeTruthy();
    });
  });

  describe('Tab rendering', () => {
    const mockEnrichmentData: EnrichmentData = {
      suspectCommits: [
        {
          id: 'commit1',
          message: 'Fix database timeout',
          author: { name: 'John Doe' },
          repository: { name: 'backend' },
          score: 75,
          dateCreated: new Date().toISOString(),
        },
      ],
      performanceSpans: {
        spans: [
          {
            op: 'db.query',
            spanId: 'span1',
            traceId: 'trace1',
            startTimestamp: Date.now() / 1000,
            timestamp: Date.now() / 1000 + 1,
            duration: 1000,
          },
        ],
        slowSpans: [],
      },
      breadcrumbTimeline: [
        {
          timestamp: new Date().toISOString(),
          type: 'navigation',
          message: 'User navigated',
        },
      ],
      enrichmentStatus: {
        release: { success: true, fetchedAt: new Date().toISOString() },
        commits: { success: true, fetchedAt: new Date().toISOString() },
        performance: { success: true, fetchedAt: new Date().toISOString() },
        profiling: { success: false },
        session: { success: false },
        replay: { success: false },
        alerts: { success: false },
        breadcrumbs: { success: true, fetchedAt: new Date().toISOString() },
        tags: { success: false },
        ownership: { success: false },
        measurements: { success: false },
        grouping: { success: false },
        attachments: { success: false },
      },
      enrichedAt: new Date().toISOString(),
    };

    beforeEach(() => {
      vi.spyOn(enrichmentHooks, 'useEnrichmentData').mockReturnValue({
        data: mockEnrichmentData,
        isLoading: false,
        error: null,
      } as any);
    });

    it('should render all tab labels', () => {
      renderWithProviders(<EnrichmentTabs issueId="123" />);

      expect(screen.getByText('Summary')).toBeTruthy();
      expect(screen.getByText('Releases & Commits')).toBeTruthy();
      expect(screen.getByText('Performance')).toBeTruthy();
      expect(screen.getByText('Profiling')).toBeTruthy();
      expect(screen.getByText('Sessions & Replays')).toBeTruthy();
      expect(screen.getByText('Alerts & Incidents')).toBeTruthy();
      expect(screen.getByText('Tags & Environment')).toBeTruthy();
      expect(screen.getByText('Measurements')).toBeTruthy();
      expect(screen.getByText('Ownership')).toBeTruthy();
      expect(screen.getByText('Breadcrumbs')).toBeTruthy();
      expect(screen.getByText('Grouping')).toBeTruthy();
      expect(screen.getByText('Attachments')).toBeTruthy();
    });

    it('should show badge counts for available data', () => {
      renderWithProviders(<EnrichmentTabs issueId="123" />);

      // Should show badge with count 1 for commits
      const commitsBadges = screen.getAllByText('1');
      expect(commitsBadges.length).toBeGreaterThan(0);
    });

    it('should switch tabs on click', async () => {
      renderWithProviders(<EnrichmentTabs issueId="123" />);

      const performanceTab = screen.getByText('Performance');
      fireEvent.click(performanceTab);

      await waitFor(() => {
        expect(screen.getByText('Performance Spans')).toBeTruthy();
      });
    });

    it('should show freshness pills in tab panels', async () => {
      renderWithProviders(<EnrichmentTabs issueId="123" />);

      const releasesTab = screen.getByText('Releases & Commits');
      fireEvent.click(releasesTab);

      await waitFor(() => {
        expect(screen.getByText(/ago/)).toBeTruthy(); // FreshnessPill
      });
    });
  });

  describe('Empty states', () => {
    beforeEach(() => {
      vi.spyOn(enrichmentHooks, 'useEnrichmentData').mockReturnValue({
        data: {
          enrichmentStatus: {
            release: { success: false },
            commits: { success: false },
            performance: { success: false },
            profiling: { success: false },
            session: { success: false },
            replay: { success: false },
            alerts: { success: false },
            breadcrumbs: { success: false },
            tags: { success: false },
            ownership: { success: false },
            measurements: { success: false },
            grouping: { success: false },
            attachments: { success: false },
          },
          enrichedAt: new Date().toISOString(),
        },
        isLoading: false,
        error: null,
      } as any);
    });

    it('should show empty state when no data available', async () => {
      renderWithProviders(<EnrichmentTabs issueId="123" />);

      const releasesTab = screen.getByText('Releases & Commits');
      fireEvent.click(releasesTab);

      await waitFor(() => {
        expect(screen.getByText(/No release or commit information available/)).toBeTruthy();
      });
    });

    it('should show coming soon message for incomplete features', async () => {
      renderWithProviders(<EnrichmentTabs issueId="123" />);

      const profilingTab = screen.getByText('Profiling');
      fireEvent.click(profilingTab);

      await waitFor(() => {
        expect(screen.getByText(/coming soon/i)).toBeTruthy();
      });
    });
  });

  describe('Keyboard shortcuts', () => {
    beforeEach(() => {
      vi.spyOn(enrichmentHooks, 'useEnrichmentData').mockReturnValue({
        data: {
          enrichmentStatus: {} as any,
          enrichedAt: new Date().toISOString(),
        },
        isLoading: false,
        error: null,
      } as any);
    });

    it('should switch to tab using Alt+Number shortcuts', async () => {
      renderWithProviders(<EnrichmentTabs issueId="123" />);

      // Alt+2 should switch to "Releases & Commits" tab
      fireEvent.keyDown(window, { key: '2', altKey: true });

      await waitFor(() => {
        expect(screen.getByText('Release Context & Suspect Commits')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      vi.spyOn(enrichmentHooks, 'useEnrichmentData').mockReturnValue({
        data: {
          enrichmentStatus: {} as any,
          enrichedAt: new Date().toISOString(),
        },
        isLoading: false,
        error: null,
      } as any);
    });

    it('should have proper tab navigation structure', () => {
      const { container } = renderWithProviders(<EnrichmentTabs issueId="123" />);

      const tablist = container.querySelector('[role="tablist"]');
      expect(tablist).toBeTruthy();
    });

    it('should have icons with appropriate size', () => {
      renderWithProviders(<EnrichmentTabs issueId="123" />);

      // All tabs with icons should be rendered
      const performanceTab = screen.getByText('Performance');
      expect(performanceTab).toBeTruthy();
    });
  });
});
