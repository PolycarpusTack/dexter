# ModelSelector Components Migration Guide

This document provides step-by-step instructions for migrating the ModelSelector components to use the unified API client architecture.

## Files to Update

- `/frontend/src/components/ModelSelector/ModelSelector.tsx`
- `/frontend/src/components/ModelSelector/ModelSelector.jsx`
- `/frontend/src/components/Settings/AIModelSettings.tsx`

## Migration Steps

### 1. Create a New modelsApi.ts Module (if needed)

If not already present, create a dedicated API module for models functionality:

```typescript
// /frontend/src/api/unified/modelsApi.ts
import { z } from 'zod';
import enhancedApiClient from './enhancedApiClient';
import { createErrorHandler } from './errorHandler';
import { validateParams } from './pathResolver';

/**
 * Error handler for Models API
 */
const handleModelsError = createErrorHandler({
  module: 'ModelsAPI',
  showNotifications: true,
  logToConsole: true
});

/**
 * Model validation schema
 */
export const modelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(['available', 'downloading', 'error']).optional(),
  provider: z.string().optional(),
  isDefault: z.boolean().optional(),
  size: z.number().optional(),
  quantization: z.string().optional(),
  downloadProgress: z.number().optional()
});

// Type inference from Zod schema
export type Model = z.infer<typeof modelSchema>;

/**
 * Get available models
 */
export const getModels = async (options?: Record<string, any>): Promise<Model[]> => {
  try {
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'ai', 
      'models',
      {},
      {},
      null,
      options
    );
    
    // Validate and return
    if (Array.isArray(response)) {
      try {
        return z.array(modelSchema).parse(response);
      } catch (validationError) {
        console.warn('Models validation failed:', validationError);
        return response as Model[];
      }
    }
    
    console.warn('Models response is not an array:', response);
    return [];
  } catch (error) {
    handleModelsError(error, {
      operation: 'getModels',
      context: {}
    });
    throw error;
  }
};

/**
 * Pull/download a model
 */
export const pullModel = async (modelId: string, options?: Record<string, any>): Promise<Model> => {
  try {
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'ai',
      'pullModel',
      { model_id: modelId },
      {},
      null,
      options
    );
    
    // Validate and return
    try {
      return modelSchema.parse(response);
    } catch (validationError) {
      console.warn('Model validation failed:', validationError);
      return response as Model;
    }
  } catch (error) {
    handleModelsError(error, {
      operation: 'pullModel',
      context: { modelId }
    });
    throw error;
  }
};

/**
 * Set active model
 */
export const setActiveModel = async (modelId: string, options?: Record<string, any>): Promise<{ success: boolean }> => {
  try {
    const response = await enhancedApiClient.callEndpoint<unknown>(
      'ai',
      'setActiveModel',
      {},
      {},
      { modelId },
      options
    );
    
    return { success: true, ...response };
  } catch (error) {
    handleModelsError(error, {
      operation: 'setActiveModel',
      context: { modelId }
    });
    throw error;
  }
};

// Export all functions
export default {
  getModels,
  pullModel,
  setActiveModel
};
```

### 2. Update apiConfig.ts to Include Model Endpoints

Add model endpoints to the API configuration:

```typescript
// Add to apiConfig.ts
ai: {
  basePath: '',
  endpoints: {
    // ... existing AI endpoints ...
    models: {
      name: 'getModels',
      path: '/ai/models',
      method: HttpMethod.GET,
      description: 'Get available AI models',
      requiresAuth: true,
      cacheTTL: 600, // 10 minutes
    },
    pullModel: {
      name: 'pullModel',
      path: '/ai/models/{model_id}/pull',
      method: HttpMethod.POST,
      description: 'Pull/download an AI model',
      requiresAuth: true,
    },
    setActiveModel: {
      name: 'setActiveModel',
      path: '/ai/models/active',
      method: HttpMethod.PUT,
      description: 'Set the active AI model',
      requiresAuth: true,
    },
  }
}
```

### 3. Update index.ts to Include Model API

Update the unified API index file to include the models API module:

```typescript
// In api/unified/index.ts
import modelsApi from './modelsApi';

// Update the api export
export const api = {
  // ... existing API modules ...
  models: modelsApi,
  // ... 
};
```

### 4. Update ModelSelector.tsx

```typescript
// Old
import { fetchModelsList, pullModel, setActiveModel } from '../../api/modelApi';

// New
import { api } from '../../api/unified';
import { Model } from '../../api/unified/modelsApi';
```

