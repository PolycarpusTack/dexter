# Prompt Templates System

This document provides an overview of the Prompt Templates System implemented in Dexter. The system allows for the management of AI prompt templates with versioning, variables, and category-based organization.

## Overview

The Prompt Templates System enables the creation, management, and usage of structured templates for AI error explanations and other AI-powered features. It provides a flexible foundation for:

- Creating and managing templates for different error categories
- Versioning templates to track changes over time
- Using variables in templates for dynamic content
- Organizing templates by category and type
- Setting default templates for different error types
- Rendering templates with variable substitution

## Architecture

The Prompt Templates System consists of the following components:

### Backend Components

1. **Template Models** (`/backend/app/models/template_models.py`)
   - `TemplateCategory`: Enum for different error categories (GENERAL, DATABASE, NETWORK, etc.)
   - `TemplateType`: Types of templates (SYSTEM, USER, COMBINED)
   - `TemplateVariable`: Model for variables used in templates
   - `TemplateVersion`: Version information with SemVer versioning
   - `PromptTemplate`: Core template model with versioning and metadata
   - Request/response models for API operations

2. **Template Service** (`/backend/app/services/template_service.py`)
   - Template creation, updating, deletion
   - Template versioning with SemVer
   - Template rendering with variable substitution
   - Default template management
   - Template storage and retrieval

3. **Templates API** (`/backend/app/routers/templates.py`)
   - RESTful API endpoints for template management
   - Endpoints for listing, creating, updating, and deleting templates
   - Endpoints for rendering templates with variables
   - Endpoints for managing template versions
   - Endpoints for managing default templates

### Frontend Components

1. **Template API Client** (`/frontend/src/api/unified/templateApi.ts`)
   - API client functions for template management
   - Type definitions for templates and operations
   - Integration with the enhanced API client architecture

2. **Template React Query Hooks** (`/frontend/src/api/unified/hooks/useTemplates.ts`)
   - React Query hooks for template operations
   - Data fetching with caching and state management
   - Optimistic updates for UI responsiveness

## Data Models

### TemplateCategory

Categorizes templates based on error types:

```typescript
enum TemplateCategory {
  GENERAL = 'general',
  DATABASE = 'database',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  SYNTAX = 'syntax',
  REFERENCE = 'reference',
  TYPE = 'type',
  MEMORY = 'memory',
  DEADLOCK = 'deadlock',
  TIMEOUT = 'timeout',
  CONFIGURATION = 'configuration',
  DEPENDENCY = 'dependency',
  CUSTOM = 'custom',
}
```

### TemplateVariable

Defines variables that can be used in templates:

```typescript
interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  default_value?: string;
  example?: string;
}
```

### PromptTemplate

The core template model:

```typescript
interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  type: TemplateType;
  variables: TemplateVariable[];
  versions: TemplateVersion[];
  latest_version: string;
  author?: string;
  created_at: string;
  updated_at?: string;
  is_default: boolean;
  is_public: boolean;
  tags: string[];
  model_specific?: Record<string, any>;
  provider_specific?: Record<string, any>;
}
```

## API Reference

### Template Management Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/templates` | GET | List templates with optional filtering |
| `/templates/{template_id}` | GET | Get a template by ID with optional version |
| `/templates` | POST | Create a new template |
| `/templates/{template_id}` | PUT | Update a template |
| `/templates/{template_id}` | DELETE | Delete a template |
| `/templates/{template_id}/render` | POST | Render a template with variables |
| `/templates/{template_id}/versions` | GET | Get all versions of a template |
| `/templates/categories/{category}/defaults` | GET | Get default templates for a category |
| `/templates/{template_id}/set-as-default` | POST | Set a template as default for its category |

### Template Frontend API

The template API client provides the following functions:

```typescript
// List templates with optional filtering
const templates = await templateApi.listTemplates(params);

// Get a template by ID
const template = await templateApi.getTemplate(templateId, version);

// Create a new template
const newTemplate = await templateApi.createTemplate(template);

// Update a template
const updatedTemplate = await templateApi.updateTemplate(templateId, template);

// Delete a template
await templateApi.deleteTemplate(templateId);

// Render a template with variables
const rendered = await templateApi.renderTemplate(templateId, variables, version);

// Get all versions of a template
const versions = await templateApi.getTemplateVersions(templateId);

// Get default templates for a category
const defaults = await templateApi.getDefaultTemplates(category, type);

// Set a template as default
const defaultTemplate = await templateApi.setTemplateAsDefault(templateId);
```

