// File: frontend/src/components/Export/ExportControl.jsx

import { useState } from 'react';
import { Button, Group, SegmentedControl, Popover, Text, Stack } from '@mantine/core';
import { IconDownload, IconFile, IconFileSpreadsheet } from '@tabler/icons-react';
import { showSuccessNotification, showErrorNotification } from '../../utils/errorHandling';
import useAppStore from '../../store/appStore';
import { downloadFile } from '../../api/exportApi';

/**
 * Export Control component for exporting issue data in CSV or JSON format
 */
function ExportControl() {
  const [opened, setOpened] = useState(false);
  const [format, setFormat] = useState('csv');
  const [isExporting, setIsExporting] = useState(false);
  
  const { organizationSlug, projectSlug, statusFilter, searchQuery } = useAppStore(
    (state) => ({
      organizationSlug: state.organizationSlug,
      projectSlug: state.projectSlug,
      statusFilter: state.statusFilter,
      searchQuery: state.searchQuery
    })
  );

  const handleExport = async () => {
    if (!organizationSlug || !projectSlug) {
      showErrorNotification({
        title: 'Export Error',
        error: 'Please configure Sentry organization and project first',
      });
      return;
    }

    setIsExporting(true);
    
    try {
      await downloadFile({
        organizationSlug,
        projectSlug,
        format,
        status: statusFilter,
        query: searchQuery
      });
      
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

  // Format options with icons
  const formatIcon = format === 'csv' ? <IconFileSpreadsheet size={16} /> : <IconFile size={16} />;

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      width={200}
      position="bottom-end"
      shadow="md"
    >
      <Popover.Target>
        <Button 
          leftSection={<IconDownload size={16} />}
          variant="light"
          onClick={() => setOpened((o) => !o)}
        >
          Export
        </Button>
      </Popover.Target>
      
      <Popover.Dropdown>
        <Stack>
          <Text size="sm" fw={500}>Export Format</Text>
          <SegmentedControl
            value={format}
            onChange={setFormat}
            data={[
              { label: 'CSV', value: 'csv' },
              { label: 'JSON', value: 'json' },
            ]}
            size="xs"
          />
          <Button
            fullWidth
            leftSection={formatIcon}
            loading={isExporting}
            onClick={handleExport}
            size="sm"
          >
            Download {format.toUpperCase()}
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

export default ExportControl;
