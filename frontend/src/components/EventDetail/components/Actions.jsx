// File: frontend/src/components/EventDetail/components/Actions.jsx

import React from "react";
import { Grid, Group, Button } from "@mantine/core";
import { IconCheck, IconBan } from "@tabler/icons-react";
import AIModelSettings from "../../Settings/AIModelSettings";

/**
 * Actions component for EventDetail
 * Displays issue actions and AI model settings
 */
function Actions({ onResolve, onIgnore, isLoading }) {
  return (
    <Grid mb="md" gutter="md">
      <Grid.Col span={8}>
        <Group>
          <Button
            leftSection={<IconCheck size={16} />}
            onClick={onResolve}
            loading={isLoading}
            color="teal"
          >
            Resolve
          </Button>
          <Button
            leftSection={<IconBan size={16} />}
            onClick={onIgnore}
            loading={isLoading}
            variant="outline"
          >
            Ignore
          </Button>
        </Group>
      </Grid.Col>
      <Grid.Col span={4}>
        <AIModelSettings />
      </Grid.Col>
    </Grid>
  );
}

export default Actions;
