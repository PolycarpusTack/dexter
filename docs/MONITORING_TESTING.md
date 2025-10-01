# Monitoring Testing Guide

This document describes the testing strategy for the Dexter monitoring infrastructure, detailing how the monitoring components and configurations are tested to ensure reliability.

## Overview

The monitoring infrastructure includes several layers of testing:

1. **Configuration Testing** - Validation of YAML and JSON configuration files
2. **Rule Testing** - Validation of Prometheus alert rules
3. **Metrics Testing** - Validation of exposed metrics
4. **End-to-End Testing** - Validation of the entire monitoring stack

## Configuration Testing

The `test_monitoring_config.py` tests verify the syntax and structure of all monitoring configuration files:

- **Prometheus Configuration** - Validates that `prometheus.yml` is correctly structured
- **Alert Rules** - Validates that alert rules follow the required structure
- **Alertmanager Configuration** - Validates that `alertmanager.yml` is correctly structured
- **Grafana Dashboards** - Validates that dashboard JSON files are correctly structured

To run configuration tests:

```bash
pytest tests/monitoring/test_monitoring_config.py -v
```

## Prometheus Rule Testing

The `test_prometheus_rule_validation.py` tests validate Prometheus alert rules using the Prometheus API:

- **Rule Syntax** - Validates that alert rules follow the Prometheus rules syntax
- **Rule Semantics** - Validates that expressions are semantically correct
- **Rule Completeness** - Validates that rules have all required fields

These tests require Docker to run a Prometheus instance for validation.

To run Prometheus rule tests:

```bash
pytest tests/monitoring/test_prometheus_rule_validation.py -m integration -v
```

## Metrics Testing

The `test_metrics_endpoints.py` tests validate the metrics endpoints and data:

- **Endpoint Availability** - Verifies that metrics endpoints are available
- **Metric Format** - Verifies that metrics follow the Prometheus exposition format
- **Metric Content** - Verifies that expected metrics are present
- **Metric Behavior** - Verifies that metrics behave as expected (e.g., counters increment)

To run metrics tests:

```bash
pytest tests/monitoring/test_metrics_endpoints.py -v
```

## CI/CD Integration

The monitoring tests are integrated into the CI/CD pipeline in `.github/workflows/monitoring-deploy.yml`.

The workflow:

1. Runs configuration tests to validate monitoring configuration files
2. Runs Prometheus rule validation tests to ensure alert rules are valid
3. Only proceeds to deployment if all tests pass

## Manual Testing

For manual testing of the monitoring stack:

1. Start the development monitoring stack:
   ```bash
   cd deploy
   ./start-dev-monitoring.sh
   ```

2. Verify Prometheus targets:
   - Open Prometheus at http://localhost:9090/targets
   - Ensure all targets are "UP"

3. Verify alert rules:
   - Open Prometheus at http://localhost:9090/alerts
   - Ensure all alerts are defined properly

4. Verify Grafana dashboards:
   - Open Grafana at http://localhost:3000
   - Verify that dashboards are present and displaying data

## Testing Custom Rules

When adding new alert rules:

1. Add the rule to `monitoring/rules/alert_rules.yml`
2. Verify rule syntax:
   ```bash
   pytest tests/monitoring/test_prometheus_rule_validation.py::test_alert_rules_validation -v
   ```
3. Test the rule in development:
   ```bash
   cd deploy
   ./start-dev-monitoring.sh
   ```
4. Check rule behavior in the Prometheus UI

## Adding Test Cases

To add new test cases:

1. For configuration tests:
   - Add test cases to `test_monitoring_config.py`
2. For rule validation tests:
   - Add test cases to `test_prometheus_rule_validation.py`
3. For metrics tests:
   - Add test cases to `test_metrics_endpoints.py`

## Best Practices

1. **Test First** - Write tests for alert rules before implementing them
2. **Cover Edge Cases** - Test unusual conditions and failure modes
3. **Test in Isolation** - Test individual components before testing the whole stack
4. **Automate Everything** - Include all tests in the CI/CD pipeline
5. **Log Test Results** - Keep a record of test results for troubleshooting

## Troubleshooting Test Failures

### Configuration Test Failures

- Check YAML syntax in the configuration files
- Ensure all required fields are present
- Validate against the Prometheus and Alertmanager schema

### Rule Validation Failures

- Check the rule syntax for typos or formatting issues
- Ensure expressions are valid PromQL
- Verify that all required fields are present

### Metrics Test Failures

- Verify that the metrics endpoint is available
- Ensure the application is correctly exposing metrics
- Check the metric names and labels match what the tests expect