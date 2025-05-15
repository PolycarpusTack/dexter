import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useTemplate,
  useCreateTemplate, 
  useUpdateTemplate,
  TemplateCategory,
  TemplateType,
  TemplateVariable,
  CreateTemplateRequest,
  UpdateTemplateRequest
} from '../../api/unified/hooks/useTemplates';
import { 
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  Group,
  MultiSelect,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
  ActionIcon,
  Table
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconPlus, IconTrash, IconDeviceFloppy } from '@tabler/icons-react';

/**
 * Template Edit component for creating and editing prompt templates
 */
export const TemplateEdit: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const isEditMode = templateId !== 'new';
  
  // Mutations for creating and updating templates
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  
  // Fetch template details if in edit mode
  const { data: templateData, isLoading: isTemplateLoading } = useTemplate(
    isEditMode ? templateId! : '',
    undefined,
    { enabled: isEditMode }
  );

  // Variables state
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [newVariable, setNewVariable] = useState<TemplateVariable>({
    name: '',
    description: '',
    required: false
  });

  // Form for template data
  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      category: TemplateCategory.GENERAL,
      type: TemplateType.COMBINED,
      content: '',
      is_default: false,
      is_public: true,
      tags: [] as string[],
      update_type: 'PATCH',
      version_changes: ''
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Name is required'),
      description: (value) => (value.trim().length > 0 ? null : 'Description is required'),
      content: (value) => (value.trim().length > 0 ? null : 'Content is required'),
    }
  });

  // Load template data if in edit mode
  useEffect(() => {
    if (isEditMode && templateData?.template) {
      const template = templateData.template;
      form.setValues({
        name: template.name,
        description: template.description,
        category: template.category,
        type: template.type,
        content: template.versions.find(v => v.version === template.latest_version)?.content || '',
        is_default: template.is_default,
        is_public: template.is_public,
        tags: template.tags || [],
        update_type: 'PATCH',
        version_changes: ''
      });
      setVariables(template.variables || []);
    }
  }, [isEditMode, templateData, form]);

  // Go back to template list or detail
  const handleBack = () => {
    if (isEditMode) {
      navigate(`/templates/${templateId}`);
    } else {
      navigate('/templates');
    }
  };

  // Add a new variable
  const handleAddVariable = () => {
    if (!newVariable.name.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Variable name is required',
        color: 'red'
      });
      return;
    }
    
    if (variables.some(v => v.name === newVariable.name)) {
      notifications.show({
        title: 'Error',
        message: 'Variable name must be unique',
        color: 'red'
      });
      return;
    }
    
    setVariables([...variables, newVariable]);
    setNewVariable({
      name: '',
      description: '',
      required: false,
      default_value: '',
      example: ''
    });
  };

  // Remove a variable
  const handleRemoveVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  // Update variable field
  const handleUpdateVariable = (index: number, field: keyof TemplateVariable, value: any) => {
    const newVariables = [...variables];
    newVariables[index] = {
      ...newVariables[index],
      [field]: value
    };
    setVariables(newVariables);
  };

  // Extract variables from template content
  const extractVariables = () => {
    const content = form.values.content;
    const varPattern = /\{\{([^}]+)\}\}/g;
    const foundVars: Set<string> = new Set();
    let match;
    
    while ((match = varPattern.exec(content)) !== null) {
      foundVars.add(match[1]);
    }
    
    // Add found variables if they don't already exist
    const existingVarNames = new Set(variables.map(v => v.name));
    const newVars: TemplateVariable[] = [...variables];
    
    for (const varName of foundVars) {
      if (!existingVarNames.has(varName)) {
        newVars.push({
          name: varName,
          description: `Variable ${varName}`,
          required: false
        });
      }
    }
    
    setVariables(newVars);
  };

  // Submit form - create or update template
  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (isEditMode) {
        // Update existing template
        const updateData: UpdateTemplateRequest = {
          name: values.name,
          description: values.description,
          category: values.category,
          type: values.type,
          content: values.content,
          variables: variables,
          is_default: values.is_default,
          is_public: values.is_public,
          tags: values.tags,
          version_changes: values.version_changes || undefined
        };
        
        await updateTemplate.mutateAsync({
          templateId: templateId!,
          template: updateData
        });
        
        notifications.show({
          title: 'Success',
          message: 'Template updated successfully',
          color: 'green'
        });
        
        navigate(`/templates/${templateId}`);
      } else {
        // Create new template
        const createData: CreateTemplateRequest = {
          name: values.name,
          description: values.description,
          category: values.category,
          type: values.type,
          content: values.content,
          variables: variables,
          is_default: values.is_default,
          is_public: values.is_public,
          tags: values.tags
        };
        
        const result = await createTemplate.mutateAsync(createData);
        
        notifications.show({
          title: 'Success',
          message: 'Template created successfully',
          color: 'green'
        });
        
        navigate(`/templates/${result.template.id}`);
      }
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: `Failed to ${isEditMode ? 'update' : 'create'} template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        color: 'red'
      });
    }
  };

  if (isEditMode && isTemplateLoading) {
    return <Text>Loading template...</Text>;
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack spacing="md">
        <Group position="apart">
          <Group>
            <Button 
              variant="subtle" 
              leftIcon={<IconArrowLeft size={16} />} 
              onClick={handleBack}
            >
              Back
            </Button>
            <Title order={2}>
              {isEditMode ? 'Edit Template' : 'Create New Template'}
            </Title>
          </Group>
          <Button 
            type="submit"
            leftIcon={<IconDeviceFloppy size={16} />}
            loading={createTemplate.isLoading || updateTemplate.isLoading}
          >
            {isEditMode ? 'Update Template' : 'Create Template'}
          </Button>
        </Group>

        <Card shadow="sm" p="md">
          <Title order={4}>Basic Information</Title>
          <Divider my="sm" />
          
          <Stack spacing="md">
            <TextInput
              label="Template Name"
              placeholder="Enter template name"
              required
              {...form.getInputProps('name')}
            />
            
            <Textarea
              label="Description"
              placeholder="Enter template description"
              minRows={2}
              required
              {...form.getInputProps('description')}
            />
            
            <Group grow>
              <Select
                label="Category"
                data={Object.values(TemplateCategory).map(cat => ({
                  value: cat,
                  label: cat.charAt(0).toUpperCase() + cat.slice(1)
                }))}
                required
                {...form.getInputProps('category')}
              />
              
              <Select
                label="Type"
                data={Object.values(TemplateType).map(type => ({
                  value: type,
                  label: type.charAt(0).toUpperCase() + type.slice(1)
                }))}
                required
                {...form.getInputProps('type')}
              />
            </Group>
            
            <Group>
              <Checkbox
                label="Set as default template for this category"
                {...form.getInputProps('is_default', { type: 'checkbox' })}
              />
              
              <Checkbox
                label="Public template"
                {...form.getInputProps('is_public', { type: 'checkbox' })}
              />
            </Group>
            
            <MultiSelect
              label="Tags"
              placeholder="Add tags"
              data={form.values.tags}
              value={form.values.tags}
              onChange={(value) => form.setFieldValue('tags', value)}
              searchable
              creatable
              getCreateLabel={(query) => `+ Create tag "${query}"`}
              onCreate={(query) => {
                form.setFieldValue('tags', [...form.values.tags, query]);
                return query;
              }}
            />
          </Stack>
        </Card>

        <Card shadow="sm" p="md">
          <Group position="apart">
            <Title order={4}>Template Content</Title>
            <Button 
              variant="light" 
              size="xs" 
              onClick={extractVariables}
            >
              Extract Variables
            </Button>
          </Group>
          <Text size="sm" color="dimmed">
            Use {{variable_name}} syntax for variables.
          </Text>
          <Divider my="sm" />
          
          <Textarea
            placeholder="Enter template content..."
            minRows={10}
            required
            {...form.getInputProps('content')}
          />
          
          {isEditMode && (
            <>
              <Divider my="sm" label="Version Information" labelPosition="center" />
              
              <Group grow align="flex-start">
                <Select
                  label="Update Type"
                  data={[
                    { value: 'PATCH', label: 'Patch (minor changes)' },
                    { value: 'MINOR', label: 'Minor (new features)' },
                    { value: 'MAJOR', label: 'Major (breaking changes)' }
                  ]}
                  {...form.getInputProps('update_type')}
                />
                
                <Textarea
                  label="Change Description"
                  placeholder="Describe changes in this version"
                  minRows={2}
                  {...form.getInputProps('version_changes')}
                />
              </Group>
            </>
          )}
        </Card>

        <Card shadow="sm" p="md">
          <Title order={4}>Variables</Title>
          <Text size="sm" color="dimmed">
            Define variables that can be used in the template.
          </Text>
          <Divider my="sm" />
          
          {variables.length > 0 && (
            <Box mb="md">
              <Table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Required</th>
                    <th>Default</th>
                    <th>Example</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {variables.map((variable, index) => (
                    <tr key={index}>
                      <td>{variable.name}</td>
                      <td>
                        <TextInput
                          size="xs"
                          value={variable.description}
                          onChange={(e) => handleUpdateVariable(index, 'description', e.currentTarget.value)}
                        />
                      </td>
                      <td>
                        <Checkbox
                          checked={variable.required}
                          onChange={(e) => handleUpdateVariable(index, 'required', e.currentTarget.checked)}
                        />
                      </td>
                      <td>
                        <TextInput
                          size="xs"
                          value={variable.default_value || ''}
                          onChange={(e) => handleUpdateVariable(index, 'default_value', e.currentTarget.value)}
                          placeholder="Default value"
                        />
                      </td>
                      <td>
                        <TextInput
                          size="xs"
                          value={variable.example || ''}
                          onChange={(e) => handleUpdateVariable(index, 'example', e.currentTarget.value)}
                          placeholder="Example"
                        />
                      </td>
                      <td>
                        <ActionIcon
                          color="red"
                          onClick={() => handleRemoveVariable(index)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Box>
          )}
          
          <Box mb="md">
            <Title order={5}>Add New Variable</Title>
            <Group align="flex-end" spacing="sm">
              <TextInput
                label="Name"
                placeholder="variable_name"
                value={newVariable.name}
                onChange={(e) => setNewVariable({ ...newVariable, name: e.currentTarget.value })}
                required
              />
              <TextInput
                label="Description"
                placeholder="Variable description"
                value={newVariable.description}
                onChange={(e) => setNewVariable({ ...newVariable, description: e.currentTarget.value })}
                required
              />
              <Checkbox
                label="Required"
                checked={newVariable.required}
                onChange={(e) => setNewVariable({ ...newVariable, required: e.currentTarget.checked })}
                mt={5}
              />
              <TextInput
                label="Default Value"
                placeholder="Default value"
                value={newVariable.default_value || ''}
                onChange={(e) => setNewVariable({ ...newVariable, default_value: e.currentTarget.value })}
              />
              <TextInput
                label="Example"
                placeholder="Example value"
                value={newVariable.example || ''}
                onChange={(e) => setNewVariable({ ...newVariable, example: e.currentTarget.value })}
              />
              <Button
                leftIcon={<IconPlus size={16} />}
                onClick={handleAddVariable}
              >
                Add
              </Button>
            </Group>
          </Box>
        </Card>
      </Stack>
    </form>
  );
};

export default TemplateEdit;