### React Query Hooks

The following React Query hooks are available for template operations:

```typescript
// Fetch a list of templates
const { data, isLoading } = useTemplates(params);

// Fetch a template by ID
const { data, isLoading } = useTemplate(templateId, version);

// Fetch template versions
const { data, isLoading } = useTemplateVersions(templateId);

// Fetch default templates for a category
const { data, isLoading } = useDefaultTemplates(category, type);

// Create a template
const { mutate, isLoading } = useCreateTemplate();
mutate(template);

// Update a template
const { mutate, isLoading } = useUpdateTemplate();
mutate({ templateId, template });

// Delete a template
const { mutate, isLoading } = useDeleteTemplate();
mutate(templateId);

// Render a template
const { mutate, isLoading } = useRenderTemplate();
mutate({ templateId, variables, version });

// Set a template as default
const { mutate, isLoading } = useSetTemplateAsDefault();
mutate(templateId);
```

## Template Creation and Usage

### Creating a Template

Templates can be created with variables for dynamic content:

```typescript
const template = await templateApi.createTemplate({
  name: 'Database Error Analysis',
  description: 'Template for analyzing database errors',
  category: TemplateCategory.DATABASE,
  type: TemplateType.SYSTEM,
  content: `Analyze the following database error:

{{error_message}}

Database: {{database_type}}

Query: {{query}}

Consider:
- Schema mismatches
- Connection issues
- Query syntax errors
- Constraint violations`,
  variables: [
    {
      name: 'error_message',
      description: 'The full error message',
      required: true
    },
    {
      name: 'database_type',
      description: 'The type of database (PostgreSQL, MySQL, etc.)',
      required: false,
      default_value: 'unknown'
    },
    {
      name: 'query',
      description: 'The database query that caused the error',
      required: false
    }
  ],
  is_default: true,
  is_public: true,
  tags: ['database', 'error', 'analysis']
});
```

### Rendering a Template

Templates can be rendered with variable substitution:

```typescript
const rendered = await templateApi.renderTemplate(
  templateId,
  {
    error_message: 'ERROR: duplicate key value violates unique constraint "users_email_key"',
    database_type: 'PostgreSQL',
    query: 'INSERT INTO users (name, email) VALUES (\'John Doe\', \'john@example.com\')'
  }
);
```

## Integration with AI Features

The Prompt Templates System is integrated with the AI explanation features:

1. When explaining an error, the system selects an appropriate template based on the error category
2. The template is rendered with error-specific variables
3. The rendered template is sent to the AI model for processing
4. The AI response is displayed to the user

## Default Templates

The system includes default templates for common error categories:

- **General Error Analysis**: A general-purpose template for analyzing errors
- **Database Error Analysis**: For database-related errors including queries and schema issues
- **Network Error Analysis**: For network and API communication errors
- **Syntax Error Analysis**: For code syntax errors in different languages
- **Deadlock Analysis**: For database deadlocks and concurrency issues

## Version Control

Templates use SemVer versioning to track changes:

- **Major Version**: Breaking changes to the template structure
- **Minor Version**: New features or significant content changes
- **Patch Version**: Bug fixes and minor content updates

Each template stores all its versions, allowing for historical reference and rollback if needed.

## Best Practices

1. **Template Organization**:
   - Use appropriate categories for templates
   - Use descriptive names and detailed descriptions
   - Add relevant tags for easier discovery

2. **Template Content**:
   - Follow a consistent structure for similar templates
   - Use clear instruction formatting for AI models
   - Include examples where helpful

3. **Template Variables**:
   - Use descriptive names for variables
   - Provide clear descriptions for each variable
   - Make variables required only when necessary
   - Provide default values for optional variables

4. **Template Maintenance**:
   - Review and update templates periodically
   - Use appropriate versioning for template changes
   - Test templates with different variable values

## Future Enhancements

Planned enhancements for the Prompt Templates System:

1. **Template Editor UI**: A user-friendly interface for creating and editing templates
2. **Template Sharing**: Ability to share templates between organizations
3. **Template Analytics**: Track template usage and effectiveness
4. **Template Testing**: Integrated testing of templates with sample values
5. **Template Import/Export**: Import and export templates in JSON format
6. **Template Recommendations**: AI-powered recommendations for template improvements