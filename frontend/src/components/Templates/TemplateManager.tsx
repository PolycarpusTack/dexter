import React, { useState } from 'react';
import { 
  useTemplates, 
  useDeleteTemplate, 
  useSetTemplateAsDefault, 
  TemplateCategory, 
  TemplateType 
} from '../../api/unified/hooks/useTemplates';
import { Box, Button, Card, Group, Select, Stack, Table, Text, TextInput, Title, Badge, Tabs } from '@mantine/core';
import { IconPlus, IconSearch, IconTrash, IconStar, IconStarFilled } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';

/**
 * Template Manager component for listing and managing prompt templates
 */
export const TemplateManager: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('all');

  // Query templates with filters
  const { data, isLoading, refetch } = useTemplates({
    query: search || undefined,
    category: category as TemplateCategory | undefined,
    is_default: isDefault === 'true' ? true : isDefault === 'false' ? false : undefined,
    limit: 100
  });

  // Mutations
  const deleteTemplate = useDeleteTemplate();
  const setAsDefault = useSetTemplateAsDefault();

  // Handle template deletion
  const handleDelete = async (templateId: string, templateName: string) => {
    if (window.confirm(`Are you sure you want to delete template "${templateName}"?`)) {
      try {
        await deleteTemplate.mutateAsync(templateId);
        notifications.show({
          title: 'Template deleted',
          message: `Template "${templateName}" has been deleted`,
          color: 'green'
        });
      } catch (error) {
        notifications.show({
          title: 'Error',
          message: `Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`,
          color: 'red'
        });
      }
    }
  };

  // Handle setting a template as default
  const handleSetAsDefault = async (templateId: string, templateName: string) => {
    try {
      await setAsDefault.mutateAsync(templateId);
      notifications.show({
        title: 'Template set as default',
        message: `Template "${templateName}" has been set as default for its category`,
        color: 'green'
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: `Failed to set template as default: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red'
      });
    }
  };

  // Create a new template
  const handleCreateNew = () => {
    navigate('/templates/new');
  };

  // Edit a template
  const handleEdit = (templateId: string) => {
    navigate(`/templates/${templateId}/edit`);
  };

  // View a template
  const handleView = (templateId: string) => {
    navigate(`/templates/${templateId}`);
  };

  // Filter templates by category for each tab
  const getFilteredTemplates = () => {
    if (!data?.templates) return [];
    
    if (activeTab === 'all') {
      return data.templates;
    }
    
    return data.templates.filter(template => 
      template.category === activeTab as TemplateCategory
    );
  };

  const filteredTemplates = getFilteredTemplates();

  // Calculate counts for each category
  const categoryCounts = data?.templates.reduce((acc, template) => {
    const category = template.category;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <Stack spacing="md">
      <Group position="apart">
        <Title order={2}>Prompt Templates</Title>
        <Button 
          leftIcon={<IconPlus size={16} />} 
          onClick={handleCreateNew}
        >
          Create New Template
        </Button>
      </Group>

      <Card shadow="sm" p="md">
        <Stack spacing="xs">
          <Group grow>
            <TextInput
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              icon={<IconSearch size={16} />}
            />
            <Group grow>
              <Select
                placeholder="Filter by category"
                clearable
                value={category}
                onChange={setCategory}
                data={Object.values(TemplateCategory).map(cat => ({
                  value: cat,
                  label: cat.charAt(0).toUpperCase() + cat.slice(1)
                }))}
              />
              <Select
                placeholder="Default templates"
                clearable
                value={isDefault}
                onChange={setIsDefault}
                data={[
                  { value: 'true', label: 'Default only' },
                  { value: 'false', label: 'Non-default only' }
                ]}
              />
            </Group>
          </Group>
        </Stack>
      </Card>

      <Tabs value={activeTab} onTabChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="all">
            All ({data?.templates.length || 0})
          </Tabs.Tab>
          {Object.entries(categoryCounts).map(([category, count]) => (
            <Tabs.Tab 
              key={category} 
              value={category}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)} ({count})
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <Box>
        {isLoading ? (
          <Text>Loading templates...</Text>
        ) : filteredTemplates.length === 0 ? (
          <Text>No templates found.</Text>
        ) : (
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Type</th>
                <th>Version</th>
                <th>Variables</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.map(template => (
                <tr key={template.id}>
                  <td>
                    <Group spacing="xs">
                      {template.is_default && (
                        <IconStarFilled size={16} color="gold" />
                      )}
                      <Text weight={500}>{template.name}</Text>
                    </Group>
                    <Text size="xs" color="dimmed">{template.description}</Text>
                  </td>
                  <td>
                    <Badge>
                      {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                    </Badge>
                  </td>
                  <td>{template.type}</td>
                  <td>{template.latest_version}</td>
                  <td>{template.variables.length}</td>
                  <td>
                    <Group spacing="xs">
                      <Button 
                        variant="subtle" 
                        compact 
                        onClick={() => handleView(template.id)}
                      >
                        View
                      </Button>
                      <Button 
                        variant="subtle" 
                        compact 
                        onClick={() => handleEdit(template.id)}
                      >
                        Edit
                      </Button>
                      {!template.is_default && (
                        <Button 
                          variant="subtle" 
                          color="yellow" 
                          compact
                          onClick={() => handleSetAsDefault(template.id, template.name)}
                          disabled={setAsDefault.isLoading}
                        >
                          <IconStar size={16} />
                        </Button>
                      )}
                      <Button 
                        variant="subtle" 
                        color="red" 
                        compact
                        onClick={() => handleDelete(template.id, template.name)}
                        disabled={deleteTemplate.isLoading}
                      >
                        <IconTrash size={16} />
                      </Button>
                    </Group>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Box>
    </Stack>
  );
};

export default TemplateManager;