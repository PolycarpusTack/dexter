/**
 * Tests for WhyThisAnswer Component
 *
 * EPIC Q: AI Transparency & UX Polish - Story Q-1
 */

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { WhyThisAnswer } from '../WhyThisAnswer';
import type { TransparencyInfo } from '../../../types/analysis';

const mockTransparency: TransparencyInfo = {
  similar_issues_count: 2,
  similar_issues: [
    {
      id: 12345,
      title: 'Similar error in production',
      similarity: 0.89,
      project: 'web-app',
      status: 'unresolved',
    },
    {
      id: 12346,
      title: 'Another similar error',
      similarity: 0.75,
      project: 'api',
      status: 'resolved',
    },
  ],
  enrichment_sources_used: ['release_context', 'performance_spans', 'grouping_info'],
  enrichment_sources_stale: ['performance_spans'],
  ranking_variant: 'multi-signal',
  model_info: {
    name: 'gpt-4',
    provider: 'openai',
    version: 'gpt-4-turbo-preview',
    context_window: 128000,
  },
  confidence_factors: {
    high_similarity_count: 1,
    enrichment_coverage: 0.27,
    freshness_score: 0.85,
    reasoning: 'Found 1 similar issue. Moderate enrichment coverage (27%). Data is fresh.',
  },
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('WhyThisAnswer', () => {
  it('renders confidence section', () => {
    renderWithRouter(<WhyThisAnswer transparency={mockTransparency} confidence={0.75} />);

    expect(screen.getByText('Why This Answer?')).toBeInTheDocument();
    expect(screen.getByText('Confidence Level')).toBeInTheDocument();
    expect(screen.getByText('75% HIGH')).toBeInTheDocument();
  });

  it('displays confidence breakdown metrics', () => {
    renderWithRouter(<WhyThisAnswer transparency={mockTransparency} confidence={0.75} />);

    expect(screen.getByText('High Similarity')).toBeInTheDocument();
    expect(screen.getByText('Coverage')).toBeInTheDocument();
    expect(screen.getByText('Freshness')).toBeInTheDocument();

    expect(screen.getByText('1')).toBeInTheDocument(); // high_similarity_count
    expect(screen.getByText('27%')).toBeInTheDocument(); // coverage
    expect(screen.getByText('85%')).toBeInTheDocument(); // freshness
  });

  it('shows low confidence warning when confidence < 0.7', () => {
    renderWithRouter(<WhyThisAnswer transparency={mockTransparency} confidence={0.5} />);

    expect(screen.getByText('Low Confidence Analysis')).toBeInTheDocument();
    expect(
      screen.getByText(/This analysis may be less reliable/i)
    ).toBeInTheDocument();
  });

  it('does not show warning when confidence >= 0.7', () => {
    renderWithRouter(<WhyThisAnswer transparency={mockTransparency} confidence={0.8} />);

    expect(screen.queryByText('Low Confidence Analysis')).not.toBeInTheDocument();
  });

  it('displays similar issues list', () => {
    renderWithRouter(<WhyThisAnswer transparency={mockTransparency} confidence={0.75} />);

    expect(screen.getByText('Similar Issues Analyzed (2)')).toBeInTheDocument();
    expect(screen.getByText('Similar error in production')).toBeInTheDocument();
    expect(screen.getByText('Another similar error')).toBeInTheDocument();

    expect(screen.getByText('89%')).toBeInTheDocument(); // similarity
    expect(screen.getByText('75%')).toBeInTheDocument(); // similarity
  });

  it('shows resolved badge for resolved issues', () => {
    renderWithRouter(<WhyThisAnswer transparency={mockTransparency} confidence={0.75} />);

    // Should show check icon for resolved issue
    const cards = screen.getAllByRole('button');
    expect(cards).toHaveLength(2);
  });

  it('displays enrichment sources used', () => {
    renderWithRouter(<WhyThisAnswer transparency={mockTransparency} confidence={0.75} />);

    expect(screen.getByText('Context Data Used (3)')).toBeInTheDocument();
    expect(screen.getByText('Release Context')).toBeInTheDocument();
    expect(screen.getByText('Performance Spans')).toBeInTheDocument();
    expect(screen.getByText('Grouping Info')).toBeInTheDocument();
  });

  it('marks stale sources with indicator', () => {
    renderWithRouter(<WhyThisAnswer transparency={mockTransparency} confidence={0.75} />);

    // Performance Spans should be marked as stale
    const performanceSpansBadge = screen.getByText('Performance Spans');
    expect(performanceSpansBadge).toBeInTheDocument();
  });

  it('displays analysis details', () => {
    renderWithRouter(<WhyThisAnswer transparency={mockTransparency} confidence={0.75} />);

    expect(screen.getByText('Analysis Details')).toBeInTheDocument();
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('openai')).toBeInTheDocument();
    expect(screen.getByText('gpt-4-turbo-preview')).toBeInTheDocument();
    expect(screen.getByText('multi-signal')).toBeInTheDocument();
  });

  it('similar issue cards are clickable', () => {
    renderWithRouter(<WhyThisAnswer transparency={mockTransparency} confidence={0.75} />);

    const cards = screen.getAllByRole('button');
    expect(cards.length).toBeGreaterThan(0);

    // Check accessibility
    cards.forEach(card => {
      expect(card).toHaveAttribute('tabIndex', '0');
      expect(card).toHaveAttribute('aria-label');
    });
  });

  it('displays reasoning text', () => {
    renderWithRouter(<WhyThisAnswer transparency={mockTransparency} confidence={0.75} />);

    expect(
      screen.getByText('Found 1 similar issue. Moderate enrichment coverage (27%). Data is fresh.')
    ).toBeInTheDocument();
  });

  it('handles zero similar issues', () => {
    const transparencyNoIssues: TransparencyInfo = {
      ...mockTransparency,
      similar_issues_count: 0,
      similar_issues: [],
    };

    renderWithRouter(<WhyThisAnswer transparency={transparencyNoIssues} confidence={0.3} />);

    expect(screen.queryByText('Similar Issues Analyzed')).not.toBeInTheDocument();
  });

  it('handles empty enrichment sources', () => {
    const transparencyNoEnrichment: TransparencyInfo = {
      ...mockTransparency,
      enrichment_sources_used: [],
    };

    renderWithRouter(<WhyThisAnswer transparency={transparencyNoEnrichment} confidence={0.4} />);

    expect(screen.queryByText('Context Data Used')).not.toBeInTheDocument();
  });
});
