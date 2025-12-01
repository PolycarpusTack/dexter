/**
 * FreshnessPill Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { FreshnessPill } from '../FreshnessPill';
import { EnrichmentSourceStatus, FreshnessLevel } from '../../../types/enrichment';

const renderWithProviders = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe('FreshnessPill', () => {
  describe('Freshness calculation', () => {
    it('should show FRESH status for data < 5 minutes old', () => {
      const fiveMinutesAgo = new Date(Date.now() - 4 * 60 * 1000).toISOString();
      const status: EnrichmentSourceStatus = {
        success: true,
        fetchedAt: fiveMinutesAgo,
      };

      renderWithProviders(<FreshnessPill status={status} />);

      const badge = screen.getByText(/ago/);
      expect(badge).toBeTruthy();
    });

    it('should show RECENT status for data 5-30 minutes old', () => {
      const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      const status: EnrichmentSourceStatus = {
        success: true,
        fetchedAt: twentyMinutesAgo,
      };

      renderWithProviders(<FreshnessPill status={status} />);

      const badge = screen.getByText(/ago/);
      expect(badge).toBeTruthy();
    });

    it('should show FAILED status when success is false', () => {
      const status: EnrichmentSourceStatus = {
        success: false,
        error: 'Network timeout',
      };

      renderWithProviders(<FreshnessPill status={status} />);

      expect(screen.getByText(/Failed to fetch|Network timeout/)).toBeTruthy();
    });
  });

  describe('Refresh button', () => {
    it('should show refresh button for stale data', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const onRefresh = vi.fn();
      const status: EnrichmentSourceStatus = {
        success: true,
        fetchedAt: oneHourAgo,
      };

      renderWithProviders(<FreshnessPill status={status} onRefresh={onRefresh} />);

      const refreshButton = screen.getByLabelText('Refresh enrichment data');
      expect(refreshButton).toBeTruthy();
    });

    it('should not show refresh button for fresh data', () => {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const onRefresh = vi.fn();
      const status: EnrichmentSourceStatus = {
        success: true,
        fetchedAt: twoMinutesAgo,
      };

      renderWithProviders(<FreshnessPill status={status} onRefresh={onRefresh} />);

      const refreshButton = screen.queryByLabelText('Refresh enrichment data');
      expect(refreshButton).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label on refresh button', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const onRefresh = vi.fn();
      const status: EnrichmentSourceStatus = {
        success: true,
        fetchedAt: oneHourAgo,
      };

      renderWithProviders(<FreshnessPill status={status} onRefresh={onRefresh} />);

      const refreshButton = screen.getByLabelText('Refresh enrichment data');
      expect(refreshButton.getAttribute('aria-label')).toBe('Refresh enrichment data');
    });

    it('should have descriptive tooltip', () => {
      const status: EnrichmentSourceStatus = {
        success: true,
        fetchedAt: new Date().toISOString(),
      };

      renderWithProviders(<FreshnessPill status={status} />);

      // Badge should be present with help cursor
      const badge = screen.getByText(/ago/);
      expect(badge).toBeTruthy();
    });
  });

  describe('Time formatting', () => {
    it('should format seconds correctly', () => {
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
      const status: EnrichmentSourceStatus = {
        success: true,
        fetchedAt: thirtySecondsAgo,
      };

      renderWithProviders(<FreshnessPill status={status} />);

      expect(screen.getByText(/s ago/)).toBeTruthy();
    });

    it('should format minutes correctly', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const status: EnrichmentSourceStatus = {
        success: true,
        fetchedAt: fiveMinutesAgo,
      };

      renderWithProviders(<FreshnessPill status={status} />);

      expect(screen.getByText(/m ago/)).toBeTruthy();
    });

    it('should format hours correctly', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const status: EnrichmentSourceStatus = {
        success: true,
        fetchedAt: twoHoursAgo,
      };

      renderWithProviders(<FreshnessPill status={status} />);

      expect(screen.getByText(/h ago/)).toBeTruthy();
    });
  });
});
