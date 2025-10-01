/**
 * Main application component
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { PromptEngineeringProvider } from './context/PromptEngineeringContext';
import { StoreInitializer } from './components/StoreInitializer';
import DashboardPage from './pages/DashboardPage';
import { IssuesPage } from './pages/IssuesPage';
import { EventsPage } from './pages/EventsPage';
import { IssueDetailPage } from './pages/IssueDetailPage';
import DiscoverPage from './components/Discover/DiscoverPage';
import ConfigPage from './pages/ConfigPage';
import { AlertRules } from './components/AlertRules';
import { Navigate } from 'react-router-dom';
import { useInitialization } from './hooks/useInitialization';
import { TestConfigPage } from './pages/TestConfigPage';
import { OnboardingFlow } from './components/Onboarding/OnboardingFlow';
import { useOnboarding } from './hooks/useOnboarding';
import { withRouteErrorBoundary, withCombinedErrorBoundary } from './components/ErrorBoundary';
import { AppErrorBoundary } from './components/ErrorHandling';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Wrap page components with appropriate error boundaries
// Dashboard - Light API usage, standard error boundary
const DashboardPageWithErrorBoundary = withRouteErrorBoundary(DashboardPage, 'Dashboard', {
  enableAutoRecovery: true,
  maxRecoveryAttempts: 2
});

// Issues - Heavy API usage, needs combined boundary
const IssuesPageWithErrorBoundary = withCombinedErrorBoundary(IssuesPage, 'Issues', {
  enableApiErrorBoundary: true,
  enableEnhancedFeatures: true,
  enableAutoRecovery: true,
  maxRecoveryAttempts: 3
});

// Events - Heavy API usage with real-time updates
const EventsPageWithErrorBoundary = withCombinedErrorBoundary(EventsPage, 'Events', {
  enableApiErrorBoundary: true,
  enableEnhancedFeatures: true,
  enableAutoRecovery: true,
  maxRecoveryAttempts: 3
});

// Issue Detail - Moderate API usage
const IssueDetailPageWithErrorBoundary = withCombinedErrorBoundary(IssueDetailPage, 'Issue Detail', {
  enableApiErrorBoundary: true,
  enableAutoRecovery: true,
  maxRecoveryAttempts: 2
});

// Discover - Very heavy API usage with complex queries
const DiscoverPageWithErrorBoundary = withCombinedErrorBoundary(DiscoverPage, 'Discover', {
  enableApiErrorBoundary: true,
  enableEnhancedFeatures: true,
  enableAutoRecovery: true,
  maxRecoveryAttempts: 3
});

// Config - Sensitive data, minimal auto-recovery
const ConfigPageWithErrorBoundary = withRouteErrorBoundary(ConfigPage, 'Configuration', {
  enableAutoRecovery: false // Don't auto-recover on config page to prevent data loss
});

// Alert Rules - Moderate API usage
const AlertRulesWithErrorBoundary = withCombinedErrorBoundary(AlertRules, 'Alert Rules', {
  enableApiErrorBoundary: true,
  enableAutoRecovery: true,
  maxRecoveryAttempts: 2
});

// Test Config - Testing focused, no auto-recovery
const TestConfigPageWithErrorBoundary = withRouteErrorBoundary(TestConfigPage, 'Test Configuration', {
  enableAutoRecovery: false
});

function AppContent() {
  // Check and validate configuration on startup
  useInitialization();
  
  // Manage onboarding state
  const { shouldShowOnboarding, hideOnboarding, completeOnboarding } = useOnboarding();
  
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPageWithErrorBoundary />} />
          <Route path="/issues" element={<IssuesPageWithErrorBoundary />} />
          <Route path="/events" element={<EventsPageWithErrorBoundary />} />
          <Route path="/issues/:id" element={<IssueDetailPageWithErrorBoundary />} />
          <Route path="/discover" element={<DiscoverPageWithErrorBoundary />} />
          <Route path="/config" element={<ConfigPageWithErrorBoundary />} />
          <Route path="/alert-rules" element={<AlertRulesWithErrorBoundary />} />
          <Route path="/test-config" element={<TestConfigPageWithErrorBoundary />} />
        </Routes>
      </Layout>
      
      {/* Onboarding Flow Modal */}
      <OnboardingFlow 
        opened={shouldShowOnboarding}
        onClose={() => {
          hideOnboarding();
          completeOnboarding();
        }}
      />
    </>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StoreInitializer>
          <PromptEngineeringProvider>
            <Router>
              <AppContent />
            </Router>
          </PromptEngineeringProvider>
        </StoreInitializer>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
