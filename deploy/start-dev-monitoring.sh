#!/bin/bash
# Startup script for Dexter development monitoring

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITORING_DIR="${SCRIPT_DIR}/monitoring"

echo "Starting Dexter development monitoring stack..."
echo "This lightweight stack includes only Prometheus and Grafana for development use."

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
mkdir -p "${MONITORING_DIR}/rules"
mkdir -p "${MONITORING_DIR}/grafana/provisioning/dashboards"
mkdir -p "${MONITORING_DIR}/grafana/provisioning/datasources"

# Start the monitoring stack
cd "${MONITORING_DIR}"
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo "Development monitoring stack is now running!"
echo "Prometheus: http://localhost:9090"
echo "Grafana: http://localhost:3000 (admin/dexter-admin-password)"
echo ""
echo "To stop the development monitoring stack, run:"
echo "cd \"${MONITORING_DIR}\" && docker-compose -f docker-compose.dev.yml down"