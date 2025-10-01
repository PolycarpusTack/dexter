# ModelSelector Component

## Overview

The `ModelSelector` component provides a unified interface for selecting and managing AI models in the Dexter application. This replaces all legacy model selector implementations with a single, consistent component.

## Usage

### Basic Usage

```tsx
import { ModelSelector } from '@/components/ModelSelector';

function MyComponent() {
  const handleModelChange = (modelName: string) => {
    console.log('Selected model:', modelName);
  };

  return <ModelSelector onModelChange={handleModelChange} />;
}
```

### Compact Mode

```tsx
// Shows only current model with a "Change Model" button
<ModelSelector compact={true} onModelChange={handleModelChange} />
```

### With Status Display

```tsx
// Shows Ollama connection status
<ModelSelector showStatus={true} onModelChange={handleModelChange} />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `compact` | `boolean` | `false` | Show compact view with modal for full selector |
| `onModelChange` | `(modelName: string) => void` | `undefined` | Callback when model is selected |
| `showStatus` | `boolean` | `true` | Show Ollama connection status |

## Features

- ✅ List available models
- ✅ Show current active model
- ✅ Download models from Ollama
- ✅ Show download progress
- ✅ Search and filter models
- ✅ Compact mode with modal
- ✅ Error handling and retry
- ✅ Loading states
- ✅ Keyboard accessible

## Architecture

The component uses the unified API client to interact with the backend:

```typescript
// Uses hooks from the unified API
import { hooks } from '@/api';
const { useOllamaModels, usePullModel, useSetActiveModel } = hooks;
```

## State Management

- Model list is fetched using React Query with 30-second refresh
- Current model selection is persisted to the backend
- Download progress is tracked and displayed

## Error Handling

The component handles:
- Network errors with retry functionality
- Download failures with notifications
- Model selection errors
- Loading and empty states

## Styling

Uses Mantine components for consistent theming:
- Cards for model display
- Badges for status indicators
- Progress bars for downloads
- Modals for compact mode

## Accessibility

- Keyboard navigation support
- ARIA labels for screen readers
- Focus management in modals
- Status announcements

## Migration from Legacy

If you're migrating from the old ModelSelector:

```tsx
// Old
import ModelSelector from '../ModelSelector/ModelSelector';
import EnhancedModelSelector from '../ModelSelector/EnhancedModelSelector';

// New
import { ModelSelector } from '@/components/ModelSelector';
```

All functionality from both legacy components is now available in the unified ModelSelector.