# Dexter Monitoring Guide

This guide provides comprehensive information about the monitoring infrastructure integrated into Dexter, covering both the application-level monitoring and the infrastructure monitoring stack.

## Overview

Dexter includes a multi-level monitoring solution:

1. **Application Metrics** - Internal performance and health metrics exposed by the API
2. **Service Health Checks** - Automatic health checks for connected services
3. **Resource Monitoring** - System-level resource monitoring (CPU, memory, disk)
4. **Prometheus/Grafana Stack** - External monitoring, visualization, and alerting

## Application Metrics

The backend exposes various application metrics via a Prometheus-compatible endpoint at `/metrics`. These metrics include:

- **HTTP Request Metrics**
  - `http_requests_total` - Total request count by method, endpoint, and status
  - `http_request_duration_seconds` - Request latency histogram
  - `http_requests_active` - Currently active request gauge
  - `http_request_errors_total` - Error count by type

- **Service Metrics**
  - `sentry_api_requests_total` - Sentry API request count
  - `ollama_api_requests_total` - Ollama API request count
  - `cache_hits_total` - Cache hit count
  - `cache_misses_total` - Cache miss count
  - `tokens_processed_total` - AI model token processing count

- **Resource Metrics**
  - `system_cpu_usage_percent` - CPU usage percentage
  - `system_memory_usage_bytes` - Memory usage in bytes
  - `system_disk_usage_bytes` - Disk usage in bytes
  - `system_network_in_bytes_total` - Network bytes received
  - `system_network_out_bytes_total` - Network bytes sent

## Health Check Endpoints

The backend provides health check endpoints to monitor system status:

- **Basic Health Check**: `GET /health` - Returns basic system health status
- **System Health**: `GET /api/v1/system/health` - Returns detailed health information including:
  - Overall system status (`healthy`, `warning`, or `critical`)
  - Service status for all connected services
  - Key system metrics with status indicators
- **Resource Usage**: `GET /api/v1/system/resources` - Returns current resource usage
- **Metrics History**: `GET /api/v1/system/metrics/{metric}` - Returns time series data for specific metrics

## Frontend Monitoring Components

The frontend includes a `SystemStatus` component that displays real-time system health information:

- Overall system status with color-coded indicators
- Resource usage gauges for CPU, memory, and disk
- Connected service status
- Periodic auto-refresh to show the latest data

## Prometheus and Grafana Setup

### Starting the Monitoring Stack

To start the monitoring stack:

```bash
cd /path/to/dexter/deploy
./startup-monitoring.sh
```

This will launch the following components:

- **Prometheus** (http://localhost:9090) - For collecting and storing metrics
- **Grafana** (http://localhost:3000) - For visualizing metrics and dashboards
- **cAdvisor** (http://localhost:8080) - For container metrics
- **Node Exporter** (http://localhost:9100) - For host metrics
- **Alert Manager** (http://localhost:9093) - For managing alerts

### Accessing Grafana

Default Grafana credentials:
- Username: `admin`
- Password: `dexter-admin-password`

### Pre-configured Dashboards

The following dashboards are pre-configured:

1. **Dexter Backend Dashboard**
   - API performance metrics
   - Request duration and volume
   - Error rates
   - Resource usage

2. **System Overview Dashboard**
   - Host-level metrics
   - Container metrics
   - Network traffic
   - Disk I/O

## Alert Configuration

Alerts are configured in the `monitoring/rules/alert_rules.yml` file. The following alert categories are available:

### Backend API Alerts

- **BackendDown** - Triggers when the backend API is unavailable for more than 1 minute
- **HighErrorRate** - Triggers when error rate exceeds 5% for 5 minutes
- **SlowAPIResponse** - Triggers when P90 response time exceeds 1 second for 5 minutes

### Resource Alerts

- **HighCPUUsage** - Triggers when CPU usage exceeds 85% for 5 minutes
- **HighMemoryUsage** - Triggers when memory usage exceeds 90% for 5 minutes
- **DiskSpaceRunningOut** - Triggers when disk usage exceeds 85% for 5 minutes

## Custom Metrics and Reporting

### Adding Custom Metrics

To add custom metrics to your application code:

```python
from prometheus_client import Counter, Gauge, Histogram

# Create a metric
MY_COUNTER = Counter('my_counter_total', 'Description of my counter', ['label1', 'label2'])

# Use the metric in your code
MY_COUNTER.labels(label1='value1', label2='value2').inc()
```

### Manual Health Checks

You can manually check the system health using:

```bash
# Check Prometheus metrics
curl -s http://localhost:8000/metrics | grep system

# Check system health
curl -s http://localhost:8000/api/v1/system/health | jq

# Check resource usage
curl -s http://localhost:8000/api/v1/system/resources | jq
```

## Production Deployment

For production deployments, consider the following recommendations:

1. **Persistent Storage** - Configure persistent volumes for Prometheus and Grafana
2. **Security** - Set up proper authentication for all monitoring endpoints
3. **Alerting Integration** - Configure Alert Manager to send alerts to appropriate channels (Slack, email, PagerDuty)
4. **Retention Policy** - Configure appropriate data retention periods for metrics
5. **High Availability** - Consider HA setup for critical monitoring components

## Troubleshooting

Common issues and their solutions:

### Prometheus Not Scraping Metrics

- Check that your application is exposing the `/metrics` endpoint
- Verify the Prometheus configuration in `prometheus.yml`
- Check for network connectivity issues between Prometheus and your application

### Missing Grafana Dashboards

- Verify that the dashboard JSON files are in the correct location
- Check Grafana logs for any errors loading dashboards
- Ensure the Prometheus data source is correctly configured in Grafana

### Alert Manager Not Sending Alerts

- Check Alert Manager configuration in `alertmanager.yml`
- Verify that alerts are being triggered in Prometheus
- Check connectivity to notification services (Slack, email, etc.)

## References

- [Prometheus Documentation](https://prometheus.io/docs/introduction/overview/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Alert Manager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [cAdvisor Documentation](https://github.com/google/cadvisor)