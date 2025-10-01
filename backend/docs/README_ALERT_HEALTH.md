# Alert Health Monitor Documentation

## Overview

The Alert Health Monitor is a comprehensive system for analyzing and optimizing Sentry alert rules. It helps identify noisy alerts, detect alert storms, and provides data-driven recommendations for improving alert effectiveness.

## Documentation Structure

This documentation is organized into the following sections:

### 1. [Alert Health Monitor Overview](ALERT_HEALTH_MONITOR.md)
- System architecture and components
- Key features and capabilities
- Integration with Sentry
- Benefits and use cases

### 2. [Implementation Guide](ALERT_HEALTH_IMPLEMENTATION.md)
- Technical details and algorithms
- Component interactions
- Configuration options
- Performance considerations

### 3. [User Guide](ALERT_HEALTH_USER_GUIDE.md)
- How to use the Alert Health Monitor
- Dashboard interpretation
- Common workflows
- Best practices

### 4. [API Documentation](ALERT_HEALTH_API.md)
- Detailed API endpoint documentation
- Request/response schemas
- Authentication requirements
- Example API calls

## Quick Start

1. **Ensure Prerequisites**:
   ```bash
   # Backend dependencies
   cd backend
   poetry install
   
   # Configure environment
   cp .env.example .env
   # Edit .env and add your SENTRY_API_TOKEN
   ```

2. **Run the Backend**:
   ```bash
   poetry shell
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Access API Documentation**:
   - Open http://localhost:8000/docs
   - Navigate to the alert-health endpoints

4. **Run Examples**:
   ```bash
   cd backend/examples
   python alert_health_examples.py
   ```

5. **Interactive Analysis**:
   ```bash
   cd backend/examples
   jupyter notebook alert_health_analysis.ipynb
   ```

## Key Features

- **Health Metrics Analysis**: Comprehensive metrics for alert rule performance
- **Alert Storm Detection**: Identify and analyze periods of excessive alerting
- **Threshold Recommendations**: Data-driven suggestions for optimizing alert thresholds
- **Pattern Recognition**: Detect periodic, burst, and trend patterns in alerts
- **Scheduled Analysis**: Automated background tasks for continuous monitoring
- **Dashboard Views**: Pre-aggregated data for quick insights

## Support and Contributing

For questions or issues:
1. Check the documentation in this directory
2. Review the examples in `/backend/examples/`
3. Submit issues to the project repository

## License

This project is part of the Dexter system. See the main project LICENSE for details.