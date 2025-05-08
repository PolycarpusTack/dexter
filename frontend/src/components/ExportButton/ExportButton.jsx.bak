// File: frontend/src/components/ExportButton/ExportButton.jsx (Updated)

import React, { useState } from 'react';
import { Button, Tooltip, Group, SegmentedControl } from '@mantine/core'; // Added Group, SegmentedControl
import { IconDownload } from '@tabler/icons-react';
import useAppStore from '../../store/appStore';

function ExportButton({ currentQuery, disabled = false }) {
  const { organizationSlug, projectSlug } = useAppStore((state) => ({
    organizationSlug: state.organizationSlug,
    projectSlug: state.projectSlug,
  }));

  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv'); // State for format selection

  const handleExport = () => {
    if (!organizationSlug || !projectSlug) {
      alert("Error: Organization or Project not configured.");
      return;
    }
    if (isExporting) return;

    setIsExporting(true);

    const params = new URLSearchParams();
    params.append('query', currentQuery || 'is:unresolved');
    params.append('format', exportFormat); // Use selected format
    // params.append('limit', '1000'); // Add limit if needed

    const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const exportUrl = `${backendBaseUrl}/organizations/${organizationSlug}/projects/${projectSlug}/issues/export?${params.toString()}`;

    console.log(`Triggering export (${exportFormat}) from URL:`, exportUrl);
    window.location.href = exportUrl;

    setTimeout(() => {
      setIsExporting(false);
    }, 3000);
  };

  return (
    // Group format selector and button
    <Group gap="xs">
        <SegmentedControl
            size="xs"
            value={exportFormat}
            onChange={setExportFormat}
            data={[
                { label: 'CSV', value: 'csv' },
                { label: 'JSON', value: 'json' },
            ]}
            disabled={isExporting || disabled}
            />
        <Tooltip label={`Export current view as ${exportFormat.toUpperCase()} (max 1000 rows)`}>
            <Button
                size="xs" // Match size with segmented control
                variant="outline"
                leftSection={<IconDownload size={14} />}
                onClick={handleExport}
                loading={isExporting}
                disabled={disabled || !organizationSlug || !projectSlug || isExporting}
            >
                Export
            </Button>
        </Tooltip>
    </Group>
  );
}

export default ExportButton;