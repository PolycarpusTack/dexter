// React import required for JSX
import React from 'react';
import { Group, Title, Box } from '@mantine/core';
import { IconBrain } from '@tabler/icons-react';

export function Header() {
  return (
    <Box h={60} px="md">
      <Group h="100%" justify="space-between">
        <Group>
          <IconBrain size={30} />
          <Title order={3}>Dexter</Title>
        </Group>
      </Group>
    </Box>
  );
}
