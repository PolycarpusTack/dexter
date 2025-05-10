// File: frontend/src/components/Settings/AIModelSettings.tsx

import { useState } from 'react';
import {
  Paper,
  Group,
  Title,
  Text,
  Menu,
  ActionIcon,
  Tooltip,
  Badge,
  ThemeIcon,
  Modal,
  Button
} from '@mantine/core';
import {
  IconBrain,
  IconSettings,
  IconDotsVertical,
  IconRefresh,
  IconCheck
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { fetchModelsList } from '../../api/modelApi';
import ModelSelector from '../ModelSelector/ModelSelector';
import useAppStore from '../../store/appStore';

interface Model {
  name: string;
  status: string;
  size?: number;
  quantization?: string;
  family?: string;
}

interface ModelsData {
  models: Model[];
  current_model?: string;
}

/**
 * Compact AI model settings component that can be placed in various parts of the UI
 * to allow quick access to model selection
 */
function AIModelSettings(): JSX.Element {
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const { activeAIModel } = useAppStore();
  
  // Fetch current model status
  const { data: modelsData, isLoading, refetch } = useQuery<ModelsData, Error>({
    queryKey: ['ollamaModels'],
    queryFn: fetchModelsList,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false
  });
  
  // Find the active model in the models list and render a status tooltip
  const currentModelName = activeAIModel || modelsData?.current_model || 'Unknown';
  const activeModel = modelsData?.models?.find(m => m.name === currentModelName);
  const isModelAvailable = activeModel?.status === 'available';
  
  const modelStatus = isModelAvailable ? (
    <Tooltip label="Model is loaded and ready" withArrow>
      <Badge size="xs" color="green" leftSection={<IconCheck size={10} />}>
        Ready
      </Badge>
    </Tooltip>
  ) : isLoading ? (
    <Badge size="xs" color="gray" leftSection={<Button size="xs" loading={isLoading} variant="subtle" />}>
      Checking...
    </Badge>
  ) : (
    <Tooltip label="Model needs to be downloaded or loaded" withArrow>
      <Badge size="xs" color="yellow">
        Not ready
      </Badge>
    </Tooltip>
  );
  
  return (
    <>
      <Paper p="xs" withBorder radius="md">
        <Group justify="apart">
          <Group>
            <ThemeIcon color="grape" radius="xl" size="md">
              <IconBrain size={16} />
            </ThemeIcon>
            <div>
              <Text size="sm" fw={500}>Active AI Model</Text>
              <Group gap={4}>
                <Text size="xs" color="dimmed">
                  {currentModelName}
                </Text>
                {modelStatus}
              </Group>
            </div>
          </Group>
          
          <Menu position="bottom-end" shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            
            <Menu.Dropdown>
              <Menu.Label>AI Model</Menu.Label>
              <Menu.Item 
                leftSection={<IconSettings size={14} />}
                onClick={() => setModalOpen(true)}
              >
                Change model
              </Menu.Item>
              <Menu.Item
                leftSection={<IconRefresh size={14} />}
                onClick={() => refetch()}
              >
                Check status
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Paper>
      
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          <Group>
            <Title order={4}>AI Model Selection</Title>
            <Badge size="sm" color="grape">Current: {currentModelName}</Badge>
          </Group>
        }
        size="lg"
      >
        <ModelSelector onModelChange={() => setModalOpen(false)} />
      </Modal>
    </>
  );
}

export default AIModelSettings;