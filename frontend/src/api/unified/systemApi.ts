import { apiClient } from './client';

export interface SystemHealthResponse {
  status: 'healthy' | 'warning' | 'critical';
  metrics: SystemMetric[];
  services: ServiceStatus[];
  timestamp: string;
}

export interface SystemMetric {
  name: string;
  value: number;
  max: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
}

export interface ServiceStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  response_time: number;
  last_checked: string;
}

/**
 * Fetches system health information
 * @returns System health data including metrics and service statuses
 */
export const fetchSystemHealth = async (): Promise<SystemHealthResponse> => {
  const response = await apiClient.get<SystemHealthResponse>('/api/v1/system/health');
  return response.data;
};

/**
 * Fetches system metrics data for charts and dashboards
 * @param metric Name of the metric to fetch
 * @param period Time period to fetch data for (e.g., '1h', '24h', '7d')
 * @returns Time series data for the specified metric
 */
export const fetchMetricData = async (
  metric: string,
  period: string = '1h'
): Promise<{ timestamps: string[]; values: number[] }> => {
  const response = await apiClient.get(`/api/v1/system/metrics/${metric}`, {
    params: { period },
  });
  return response.data;
};

/**
 * Fetches system resource usage for CPU, memory, disk, etc.
 * @returns Current resource usage data
 */
export const fetchResourceUsage = async (): Promise<{
  cpu: number;
  memory: number;
  disk: number;
  network: { in: number; out: number };
}> => {
  const response = await apiClient.get('/api/v1/system/resources');
  return response.data;
};