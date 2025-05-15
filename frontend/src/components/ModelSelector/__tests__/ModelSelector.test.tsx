/**
 * Tests for ModelSelector component
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as aiHooks from '../../../api/unified/hooks/useAi';
import useAppStore from '../../../store/appStore';
import ModelSelector from '../ModelSelector';

// Mock the AI hooks
vi.mock('../../../api/unified/hooks/useAi', () => ({
  useOllamaModels: vi.fn(),
  usePullModel: vi.fn(),
  useSetActiveModel: vi.fn()
}));

// Mock the app store
vi.mock('../../../store/appStore', () => ({
  default: vi.fn()
}));

// Mock the error handling utils
vi.mock('../../../utils/errorHandling', () => ({
  showSuccessNotification: vi.fn()
}));

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('ModelSelector Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock app store
    vi.mocked(useAppStore).mockReturnValue({
      activeAIModel: 'llama3',
      setActiveAIModel: vi.fn()
    });
    
    // Mock useOllamaModels hook
    vi.mocked(aiHooks.useOllamaModels).mockReturnValue({
      data: {
        models: [
          {
            name: 'llama3',
            status: 'available',
            size: 4500000000,
            modified_at: '2023-10-15T10:30:00Z'
          },
          {
            name: 'mistral',
            status: 'available',
            size: 3800000000,
            modified_at: '2023-10-15T10:30:00Z'
          },
          {
            name: 'phi3',
            status: 'unavailable'
          }
        ],
        current_model: 'llama3',
        ollama_status: 'available'
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn()
    } as any);
    
    // Mock usePullModel hook
    vi.mocked(aiHooks.usePullModel).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      variables: undefined
    } as any);
    
    // Mock useSetActiveModel hook
    vi.mocked(aiHooks.useSetActiveModel).mockReturnValue({
      mutate: vi.fn(),
      isPending: false
    } as any);
  });

  it('should render in collapsed state initially', () => {
    render(<ModelSelector />, { wrapper: createWrapper() });
    
    // Check that it shows the current model in collapsed view
    expect(screen.getByText('llama3')).toBeInTheDocument();
    expect(screen.getByText('AI Model')).toBeInTheDocument();
    
    // Status badges
    const ollamaBadge = screen.getByText(/Ollama: Online/i);
    expect(ollamaBadge).toBeInTheDocument();
    
    const modelStatusBadge = screen.getByText('Available');
    expect(modelStatusBadge).toBeInTheDocument();
  });

  it('should expand when clicked', async () => {
    render(<ModelSelector />, { wrapper: createWrapper() });
    
    // Click to expand
    fireEvent.click(screen.getByText('AI Model'));
    
    // Check expanded view is shown
    await waitFor(() => {
      expect(screen.getByText('AI Model Settings')).toBeInTheDocument();
    });
    
    // Check model list is shown
    expect(screen.getByText('Available Models')).toBeInTheDocument();
    
    // Check both models are listed
    expect(screen.getByText('llama3')).toBeInTheDocument();
    expect(screen.getByText('mistral')).toBeInTheDocument();
    expect(screen.getByText('phi3')).toBeInTheDocument();
  });

  it('should handle model selection', async () => {
    // Setup
    const setActiveModelMutate = vi.fn();
    vi.mocked(aiHooks.useSetActiveModel).mockReturnValue({
      mutate: setActiveModelMutate,
      isPending: false
    } as any);

    render(<ModelSelector />, { wrapper: createWrapper() });
    
    // Click to expand
    fireEvent.click(screen.getByText('AI Model'));
    
    // Wait for expanded view
    await waitFor(() => {
      expect(screen.getByText('AI Model Settings')).toBeInTheDocument();
    });
    
    // Find "Use This Model" button for mistral
    const mistralButton = screen.getAllByText('Use This Model')[0];
    fireEvent.click(mistralButton);
    
    // Verify the mutation was called
    expect(setActiveModelMutate).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        onSuccess: expect.any(Function)
      })
    );
  });

  it('should handle model download', async () => {
    // Setup
    const pullModelMutate = vi.fn();
    vi.mocked(aiHooks.usePullModel).mockReturnValue({
      mutate: pullModelMutate,
      isPending: false,
      variables: undefined
    } as any);

    render(<ModelSelector />, { wrapper: createWrapper() });
    
    // Click to expand
    fireEvent.click(screen.getByText('AI Model'));
    
    // Wait for expanded view
    await waitFor(() => {
      expect(screen.getByText('AI Model Settings')).toBeInTheDocument();
    });
    
    // Find download button for phi3 (which is unavailable)
    const downloadButtons = screen.getAllByTitle('Download this model');
    fireEvent.click(downloadButtons[0]);
    
    // Verify the mutation was called
    expect(pullModelMutate).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        onSuccess: expect.any(Function)
      })
    );
  });

  it('should show loading state', () => {
    // Setup loading state
    vi.mocked(aiHooks.useOllamaModels).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn()
    } as any);

    render(<ModelSelector />, { wrapper: createWrapper() });
    
    // Check loading state
    expect(screen.getByText('AI Model')).toBeInTheDocument();
    // Check for loading indicators - could be multiple due to different states
    const loaders = screen.getAllByRole('progressbar');
    expect(loaders.length).toBeGreaterThan(0);
  });

  it('should show error state', async () => {
    // Setup error state
    vi.mocked(aiHooks.useOllamaModels).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn()
    } as any);

    render(<ModelSelector />, { wrapper: createWrapper() });
    
    // Click to expand
    fireEvent.click(screen.getByText('AI Model'));
    
    // Wait for expanded view
    await waitFor(() => {
      expect(screen.getByText('AI Model Settings')).toBeInTheDocument();
    });
    
    // Check error message
    expect(screen.getByText('Cannot connect to Ollama. Make sure Ollama is running on your machine.')).toBeInTheDocument();
  });

  it('should call onModelChange prop when model changes', async () => {
    // Setup
    const onModelChange = vi.fn();
    const setActiveModelMutate = vi.fn().mockImplementation((modelName, options) => {
      if (options && options.onSuccess) {
        options.onSuccess({ model: modelName });
      }
    });
    
    vi.mocked(aiHooks.useSetActiveModel).mockReturnValue({
      mutate: setActiveModelMutate,
      isPending: false
    } as any);

    render(<ModelSelector onModelChange={onModelChange} />, { wrapper: createWrapper() });
    
    // Click to expand
    fireEvent.click(screen.getByText('AI Model'));
    
    // Wait for expanded view
    await waitFor(() => {
      expect(screen.getByText('AI Model Settings')).toBeInTheDocument();
    });
    
    // Find "Use This Model" button for mistral
    const mistralButton = screen.getAllByText('Use This Model')[0];
    fireEvent.click(mistralButton);
    
    // Verify the onModelChange prop was called
    expect(onModelChange).toHaveBeenCalled();
  });
});