import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { LoadingOverlay } from '@mantine/core';

// Import with proper type resolution
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const AlertRules = lazy(() => import('../components/AlertRules/AlertRules').then(module => ({ default: module.default })));
const AIMetricsDashboard = lazy(() => import('../components/AIMetrics/AIMetricsDashboard'));

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingOverlay visible={true} />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/organizations/:org/projects/:project/alert-rules" element={<AlertRules />} />
        <Route path="/organizations/:org/projects/:project" element={<DashboardPage />} />
        <Route path="/ai-metrics" element={<AIMetricsDashboard />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
