#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Read the OpenAPI spec
const openApiFile = path.join(__dirname, '../docs/sentry-api.yaml');
const openApiSpec = yaml.load(fs.readFileSync(openApiFile, 'utf8'));

// Function to convert OpenAPI operation IDs to proper names
function getOperationName(path, method, operation) {
  if (operation.operationId) {
    return operation.operationId;
  }
  
  // Generate from summary or path
  const summary = operation.summary || '';
  let name = summary.replace(/[^a-zA-Z0-9]/g, '');
  
  if (!name) {
    // Fallback to path-based naming
    name = path.replace(/[{}\/]/g, '_').replace(/__+/g, '_');
    name = name.replace(/^_|_$/g, '');
    name = method.charAt(0).toUpperCase() + method.slice(1) + name;
  }
  
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Function to generate TypeScript types
function generateTypeScriptTypes(spec) {
  const types = [];
  const processedTypes = new Set();
  
  // Add base types and imports
  types.push(`// Auto-generated from Sentry OpenAPI specification
// DO NOT EDIT MANUALLY

// Base types for Sentry API
export interface SentryError {
  detail: string;
  status?: number;
  errorId?: string;
}

export interface SentryPaginationParams {
  cursor?: string;
  per_page?: number;
}

export interface SentryDateParams {
  start?: string;
  end?: string;
  statsPeriod?: string;
}

export interface SentryBulkResponse<T> {
  successful: T[];
  failed: Array<{
    item: any;
    error: SentryError;
  }>;
}

// Common Sentry types based on actual API patterns
export interface SentryEvent {
  id: string;
  groupID?: string;
  eventID: string;
  projectID: string;
  title: string;
  message?: string;
  platform?: string;
  dateCreated: string;
  dateReceived: string;
  type: string;
  metadata?: Record<string, any>;
  tags: Array<{ key: string; value: string }>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
    ip_address?: string;
  };
  contexts?: Record<string, any>;
  entries?: any[];
}

export interface SentryIssue {
  id: string;
  title: string;
  culprit: string;
  permalink: string;
  status: 'resolved' | 'unresolved' | 'ignored';
  substatus?: 'archived' | 'escalating' | 'new' | 'ongoing' | 'regressed';
  isPublic: boolean;
  platform: string;
  project: {
    id: string;
    name: string;
    slug: string;
  };
  type: string;
  metadata: Record<string, any>;
  numComments: number;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  isBookmarked: boolean;
  hasSeen: boolean;
  annotations: string[];
  count: string;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  stats: {
    [period: string]: Array<[number, number]>;
  };
}

export interface SentryProject {
  id: string;
  slug: string;
  name: string;
  platform?: string;
  dateCreated: string;
  isBookmarked: boolean;
  features: string[];
  status: string;
  firstEvent?: string;
  avatar?: {
    avatarType?: string;
    avatarUrl?: string;
  };
}

export interface SentryOrganization {
  id: string;
  slug: string;
  name: string;
  dateCreated: string;
  isEarlyAdopter: boolean;
  features: string[];
  status: {
    id: string;
    name: string;
  };
  avatar: {
    avatarType?: string;
    avatarUrl?: string;
  };
}

export interface SentryRelease {
  version: string;
  ref?: string;
  url?: string;
  dateCreated: string;
  dateReleased?: string;
  data: Record<string, any>;
  newGroups: number;
  owner?: string;
  commitCount: number;
  lastCommit?: {
    id: string;
    repository: {
      name: string;
      url: string;
    };
    message: string;
    dateCreated: string;
  };
  deployCount: number;
  lastDeploy?: {
    id: string;
    environment: string;
    dateStarted?: string;
    dateFinished: string;
  };
}
`);

  // Process each path
  Object.entries(spec.paths).forEach(([path, pathItem]) => {
    Object.entries(pathItem).forEach(([method, operation]) => {
      if (method === 'parameters' || !operation) return;
      
      const operationName = getOperationName(path, method, operation);
      
      // Skip if already processed
      if (processedTypes.has(operationName)) return;
      processedTypes.add(operationName);
      
      // Extract path parameters
      const pathParams = path.match(/{([^}]+)}/g)?.map(p => p.slice(1, -1)) || [];
      
      // Generate request interface
      types.push(`export interface ${operationName}Request {`);
      
      // Path parameters
      pathParams.forEach(param => {
        types.push(`  ${param}: string;`);
      });
      
      // Query parameters
      if (operation.parameters) {
        operation.parameters.forEach(param => {
          if (!param.name) return;
          const isRequired = param.required ? '' : '?';
          const type = getTypeScriptType(param.schema || param);
          types.push(`  ${param.name}${isRequired}: ${type};`);
        });
      }
      
      // Request body
      if (operation.requestBody) {
        let bodyType = 'any';
        if (operation.requestBody.content?.['application/json']?.schema) {
          bodyType = getTypeScriptType(operation.requestBody.content['application/json'].schema);
        }
        types.push(`  body?: ${bodyType};`);
      }
      
      types.push(`}\n`);
      
      // Generate response interface (simplified)
      types.push(`export interface ${operationName}Response {
  data?: any; // TODO: Define based on actual API response structure
  headers?: Record<string, string>;
  error?: SentryError;
}\n`);
    });
  });
  
  return types.join('\n');
}