Update the component code:

```typescript
// Old
const [models, setModels] = useState<Model[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
  const loadModels = async () => {
    try {
      const modelsList = await fetchModelsList();
      setModels(modelsList);
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  };
  
  loadModels();
}, []);

const handlePullModel = async (modelId: string) => {
  try {
    setDownloadingModel(modelId);
    await pullModel(modelId);
    // Refresh models list
    const modelsList = await fetchModelsList();
    setModels(modelsList);
  } catch (err) {
    setError(err as Error);
  } finally {
    setDownloadingModel(null);
  }
};

const handleSetActiveModel = async (modelId: string) => {
  try {
    await setActiveModel(modelId);
    // Update local state
    setModels(models.map(model => ({
      ...model,
      isDefault: model.id === modelId
    })));
    onModelChange?.(modelId);
  } catch (err) {
    setError(err as Error);
  }
};

// New
// Option 1: Using React Query (recommended)
const {
  data: models = [],
  isLoading,
  error,
  refetch
} = useQuery({
  queryKey: ['models'],
  queryFn: api.models.getModels,
  staleTime: 60 * 1000 // 1 minute
});

const pullModelMutation = useMutation({
  mutationFn: (modelId: string) => api.models.pullModel(modelId),
  onSuccess: () => {
    refetch(); // Refresh models list
  }
});

const setActiveModelMutation = useMutation({
  mutationFn: (modelId: string) => api.models.setActiveModel(modelId),
  onSuccess: (_, modelId) => {
    // Update local UI without refetching
    onModelChange?.(modelId);
  }
});

const handlePullModel = (modelId: string) => {
  pullModelMutation.mutate(modelId);
};

const handleSetActiveModel = (modelId: string) => {
  setActiveModelMutation.mutate(modelId);
};

// Option 2: Without React Query
const [models, setModels] = useState<Model[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
  const loadModels = async () => {
    try {
      const modelsList = await api.models.getModels();
      setModels(modelsList);
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  };
  
  loadModels();
}, []);

const handlePullModel = async (modelId: string) => {
  try {
    setDownloadingModel(modelId);
    await api.models.pullModel(modelId);
    // Refresh models list
    const modelsList = await api.models.getModels();
    setModels(modelsList);
  } catch (err) {
    setError(err as Error);
  } finally {
    setDownloadingModel(null);
  }
};

const handleSetActiveModel = async (modelId: string) => {
  try {
    await api.models.setActiveModel(modelId);
    // Update local state
    setModels(models.map(model => ({
      ...model,
      isDefault: model.id === modelId
    })));
    onModelChange?.(modelId);
  } catch (err) {
    setError(err as Error);
  }
};
```

### 5. Update ModelSelector.jsx

For the JSX version, make similar changes:

```jsx
// Old
import { fetchModelsList, pullModel, setActiveModel } from '../../api/modelApi';

// New
import { api } from '../../api/unified';
```

And update the API calls:

```jsx
// Old
const fetchModels = async () => {
  try {
    setLoading(true);
    const models = await fetchModelsList();
    setModels(models);
    setLoading(false);
  } catch (error) {
    console.error("Error fetching models:", error);
    setError(error);
    setLoading(false);
  }
};

// New
const fetchModels = async () => {
  try {
    setLoading(true);
    const models = await api.models.getModels();
    setModels(models);
    setLoading(false);
  } catch (error) {
    console.error("Error fetching models:", error);
    setError(error);
    setLoading(false);
  }
};
```

### 6. Update AIModelSettings.tsx

```typescript
// Old
import { fetchModelsList } from '../../api/modelApi';

// New
import { api } from '../../api/unified';
```

And update the API calls:

```typescript
// Old
useEffect(() => {
  const loadModels = async () => {
    try {
      const models = await fetchModelsList();
      setAvailableModels(models);
      
      // Set active model from list
      const activeModel = models.find(m => m.isDefault);
      if (activeModel) {
        setSelectedModel(activeModel.id);
      }
      
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  };
  
  loadModels();
}, []);

// New
useEffect(() => {
  const loadModels = async () => {
    try {
      const models = await api.models.getModels();
      setAvailableModels(models);
      
      // Set active model from list
      const activeModel = models.find(m => m.isDefault);
      if (activeModel) {
        setSelectedModel(activeModel.id);
      }
      
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  };
  
  loadModels();
}, []);
```

