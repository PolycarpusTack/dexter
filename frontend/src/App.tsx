/**
 * Main application component
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Notifications />
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<div>Dashboard Page</div>} />
              <Route path="/issues" element={<div>Issues Page</div>} />
              <Route path="/issues/:id" element={<div>Issue Detail Page</div>} />
              <Route path="/discover" element={<div>Discover Page</div>} />
              <Route path="/alert-rules" element={<div>Alert Rules Page</div>} />
            </Routes>
          </Layout>
        </Router>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
