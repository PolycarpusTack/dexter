// File: frontend/src/components/Export/ExportControl.tsx

import { useState } from 'react';
import { Button, Group, SegmentedControl, Popover, Text, Stack } from '@mantine/core';
import { IconDownload, IconFile, IconFileSpreadsheet } from '@tabler/icons-react';
import { showSuccessNotification, showErrorNotification } from '../../utils/errorHandling';
import { useAuthStore, useFilterStore } from '../../store';
import { downloadFile } from '../../api/exportApi';

type ExportFormat = 'csv' | 'json';

interface ExportOptions {
  organizationSlug: string;
  projectSlug: string;
  format: ExportFormat;
  status?: string;
  query?: string;
}

/**
 * Export Control component for exporting issue data in CSV or JSON format
 */
function ExportControl(): JSX.Element {
  const [opened, setOpened] = useState<boolean>(false);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const { organizationSlug, projectSlug } = useAuthStore();
  const { statusFilter, searchQuery } = useFilterStore();

  const handleExport = async (): Promise<void> => {
    if (!organizationSlug || !projectSlug) {
      showErrorNotification({
        title: 'Export Error',
        error: 'Please configure Sentry organization and project first',
      });
      return;
    }

    setIsExporting(true);

    try {
      const exportOptions: ExportOptions = {
        organizationSlug,
        projectSlug,
        format,
        status: statusFilter,
        query: searchQuery
      };

      await downloadFile(exportOptions);

      showSuccessNotification({
        title: 'Export Successful',
        message: `Issues exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      showErrorNotification({
        title: 'Export Failed',
        error,
      });
    } finally {
      setIsExporting(false);
      setOpened(false);
    }
  };

  return (
    <Popover
      width={300}
      position="bottom-end"
      withArrow
      shadow="md"
      opened={opened}
      onChange={setOpened}
    >
      <Popover.Target>
        <Button
          leftSection={<IconDownload size={18} />}
          variant="light"
          onClick={() => setOpened((o) => !o)}
          disabled={!organizationSlug || !projectSlug}
        >
          Export
        </Button>
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="md">
          <Text size="sm" fw={500}>
            Export Format
          </Text>

          <SegmentedControl
            value={format}
            onChange={(value) => setFormat(value as ExportFormat)}
            data={[
              {
                value: 'csv',
                label: (
                  <Group gap="xs" justify="center">
                    <IconFileSpreadsheet size={16} />
                    <span>CSV</span>
                  </Group>
                ),
              },
              {
                value: 'json',
                label: (
                  <Group gap="xs" justify="center">
                    <IconFile size={16} />
                    <span>JSON</span>
                  </Group>
                ),
              },
            ]}
          />

          <Button
            onClick={handleExport}
            loading={isExporting}
            fullWidth
          >
            Download
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

export default ExportControl;