// Function to generate Pydantic models
function generatePydanticModels(spec) {
  const models = [];
  const processedModels = new Set();
  
  models.push(`# Auto-generated from Sentry OpenAPI specification
# DO NOT EDIT MANUALLY

from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum


class SentryError(BaseModel):
    detail: str
    status: Optional[int] = None
    error_id: Optional[str] = Field(None, alias='errorId')


class SentryPaginationParams(BaseModel):
    cursor: Optional[str] = None
    per_page: Optional[int] = Field(None, alias='per_page', ge=1, le=100)


class SentryDateParams(BaseModel):
    start: Optional[str] = None
    end: Optional[str] = None
    stats_period: Optional[str] = Field(None, alias='statsPeriod')


class StatusEnum(str, Enum):
    RESOLVED = 'resolved'
    UNRESOLVED = 'unresolved'
    IGNORED = 'ignored'


class SubstatusEnum(str, Enum):
    ARCHIVED = 'archived'
    ESCALATING = 'escalating'
    NEW = 'new'
    ONGOING = 'ongoing'
    REGRESSED = 'regressed'


class User(BaseModel):
    id: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    ip_address: Optional[str] = None


class Project(BaseModel):
    id: str
    name: str
    slug: str


class SentryIssue(BaseModel):
    id: str
    title: str
    culprit: str
    permalink: str
    status: StatusEnum
    substatus: Optional[SubstatusEnum] = None
    is_public: bool = Field(..., alias='isPublic')
    platform: str
    project: Project
    type: str
    metadata: Dict[str, Any]
    num_comments: int = Field(..., alias='numComments')
    assigned_to: Optional[Dict[str, Any]] = Field(None, alias='assignedTo')
    is_bookmarked: bool = Field(..., alias='isBookmarked')
    has_seen: bool = Field(..., alias='hasSeen')
    annotations: List[str]
    count: str
    user_count: int = Field(..., alias='userCount')
    first_seen: str = Field(..., alias='firstSeen')
    last_seen: str = Field(..., alias='lastSeen')
    stats: Dict[str, List[List[int]]]


class SentryEvent(BaseModel):
    id: str
    group_id: Optional[str] = Field(None, alias='groupID')
    event_id: str = Field(..., alias='eventID')
    project_id: str = Field(..., alias='projectID')
    title: str
    message: Optional[str] = None
    platform: Optional[str] = None
    date_created: str = Field(..., alias='dateCreated')
    date_received: str = Field(..., alias='dateReceived')
    type: str
    metadata: Optional[Dict[str, Any]] = None
    tags: List[Dict[str, str]]
    user: Optional[User] = None
    contexts: Optional[Dict[str, Any]] = None
    entries: Optional[List[Any]] = None
`);

  // Process each path for Pydantic models
  Object.entries(spec.paths).forEach(([path, pathItem]) => {
    Object.entries(pathItem).forEach(([method, operation]) => {
      if (method === 'parameters' || !operation) return;
      
      const operationName = getOperationName(path, method, operation);
      
      // Skip if already processed
      if (processedModels.has(operationName)) return;
      processedModels.add(operationName);
      
      // Extract path parameters
      const pathParams = path.match(/{([^}]+)}/g)?.map(p => p.slice(1, -1)) || [];
      
      // Generate request model
      models.push(`class ${operationName}Request(BaseModel):`);
      
      let hasFields = false;
      
      // Path parameters
      pathParams.forEach(param => {
        models.push(`    ${param}: str`);
        hasFields = true;
      });
      
      // Query parameters
      if (operation.parameters) {
        operation.parameters.forEach(param => {
          if (!param.name) return;
          const type = getPythonType(param.schema || param);
          const required = param.required ? '' : ' = None';
          const fieldAlias = param.name.includes('_') ? `, alias='${param.name}'` : '';
          models.push(`    ${param.name.replace(/-/g, '_')}: ${type}${required}${fieldAlias ? ` = Field(None${fieldAlias})` : ''}`);
          hasFields = true;
        });
      }
      
      // Request body
      if (operation.requestBody) {
        models.push(`    body: Optional[Dict[str, Any]] = None`);
        hasFields = true;
      }
      
      if (!hasFields) {
        models.push(`    pass`);
      }
      
      models.push(`\n`);
      
      // Generate response model
      models.push(`class ${operationName}Response(BaseModel):
    data: Optional[Any] = None  # TODO: Define based on actual API response
    headers: Optional[Dict[str, str]] = None
    error: Optional[SentryError] = None\n`);
    });
  });
  
  return models.join('\n');
}

