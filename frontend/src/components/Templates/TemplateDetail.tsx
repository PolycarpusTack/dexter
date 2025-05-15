import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useTemplate, 
  useTemplateVersions, 
  useRenderTemplate 
} from '../../api/unified/hooks/useTemplates';
import { 
  Box, 
  Button, 
  Card, 
  Group, 
  Stack, 
  Text, 
  Title, 
  Badge, 
  Divider, 
  Select, 
  Table,
  Tabs,
  Textarea,
  TextInput
} from '@mantine/core';
import { IconArrowLeft, IconEdit, IconRocket, IconHistory } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

/**
 * Template Detail component to view and test a prompt template
 */
export const TemplateDetail: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('details');
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [renderedContent, setRenderedContent] = useState<string>('');

  // Fetch template details
  const { data: templateData, isLoading: isTemplateLoading } = useTemplate(
    templateId!,
    selectedVersion || undefined
  );
  
  // Fetch template versions
  const { data: versionsData, isLoading: isVersionsLoading } = useTemplateVersions(templateId!);
  
  // Render template mutation
  const renderTemplate = useRenderTemplate();

  // Go back to template list
  const handleBack = () => {
    navigate('/templates');
  };

  // Go to edit page
  const handleEdit = () => {
    navigate(`/templates/${templateId}/edit`);
  };

  // Handle variable value changes
  const handleVariableChange = (name: string, value: string) => {
    setVariableValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle template rendering
  const handleRenderTemplate = async () => {
    if (!templateId) return;
    
    try {
      const result = await renderTemplate.mutateAsync({
        templateId,
        variables: variableValues,
        version: selectedVersion || undefined
      });
      
      setRenderedContent(result.rendered_content);
      setActiveTab('preview');
      
      notifications.show({
        title: 'Template rendered',
        message: 'Template has been rendered successfully',
        color: 'green'
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: `Failed to render template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red'
      });
    }
  };

  // Handle version selection
  const handleVersionSelect = (version: string | null) => {
    setSelectedVersion(version);
  };

  if (isTemplateLoading) {
    return <Text>Loading template...</Text>;
  }

  if (!templateData?.template) {
    return <Text>Template not found.</Text>;
  }

  const template = templateData.template;
  const templateContent = template.versions.find(v => 
    v.version === (selectedVersion || template.latest_version)
  )?.content || '';

  return (
    <Stack spacing="md">
      <Group position="apart">
        <Group>
          <Button 
            variant="subtle" 
            leftIcon={<IconArrowLeft size={16} />} 
            onClick={handleBack}
          >
            Back to Templates
          </Button>
          <Title order={2}>{template.name}</Title>
          {template.is_default && (
            <Badge color="yellow">Default</Badge>
          )}
          <Badge>{template.category}</Badge>
          <Badge color="blue">{template.type}</Badge>
        </Group>
        <Button 
          leftIcon={<IconEdit size={16} />} 
          onClick={handleEdit}
        >
          Edit Template
        </Button>
      </Group>

      <Text color="dimmed">{template.description}</Text>

      <Group>
        <Text size="sm">Version: </Text>
        <Select
          value={selectedVersion || template.latest_version}
          onChange={handleVersionSelect}
          data={
            isVersionsLoading
              ? [{ value: template.latest_version, label: template.latest_version }]
              : (versionsData || []).map(v => ({
                  value: v.version,
                  label: `${v.version}${v.version === template.latest_version ? ' (latest)' : ''}`
                }))
          }
          style={{ width: 150 }}
        />
      </Group>

      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="details" icon={<IconHistory size={14} />}>Template Details</Tabs.Tab>
          <Tabs.Tab value="test" icon={<IconRocket size={14} />}>Test Template</Tabs.Tab>
          <Tabs.Tab value="preview" icon={<IconRocket size={14} />}>Preview</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="details" pt="xs">
          <Stack spacing="md">
            <Card shadow="sm" p="md">
              <Title order={4}>Template Content</Title>
              <Divider my="sm" />
              <Box sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                {templateContent}
              </Box>
            </Card>

            <Card shadow="sm" p="md">
              <Title order={4}>Variables</Title>
              <Divider my="sm" />
              {template.variables.length === 0 ? (
                <Text>No variables defined in this template.</Text>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Required</th>
                      <th>Default Value</th>
                      <th>Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    {template.variables.map(variable => (
                      <tr key={variable.name}>
                        <td>{variable.name}</td>
                        <td>{variable.description}</td>
                        <td>{variable.required ? 'Yes' : 'No'}</td>
                        <td>{variable.default_value || '-'}</td>
                        <td>{variable.example || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>

            <Card shadow="sm" p="md">
              <Title order={4}>Metadata</Title>
              <Divider my="sm" />
              <Table>
                <tbody>
                  <tr>
                    <td>ID</td>
                    <td>{template.id}</td>
                  </tr>
                  <tr>
                    <td>Created</td>
                    <td>{new Date(template.created_at).toLocaleString()}</td>
                  </tr>
                  {template.updated_at && (
                    <tr>
                      <td>Updated</td>
                      <td>{new Date(template.updated_at).toLocaleString()}</td>
                    </tr>
                  )}
                  <tr>
                    <td>Author</td>
                    <td>{template.author || 'Unknown'}</td>
                  </tr>
                  <tr>
                    <td>Public</td>
                    <td>{template.is_public ? 'Yes' : 'No'}</td>
                  </tr>
                  <tr>
                    <td>Tags</td>
                    <td>
                      {template.tags.length > 0 ? (
                        <Group spacing="xs">
                          {template.tags.map(tag => (
                            <Badge key={tag} size="sm">{tag}</Badge>
                          ))}
                        </Group>
                      ) : (
                        'No tags'
                      )}
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="test" pt="xs">
          <Stack spacing="md">
            <Card shadow="sm" p="md">
              <Title order={4}>Test Template</Title>
              <Text size="sm" color="dimmed">
                Fill in the variables below to test the template.
              </Text>
              <Divider my="sm" />
              
              {template.variables.length === 0 ? (
                <Text>No variables defined in this template.</Text>
              ) : (
                <Stack spacing="md">
                  {template.variables.map(variable => (
                    <TextInput
                      key={variable.name}
                      label={variable.name}
                      description={variable.description}
                      placeholder={variable.example || `Enter ${variable.name}...`}
                      required={variable.required}
                      value={variableValues[variable.name] || ''}
                      onChange={(e) => handleVariableChange(variable.name, e.currentTarget.value)}
                    />
                  ))}
                  
                  <Button
                    onClick={handleRenderTemplate}
                    loading={renderTemplate.isLoading}
                    disabled={template.variables.some(v => 
                      v.required && !variableValues[v.name]
                    )}
                  >
                    Render Template
                  </Button>
                </Stack>
              )}
            </Card>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="preview" pt="xs">
          <Stack spacing="md">
            <Card shadow="sm" p="md">
              <Title order={4}>Rendered Template</Title>
              <Divider my="sm" />
              {renderedContent ? (
                <Box sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {renderedContent}
                </Box>
              ) : (
                <Text>No rendered content yet. Go to the Test tab to render the template.</Text>
              )}
            </Card>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

export default TemplateDetail;