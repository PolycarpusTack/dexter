import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { RouteErrorBoundary, withRouteErrorBoundary, useRouteError } from '../RouteErrorBoundary';
import { vi } from 'vitest';
import { telemetry } from '../../../services/telemetry';
import { errorTracker } from '../../../utils/errorTracking';

// Mock dependencies
vi.mock('../../../services/telemetry', () => ({
  telemetry: {
    trackEvent: vi.fn()
  }
}));

vi.mock('../../../utils/errorTracking', () => ({
  errorTracker: {
    trackError: vi.fn().mockReturnValue({ id: 'test-error-id' })
  },
  ErrorSeverity: {
    ERROR: 'error'
  }
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn()
  }
}));

// Component that throws an error
const ThrowError = ({ error }: { error?: Error }) => {
  throw error || new Error('Test error');
};

// Component that can trigger errors
const TriggerableError = () => {
  const { throwError } = useRouteError();
  
  return (
    <div>
      <button onClick={() => throwError(new Error('Triggered error'))}>
        Trigger Error
      </button>
      <p>Normal content</p>
    </div>
  );
};

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <MemoryRouter>
        <RouteErrorBoundary routeName="TestRoute">
          <div>Test content</div>
        </RouteErrorBoundary>
      </MemoryRouter>
    );
    
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('catches and displays errors', () => {
    render(
      <MemoryRouter>
        <RouteErrorBoundary routeName="TestRoute">
          <ThrowError />
        </RouteErrorBoundary>
      </MemoryRouter>
    );
    
    expect(screen.getByText('Route Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong in TestRoute')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('tracks errors with telemetry and error tracker', () => {
    const testError = new Error('Test tracking error');
    
    render(
      <MemoryRouter initialEntries={['/test-path']}>
        <RouteErrorBoundary routeName="TestRoute">
          <ThrowError error={testError} />
        </RouteErrorBoundary>
      </MemoryRouter>
    );
    
    expect(errorTracker.trackError).toHaveBeenCalledWith(testError, expect.objectContaining({
      component: 'RouteErrorBoundary-TestRoute',
      route: '/test-path',
      severity: 'error'
    }));
    
    expect(telemetry.trackEvent).toHaveBeenCalledWith('route_error', expect.objectContaining({
      route: 'TestRoute',
      path: '/test-path',
      errorMessage: 'Test tracking error'
    }));
  });

  it('shows error ID badge', () => {
    render(
      <MemoryRouter>
        <RouteErrorBoundary routeName="TestRoute">
          <ThrowError />
        </RouteErrorBoundary>
      </MemoryRouter>
    );
    
    // Should show last 8 characters of error ID
    expect(screen.getByText(/ID:/)).toBeInTheDocument();
  });

  it('handles Try Again button click', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <RouteErrorBoundary routeName="TestRoute">
          <ThrowError />
        </RouteErrorBoundary>
      </MemoryRouter>
    );
    
    const tryAgainButton = screen.getByRole('button', { name: /Try Again/i });
    fireEvent.click(tryAgainButton);
    
    expect(telemetry.trackEvent).toHaveBeenCalledWith('route_error_manual_reset', expect.any(Object));
    
    // After reset, should render children normally
    rerender(
      <MemoryRouter>
        <RouteErrorBoundary routeName="TestRoute">
          <div>Recovered content</div>
        </RouteErrorBoundary>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.queryByText('Route Error')).not.toBeInTheDocument();
    });
  });

  it('handles Go Back button click', () => {
    const mockNavigate = vi.fn();
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate
      };
    });
    
    render(
      <MemoryRouter>
        <RouteErrorBoundary routeName="TestRoute">
          <ThrowError />
        </RouteErrorBoundary>
      </MemoryRouter>
    );
    
    const goBackButton = screen.getByRole('button', { name: /Go Back/i });
    fireEvent.click(goBackButton);
    
    expect(telemetry.trackEvent).toHaveBeenCalledWith('route_error_go_back', expect.any(Object));
  });

  it('toggles technical details', () => {
    render(
      <MemoryRouter>
        <RouteErrorBoundary routeName="TestRoute">
          <ThrowError />
        </RouteErrorBoundary>
      </MemoryRouter>
    );
    
    // Details should be hidden initially
    expect(screen.queryByText('Error Stack')).not.toBeInTheDocument();
    
    // Click to show details
    const detailsButton = screen.getByRole('button', { name: /Show Technical Details/i });
    fireEvent.click(detailsButton);
    
    // Details should now be visible
    expect(screen.getByText('Error Stack')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Report This Issue/i })).toBeInTheDocument();
  });

  it('handles Report Issue button click', () => {
    render(
      <MemoryRouter>
        <RouteErrorBoundary routeName="TestRoute">
          <ThrowError />
        </RouteErrorBoundary>
      </MemoryRouter>
    );
    
    // Show details first
    const detailsButton = screen.getByRole('button', { name: /Show Technical Details/i });
    fireEvent.click(detailsButton);
    
    // Click report issue
    const reportButton = screen.getByRole('button', { name: /Report This Issue/i });
    fireEvent.click(reportButton);
    
    expect(telemetry.trackEvent).toHaveBeenCalledWith('route_error_report_issue', expect.any(Object));
  });

  it('renders custom fallback when provided', () => {
    const CustomFallback = <div>Custom error UI</div>;
    
    render(
      <MemoryRouter>
        <RouteErrorBoundary routeName="TestRoute" fallback={CustomFallback}>
          <ThrowError />
        </RouteErrorBoundary>
      </MemoryRouter>
    );
    
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByText('Route Error')).not.toBeInTheDocument();
  });

  it('calls onError callback when provided', () => {
    const onError = vi.fn();
    const testError = new Error('Callback test error');
    
    render(
      <MemoryRouter>
        <RouteErrorBoundary routeName="TestRoute" onError={onError}>
          <ThrowError error={testError} />
        </RouteErrorBoundary>
      </MemoryRouter>
    );
    
    expect(onError).toHaveBeenCalledWith(testError, expect.any(Object));
  });

  it('attempts auto-recovery when enabled', async () => {
    vi.useFakeTimers();
    
    render(
      <MemoryRouter>
        <RouteErrorBoundary routeName="TestRoute" enableAutoRecovery maxRecoveryAttempts={2}>
          <ThrowError />
        </RouteErrorBoundary>
      </MemoryRouter>
    );
    
    // Should show recovery loading state
    expect(screen.getByText('Attempting to recover...')).toBeInTheDocument();
    expect(screen.getByText('Attempt 1 of 2')).toBeInTheDocument();
    
    // Fast forward first recovery attempt
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(telemetry.trackEvent).toHaveBeenCalledWith('route_error_recovery_attempt', expect.objectContaining({
        attempt: 1
      }));
    });
    
    vi.useRealTimers();
  });

  it('withRouteErrorBoundary HOC works correctly', () => {
    const TestComponent = () => <div>Test Component</div>;
    const WrappedComponent = withRouteErrorBoundary(TestComponent, 'TestRoute');
    
    render(
      <MemoryRouter>
        <WrappedComponent />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  it('useRouteError hook triggers errors', () => {
    render(
      <MemoryRouter>
        <RouteErrorBoundary routeName="TestRoute">
          <TriggerableError />
        </RouteErrorBoundary>
      </MemoryRouter>
    );
    
    // Should render normally initially
    expect(screen.getByText('Normal content')).toBeInTheDocument();
    
    // Trigger error
    const triggerButton = screen.getByRole('button', { name: /Trigger Error/i });
    fireEvent.click(triggerButton);
    
    // Should now show error UI
    expect(screen.getByText('Route Error')).toBeInTheDocument();
    expect(screen.getByText('Triggered error')).toBeInTheDocument();
  });

  it('shows recovery attempts alert after failed recovery', async () => {
    vi.useFakeTimers();
    
    const { rerender } = render(
      <MemoryRouter>
        <RouteErrorBoundary routeName="TestRoute" enableAutoRecovery maxRecoveryAttempts={1}>
          <ThrowError />
        </RouteErrorBoundary>
      </MemoryRouter>
    );
    
    // Fast forward through recovery attempt
    vi.advanceTimersByTime(1000);
    
    // Rerender with error again (simulating failed recovery)
    rerender(
      <MemoryRouter>
        <RouteErrorBoundary routeName="TestRoute" enableAutoRecovery maxRecoveryAttempts={1}>
          <ThrowError />
        </RouteErrorBoundary>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Automatic recovery failed after 1 attempt/)).toBeInTheDocument();
    });
    
    vi.useRealTimers();
  });
});