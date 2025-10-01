# Continuous Integration and Deployment for Monitoring

This document describes the CI/CD setup for the Dexter monitoring infrastructure, detailing how monitoring components are built, tested, and deployed alongside the application.

## Overview

The monitoring infrastructure follows a GitOps approach, where all configuration is stored in the Git repository and changes trigger automated deployments. The CI/CD workflow includes:

1. Building Docker images for monitoring components
2. Pushing images to a container registry
3. Updating Kubernetes manifests
4. Deploying to the target environment

## Workflow Components

### GitHub Actions Workflow

The `.github/workflows/monitoring-deploy.yml` file defines the CI/CD workflow for monitoring. This workflow:

- Runs automatically when changes are pushed to monitoring configuration
- Can be manually triggered for specific environments
- Builds and pushes Docker images
- Deploys to Kubernetes

### Build Process

1. Docker images are built for:
   - Prometheus - Metrics collection
   - Grafana - Visualization
   - Alertmanager - Alert handling

2. Each image includes:
   - Base monitoring software
   - Environment-specific configuration
   - Custom dashboards and rules

### Deployment Process

1. Kubernetes manifests are prepared with environment-specific variables
2. Resources are deployed in order:
   - ConfigMaps and Secrets
   - RBAC configuration
   - Persistent volume claims
   - Deployments
   - Services

## Environment Configuration

### Staging Environment

The staging environment uses:
- Smaller resource limits
- Test alert configurations
- Development-oriented dashboards
- Simplified persistence configuration

### Production Environment

The production environment includes:
- Higher resource limits
- Production alert thresholds
- Production Slack webhook integration
- Proper persistent storage configuration
- HTTPS configuration

## Custom Configurations

### Alert Rules

Alert rules are defined in the `monitoring-configmap.yaml` file under the `alert_rules.yml` key. Rules include:

- Backend API availability
- Error rate thresholds
- Performance metrics
- Resource utilization

### Grafana Dashboards

Custom dashboards are stored in the `deploy/monitoring/grafana/dashboards` directory and included in the Grafana Docker image.

## Manual Deployment

To manually deploy the monitoring stack:

1. Build the Docker images locally:
   ```
   cd deploy/monitoring
   docker-compose build
   ```

2. Push to a registry:
   ```
   docker tag dexter-prometheus:latest your-registry/dexter-prometheus:your-tag
   docker push your-registry/dexter-prometheus:your-tag
   ```

3. Apply Kubernetes manifests:
   ```
   cd deploy/kubernetes
   kubectl apply -f ./monitoring/
   ```

## Troubleshooting

### Image Pull Failures

If Kubernetes cannot pull the monitoring images:
- Check registry credentials
- Verify image tags in deployment manifests
- Ensure images are pushed to the correct repository

### Configuration Errors

If monitoring components fail to start:
- Check ConfigMap contents
- Verify syntax in YAML files
- Look at container logs for specific errors

### Connection Issues

If monitoring components cannot connect to each other:
- Verify service names are correct
- Check namespace configuration
- Ensure network policies allow required connections

## Integration with Application Deployments

The monitoring deployment is designed to work alongside the main application deployment:

1. **Coordinated Versioning**: Monitoring component versions match application releases
2. **Shared Resources**: Monitoring stack uses the same Kubernetes namespace
3. **Integrated Health Checks**: Application exposes metrics for Prometheus to collect

## Security Considerations

The monitoring infrastructure includes several security measures:

1. **RBAC Configuration**: Proper role-based access control
2. **Secret Management**: Credentials stored in Kubernetes secrets
3. **Network Isolation**: Services only exposed as needed
4. **Resource Limits**: Prevents resource exhaustion

## Future Improvements

Planned enhancements to the monitoring CI/CD pipeline:

1. **Validation Testing**: Automated tests for alerting rules
2. **Prometheus Rule Validation**: Pre-deployment checks for rule syntax
3. **Grafana Dashboard Linting**: Ensuring dashboard quality
4. **Canary Deployment**: Progressive rollout of monitoring changes