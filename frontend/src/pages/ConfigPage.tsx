import React, { useState } from 'react';
import { Container, Paper, Stack, TextInput, Title, Button, Alert } from '@mantine/core';
import useAppStore from '../store/appStore';
import { IconSettings } from '@tabler/icons-react';

export default function ConfigPage() {
  const { 
    organizationId, 
    projectId, 
    setOrganizationId, 
    setProjectId,
    apiToken,
    setApiToken
  } = useAppStore();
  
  const [tempOrgId, setTempOrgId] = useState(organizationId || '');
  const [tempProjectId, setTempProjectId] = useState(projectId || '');
  const [tempApiToken, setTempApiToken] = useState(apiToken || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setOrganizationId(tempOrgId);
    setProjectId(tempProjectId);
    setApiToken(tempApiToken);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <Paper p="lg" shadow="xs">
          <Title order={2} mb="md">
            <IconSettings size={24} style={{ marginRight: 8 }} />
            Application Configuration
          </Title>
          
          {saved && (
            <Alert color="green" mb="md">
              Configuration saved successfully!
            </Alert>
          )}
          
          <Stack gap="md">
            <TextInput
              label="Organization ID"
              value={tempOrgId}
              onChange={(e) => setTempOrgId(e.currentTarget.value)}
              placeholder="Enter your organization ID or slug"
              description="The organization ID or slug from your Sentry account"
            />
            
            <TextInput
              label="Project ID"
              value={tempProjectId}
              onChange={(e) => setTempProjectId(e.currentTarget.value)}
              placeholder="Enter your project ID or slug"
              description="The project ID or slug from your Sentry account"
            />
            
            <TextInput
              label="API Token"
              value={tempApiToken}
              onChange={(e) => setTempApiToken(e.currentTarget.value)}
              placeholder="Enter your Sentry API token"
              description="Your Sentry API token for authentication"
              type="password"
            />
            
            <Button onClick={handleSave} mt="md">
              Save Configuration
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}