// Helper function to convert OpenAPI types to TypeScript
function getTypeScriptType(schema) {
  if (!schema) return 'any';
  
  if (schema.type === 'string') {
    if (schema.enum) {
      return schema.enum.map(val => `'${val}'`).join(' | ');
    }
    return schema.format === 'date-time' ? 'string' : 'string';
  }
  
  switch (schema.type) {
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return `${getTypeScriptType(schema.items)}[]`;
    case 'object':
      if (schema.properties) {
        const props = Object.entries(schema.properties)
          .map(([key, prop]) => `${key}?: ${getTypeScriptType(prop)}`)
          .join('; ');
        return `{ ${props} }`;
      }
      return 'Record<string, any>';
    default:
      return 'any';
  }
}

// Helper function to convert OpenAPI types to Python
function getPythonType(schema) {
  if (!schema) return 'Any';
  
  if (schema.type === 'string') {
    if (schema.enum) {
      // For enums, we'd ideally create an Enum class, but for simplicity:
      return `Union[${schema.enum.map(val => `"${val}"`).join(', ')}]`;
    }
    return 'str';
  }
  
  switch (schema.type) {
    case 'integer':
      return 'int';
    case 'number':
      return 'float';
    case 'boolean':
      return 'bool';
    case 'array':
      return `List[${getPythonType(schema.items).replace('Optional[', '').replace(']', '')}]`;
    case 'object':
      if (schema.properties) {
        return 'Dict[str, Any]';  // Simplified for now
      }
      return 'Dict[str, Any]';
    default:
      return 'Any';
  }
}

// Create output directories
const tsOutputDir = path.join(__dirname, '../frontend/src/types/api');
const pyOutputDir = path.join(__dirname, '../backend/app/models/api');

fs.mkdirSync(tsOutputDir, { recursive: true });
fs.mkdirSync(pyOutputDir, { recursive: true });

// Generate and save TypeScript types
const tsTypes = generateTypeScriptTypes(openApiSpec);
fs.writeFileSync(path.join(tsOutputDir, 'sentry-generated.ts'), tsTypes);

// Generate and save Pydantic models
const pydanticModels = generatePydanticModels(openApiSpec);
fs.writeFileSync(path.join(pyOutputDir, 'sentry_generated.py'), pydanticModels);

// Create index.ts that preserves existing types
const indexContent = `// Auto-generated Sentry API types
export * from './sentry-generated';

// Re-export existing types to maintain backward compatibility
// Note: If there are conflicts, the existing types take precedence
export * from './sentry';
`;
fs.writeFileSync(path.join(tsOutputDir, 'index.ts'), indexContent);

// Create __init__.py that preserves existing models
const initContent = `# Auto-generated Sentry API models
from .sentry_generated import *

# Import existing models to maintain backward compatibility
# Note: If there are conflicts, the existing models take precedence
try:
    from .sentry import *
except ImportError:
    pass  # No existing models yet
`;
fs.writeFileSync(path.join(pyOutputDir, '__init__.py'), initContent);

console.log('✅ Generated TypeScript types in:', tsOutputDir);
console.log('✅ Generated Pydantic models in:', pyOutputDir);
console.log('📝 Note: Existing types are preserved and take precedence over generated ones');
