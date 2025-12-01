/**
 * SummaryPanel Component
 *
 * Combines AI Summary and Source Facts in a unified panel
 */

import { Stack, SegmentedControl, Box } from '@mantine/core';
import { useState } from 'react';
import { AISummarySection } from './AISummarySection';
import { SourceFactsSection } from './SourceFactsSection';
import { AIAnalysis, EnrichmentData } from '../../types/enrichment';

interface SummaryPanelProps {
  aiAnalysis?: AIAnalysis;
  enrichment?: EnrichmentData;
  onWhyThisAnswer?: () => void;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
  aiAnalysis,
  enrichment,
  onWhyThisAnswer,
}) => {
  const [activeView, setActiveView] = useState<'ai' | 'facts'>('ai');
  const [highlightedSource, setHighlightedSource] = useState<string | undefined>();

  const handleCitationClick = (source: string) => {
    // Extract source key from citation source string
    // e.g., "release_context" -> "releaseContext"
    const sourceKey = source.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

    setHighlightedSource(sourceKey);
    setActiveView('facts');

    // Scroll to the accordion item after a brief delay
    setTimeout(() => {
      const element = document.querySelector(`[data-source="${sourceKey}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  return (
    <Stack gap="md">
      {/* View Selector */}
      <SegmentedControl
        value={activeView}
        onChange={(value) => setActiveView(value as 'ai' | 'facts')}
        data={[
          { label: 'AI Summary', value: 'ai' },
          { label: 'Source Facts', value: 'facts' },
        ]}
        fullWidth
      />

      {/* Content */}
      <Box>
        {activeView === 'ai' ? (
          <AISummarySection
            analysis={aiAnalysis}
            onCitationClick={handleCitationClick}
            onWhyThisAnswer={onWhyThisAnswer}
          />
        ) : (
          <SourceFactsSection
            enrichment={enrichment}
            highlightedSource={highlightedSource}
          />
        )}
      </Box>
    </Stack>
  );
};

export default SummaryPanel;
