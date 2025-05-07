// File: frontend/tests/components/SettingsInput.test.jsx (Example)

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import SettingsInput from '../../src/components/Settings/SettingsInput';
// Mock the zustand store if it interferes or provides necessary state
// import useAppStore from '../../src/store/appStore';

// vi.mock('../../src/store/appStore'); // Basic mock

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }, // Disable retries for tests
});

// Helper to wrap component in necessary providers
const renderWithProviders = (ui) => {
  // Mock Zustand state if needed for this component
  // useAppStore.setState({ organizationSlug: 'initial-org', projectSlug: 'initial-proj', setConfig: vi.fn() });

  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Notifications />
        {ui}
      </MantineProvider>
    </QueryClientProvider>
  );
};


describe('SettingsInput Component', () => {
  beforeEach(() => {
      // Reset query cache before each test
       queryClient.clear();
       // Reset zustand mock if used
       // vi.clearAllMocks();
       // useAppStore.setState({ organizationSlug: 'initial-org', projectSlug: 'initial-proj', setConfig: vi.fn() });
  });

  test('renders loading state initially', () => {
    renderWithProviders(<SettingsInput />);
    // Check for loading overlay (might need specific selector or role)
    // Check if inputs are disabled initially might be simpler
    expect(screen.getByLabelText(/organization slug/i)).toBeDisabled();
  });

  test('fetches status and config, populates fields on load', async () => {
    // MSW will intercept /status and /config calls defined in handlers.js
    renderWithProviders(<SettingsInput />);

    // Wait for loading to finish and fields to be populated
    // Use findBy* which waits for element to appear
    const orgInput = await screen.findByLabelText(/organization slug/i);
    const projInput = screen.getByLabelText(/project slug/i);

    expect(orgInput).toBeEnabled(); // Should be enabled after loading
    expect(orgInput).toHaveValue('mock-org'); // Value from MSW mock
    expect(projInput).toHaveValue('mock-project');

    // Check if status is displayed
    expect(screen.getByText(/Sentry Token:/i)).toBeInTheDocument();
    expect(screen.getByText(/OK/i)).toBeInTheDocument(); // Ollama status from mock
  });

   test('updates config on save button click', async () => {
       renderWithProviders(<SettingsInput />);

       // Wait for initial load
       const orgInput = await screen.findByLabelText(/organization slug/i);
       const projInput = screen.getByLabelText(/project slug/i);
       const saveButton = screen.getByRole('button', { name: /save & reload issues/i });

       // Change input values
       fireEvent.change(orgInput, { target: { value: 'updated-org' } });
       fireEvent.change(projInput, { target: { value: 'updated-proj' } });

       // Click save
       fireEvent.click(saveButton);

       // Check for loading state on button (optional)
       expect(saveButton).toBeDisabled(); // Or check for loading indicator if Mantine adds one

       // Wait for mutation to complete and check for success notification
       // Use findBy* for elements that appear asynchronously
       expect(await screen.findByText(/Configuration Saved/i)).toBeInTheDocument();

        // Verify inputs *might* have updated if mutation updates cache/state instantly,
        // or check if zustand store was called if mocking store's setConfig
       // expect(orgInput).toHaveValue('updated-org'); // Depends on timing/state update strategy

   });

});