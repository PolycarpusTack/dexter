#!/bin/bash
# Startup script for Dexter monitoring stack

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITORING_DIR="${SCRIPT_DIR}/monitoring"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories if they don't exist
mkdir -p "${MONITORING_DIR}/prometheus"
mkdir -p "${MONITORING_DIR}/grafana/provisioning/dashboards"
mkdir -p "${MONITORING_DIR}/grafana/provisioning/datasources"
mkdir -p "${MONITORING_DIR}/rules"

# Start the monitoring stack
cd "${MONITORING_DIR}"
docker-compose -f docker-compose.monitoring.yml up -d

echo ""
echo "Monitoring stack is now running!"
echo "Prometheus: http://localhost:9090"
echo "Grafana: http://localhost:3000 (admin/dexter-admin-password)"
echo "cAdvisor: http://localhost:8080"
echo "Node Exporter: http://localhost:9100"
echo "Alert Manager: http://localhost:9093"
echo ""
echo "To stop the monitoring stack, run:"
echo "cd \"${MONITORING_DIR}\" && docker-compose -f docker-compose.monitoring.yml down"