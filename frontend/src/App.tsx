/**
 * Main application component
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { PromptEngineeringProvider } from './context/PromptEngineeringContext';
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

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  // Check and validate configuration on startup
  useInitialization();
  
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/issues" element={<IssuesPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/issues/:id" element={<IssueDetailPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/alert-rules" element={<AlertRules />} />
        <Route path="/test-config" element={<TestConfigPage />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PromptEngineeringProvider>
        <Router>
          <AppContent />
        </Router>
      </PromptEngineeringProvider>
    </QueryClientProvider>
  );
}

export default App;