### 7. Use React Query for a More Modern Approach (Optional)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/unified';

function AIModelSettings() {
  const queryClient = useQueryClient();
  const [selectedModel, setSelectedModel] = useState<string>('');
  
  // Fetch models
  const { 
    data: availableModels = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['models'],
    queryFn: api.models.getModels,
    onSuccess: (models) => {
      // Set active model from list
      const activeModel = models.find(m => m.isDefault);
      if (activeModel && !selectedModel) {
        setSelectedModel(activeModel.id);
      }
    }
  });
  
  // Set active model mutation
  const setActiveMutation = useMutation({
    mutationFn: api.models.setActiveModel,
    onSuccess: () => {
      // Invalidate models query to refresh data
      queryClient.invalidateQueries({ queryKey: ['models'] });
    }
  });
  
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    setActiveMutation.mutate(modelId);
  };
  
  return (
    // Component JSX
  );
}
```

## Creating Hooks for ModelSelector (Optional)

For a more reusable approach, create dedicated hooks:

```typescript
// /frontend/src/api/unified/hooks/useModels.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../index';
import { Model } from '../modelsApi';

/**
 * Hook for fetching available models
 */
export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: api.models.getModels,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for pulling/downloading a model
 */
export function usePullModel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (modelId: string) => api.models.pullModel(modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    }
  });
}

/**
 * Hook for setting the active model
 */
export function useSetActiveModel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (modelId: string) => api.models.setActiveModel(modelId),
    onSuccess: (_, modelId) => {
      // Update the cache to mark this model as default
      queryClient.setQueryData(['models'], (oldData: Model[] | undefined) => {
        if (!oldData) return oldData;
        
        return oldData.map(model => ({
          ...model,
          isDefault: model.id === modelId
        }));
      });
    }
  });
}
```

Then update the component to use these hooks:

```typescript
import { useModels, usePullModel, useSetActiveModel } from '../../api/unified/hooks/useModels';

function ModelSelector() {
  const { data: models = [], isLoading, error } = useModels();
  const pullModelMutation = usePullModel();
  const setActiveModelMutation = useSetActiveModel();
  
  const handlePullModel = (modelId: string) => {
    pullModelMutation.mutate(modelId);
  };
  
  const handleSetActiveModel = (modelId: string) => {
    setActiveModelMutation.mutate(modelId);
  };
  
  return (
    // Component JSX
  );
}
```

## Testing

After migrating each component, perform the following tests:

1. **TypeScript Validation**: Run `npm run typecheck` to ensure types are correct
2. **Functionality Testing**: Verify that the component works as expected by:
   - Testing the model list display
   - Testing model download functionality
   - Testing model selection/activation
3. **Error Handling**: Test error scenarios to ensure errors are properly handled

## Common Issues and Solutions

### Model Structure Changes

If the model object structure has changed:

```typescript
// Old
interface Model {
  id: string;
  name: string;
  status: 'available' | 'downloading';
  isDefault?: boolean;
}

// New
interface Model {
  id: string;
  name: string;
  status: 'available' | 'downloading' | 'error';
  isDefault?: boolean;
  provider?: string;
  description?: string;
}
```

Update the component to handle both structures or create a normalization function:

```typescript
function normalizeModel(model: any): Model {
  return {
    id: model.id,
    name: model.name,
    status: model.status || 'available',
    isDefault: !!model.isDefault,
    provider: model.provider || 'Unknown',
    description: model.description || ''
  };
}
```

### Download Progress Updates

If the download progress updates are needed:

```typescript
// Use the WebSocket service for real-time updates
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';

// In the component
const modelUpdates = useRealtimeUpdates('model-downloads');

useEffect(() => {
  if (modelUpdates && modelUpdates.modelId) {
    // Update the progress for the specific model
    setModels(models.map(model => 
      model.id === modelUpdates.modelId
        ? { ...model, downloadProgress: modelUpdates.progress }
        : model
    ));
  }
}, [modelUpdates]);
```

## Conclusion

By following these steps, you should be able to successfully migrate the ModelSelector components to use the unified API client architecture. The migration improves type safety, error handling, and maintainability while ensuring consistent API usage across the application.

The new approach offers these advantages:
- Better domain organization through dedicated API modules
- Type safety with Zod validation
- Consistent error handling across the application
- Optional integration with React Query for automatic caching and updates
- Support for real-time updates with WebSockets (if needed)