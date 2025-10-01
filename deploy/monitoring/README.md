# Dexter Monitoring

This directory contains the configuration for the Dexter monitoring stack.

## Overview

The monitoring stack includes:

- **Prometheus**: For collecting and storing metrics
- **Grafana**: For visualizing metrics and creating dashboards
- **cAdvisor**: For monitoring container metrics
- **Node Exporter**: For monitoring host metrics
- **Alert Manager**: For alerting based on metric thresholds

## Setup

The monitoring stack can be started using Docker Compose:

```bash
cd /path/to/dexter/deploy
./startup-monitoring.sh
```

## Accessing the Monitoring Tools

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (default credentials: admin/dexter-admin-password)
- **cAdvisor**: http://localhost:8080
- **Node Exporter**: http://localhost:9100
- **Alert Manager**: http://localhost:9093

## Configuration Files

- `prometheus.yml`: Prometheus configuration
- `alertmanager.yml`: Alert Manager configuration
- `rules/alert_rules.yml`: Alert rules for Prometheus
- `grafana/provisioning/`: Grafana configuration
  - `dashboards/`: Grafana dashboard definitions
  - `datasources/`: Grafana datasource configurations

## Customizing Alerts

To add or modify alerts, edit the `rules/alert_rules.yml` file. The file follows the Prometheus alert rule format.

Example alert rule:

```yaml
- alert: HighErrorRate
  expr: rate(http_requests_total{job="dexter_backend", status=~"5.."}[5m]) / rate(http_requests_total{job="dexter_backend"}[5m]) > 0.05
  for: 5m
  labels:
    severity: warning
    service: backend
  annotations:
    title: High API error rate
    description: Dexter backend API has a high error rate (>5%) for the last 5 minutes.
```

## Configuring Alerting Channels

To modify alerting channels (e.g., Slack, email), edit the `alertmanager.yml` file.

Example Slack configuration:

```yaml
receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#dexter-alerts'
        send_resolved: true
        api_url: 'https://hooks.slack.com/services/YOUR_SLACK_WEBHOOK_HERE'
```

## Adding Custom Dashboards

To add a custom dashboard:

1. Create a JSON dashboard definition in `grafana/provisioning/dashboards/`
2. Update `grafana/provisioning/dashboards/dashboards.yml` if needed

## Metrics Exposed by Dexter

The Dexter backend exposes the following metrics:

- **http_requests_total**: Counter of HTTP requests with method, endpoint, and status code labels
- **http_request_duration_seconds**: Histogram of request durations
- **http_requests_active**: Gauge of currently active requests
- **http_request_errors_total**: Counter of HTTP request errors
- **sentry_api_requests_total**: Counter of Sentry API requests
- **ollama_api_requests_total**: Counter of Ollama API requests
- **cache_hits_total**: Counter of cache hits
- **cache_misses_total**: Counter of cache misses
- **tokens_processed_total**: Counter of tokens processed by AI models