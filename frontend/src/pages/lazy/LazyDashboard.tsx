import { lazy } from 'react';
import { LazyLoad } from '../../components/Lazy/LazyLoad';

// Lazy load the dashboard page
// @ts-ignore
const DashboardPage = lazy(() => import('../DashboardPage'));

export const LazyDashboard = () => {
  return (
    <LazyLoad>
      <DashboardPage />
    </LazyLoad>
  );
};
