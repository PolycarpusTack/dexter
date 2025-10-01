# Dexter Deployment

This directory contains configuration files and scripts for deploying Dexter in various environments.

## Deployment Options

- **Local Development**: Scripts for local development environment setup
- **Docker Compose**: Deployment using Docker Compose for development and testing
- **Kubernetes**: Deployment to Kubernetes clusters for production
- **AWS ECS**: Deployment to AWS Elastic Container Service

## Monitoring

The monitoring setup includes:

- **Prometheus**: For metrics collection
- **Grafana**: For metrics visualization and dashboards
- **cAdvisor**: For container monitoring
- **Node Exporter**: For host system metrics
- **Alert Manager**: For alerting based on defined thresholds

### Starting the Monitoring Stack

To start the monitoring stack:

```bash
./startup-monitoring.sh
```

This will start all the monitoring components with Docker Compose.

### Accessing Monitoring Tools

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/dexter-admin-password)
- **cAdvisor**: http://localhost:8080
- **Alert Manager**: http://localhost:9093

### Customizing Alerts

To customize alerts, edit the following files:

- `monitoring/rules/alert_rules.yml`: Define alert rules
- `monitoring/alertmanager.yml`: Configure alert delivery channels

## Production Deployment

For production deployment, follow these steps:

1. Review and update environment variables in `.env.production`
2. Build Docker images using the provided scripts
3. Deploy using the appropriate deployment method (K8s, AWS ECS)
4. Configure monitoring with persistent volumes
5. Set up proper SSL certificates for secure communication

See the `DEPLOYMENT_GUIDE.md` for detailed instructions for each deployment target.

## CI/CD Integration

The `.github/workflows` directory contains GitHub Actions workflows for:

- Automated testing
- Building Docker images
- Deployment to staging/production environments

See the `CI_CD_GUIDE.md` for detailed information about the CI/CD pipeline.