// File: frontend/src/components/DeadlockDisplay/DeadlockDisplay.tsx

import React from 'react';
import { Paper, Text, Code, List } from '@mantine/core';

interface DeadlockInfo {
  waiting_process?: string;
  waiting_lock?: string;
  waiting_transaction?: string;
  blocking_process?: string;
  [key: string]: any; // For any additional fields
}

interface DeadlockDisplayProps {
  deadlockInfo: DeadlockInfo | null;
}

const DeadlockDisplay: React.FC<DeadlockDisplayProps> = ({ deadlockInfo }) => {
  // Renders the parsed deadlock information received from the backend
  if (!deadlockInfo) {
    return null; // Don't render if no info
  }

  // Basic text rendering for MVP
  return (
    <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-red-light)">
       <Text fw={500} mb="xs">Deadlock Details (Parsed)</Text>
       <List size="sm">
         {deadlockInfo.waiting_process && <List.Item>Waiting Process: <Code>{deadlockInfo.waiting_process}</Code></List.Item>}
         {deadlockInfo.waiting_lock && <List.Item>Waiting Lock: <Code>{deadlockInfo.waiting_lock}</Code></List.Item>}
         {deadlockInfo.waiting_transaction && <List.Item>Waiting Transaction: <Code>{deadlockInfo.waiting_transaction}</Code></List.Item>}
         {deadlockInfo.blocking_process && <List.Item>Blocking Process: <Code>{deadlockInfo.blocking_process}</Code></List.Item>}
         {/* Add other parsed fields if available */}
       </List>
       {/* Placeholder for future visualization */}
       {/* <Text size="xs" c="dimmed" mt="sm">(Visualization coming soon)</Text> */}
    </Paper>
  );
};

export default DeadlockDisplay;