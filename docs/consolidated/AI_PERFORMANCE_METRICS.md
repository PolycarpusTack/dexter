# AI Performance Metrics

This document provides an overview of the AI Performance Metrics feature in Dexter, which allows users to monitor and analyze the performance of AI models.

## Overview

The AI Performance Metrics feature provides comprehensive tracking and visualization of AI model performance, enabling users to:

1. Monitor model response times, success rates, request counts, and token usage
2. Compare performance across different models and providers
3. Track costs associated with commercial AI providers
4. Analyze performance trends over time with interactive charts
5. Make data-driven decisions about model selection

## Components

### Backend Components

1. **MetricsService**
   - Tracks historical metrics data for all AI models
   - Calculates performance statistics (avg, min, max, p95, etc.)
   - Estimates costs based on token usage and provider pricing
   - Aggregates metrics for time series visualization

2. **Metrics Router**
   - Provides API endpoints for retrieving metrics data
   - Supports filtering by time period, metric type, and more
   - Offers endpoints for model comparison

3. **EnhancedLLMService Integration**
   - Records metrics automatically with each model invocation
   - Tracks response time, success rate, and token usage
   - Integrates with commercial providers like OpenAI and Anthropic

### Frontend Components

1. **PerformanceChart**
   - Visualizes time series metrics data
   - Supports different chart types based on metric (bar, line, area)
   - Provides summary statistics for quick analysis
   - Features responsive design

2. **ModelComparisonTable**
   - Compares key metrics across multiple models
   - Displays provider, status, response time, success rate, and cost
   - Allows selection of models to compare
   - Provides sortable and filterable data

3. **AIMetricsDashboard**
   - Combines metrics visualizations in a comprehensive dashboard
   - Tabs for performance charts and model comparison
   - Includes controls for model selection, metric type, and time period
   - Provides real-time data refreshing

4. **API Client Integration**
   - Uses unified API client architecture
   - Implements proper caching and error handling
   - Provides React Query hooks for data fetching

## Features

### Time Series Visualization

The PerformanceChart component provides interactive time series visualization with:

- Multiple visualization types based on metric (line charts for response time, area charts for success rate, bar charts for counts)
- Time period selection (hour, day, week, month, all time)
- Statistical summaries (avg, min, max, total)
- Responsive design that works on all screen sizes

### Model Comparison

The ModelComparisonTable component offers comprehensive model comparison capabilities:

- Side-by-side comparison of multiple models
- Key metrics display (response time, success rate, request count, token usage)
- Cost estimation for commercial providers
- Status indicators for model availability

### Metrics Dashboard

The AIMetricsDashboard ties everything together with:

- Tabbed interface for different visualizations
- Controls for model selection, metric type, and time period
- Weekly success rate and usage visualizations
- Model comparison tools

## Implementation Details

### Metrics Tracking

Metrics are recorded at several points:

1. **Request Start**: When a model request begins, start time is recorded
2. **Request Completion**: Upon completion, response time is calculated
3. **Success/Failure**: Outcome is recorded for success rate calculation
4. **Token Usage**: Input and output tokens are counted
5. **Cost Calculation**: For commercial providers, cost is estimated based on token usage

### Data Aggregation

The MetricsService aggregates data for visualization:

- Raw metrics are stored with timestamps
- Aggregation is performed based on requested time period and interval
- Statistical calculations are applied (avg, min, max, percentiles)
- Time series data is formatted for visualization

### Cost Tracking

For commercial providers (OpenAI, Anthropic), costs are estimated based on:

- Current pricing information for each model
- Input and output token counts
- Different rates for input vs. output tokens
- Provider-specific pricing tiers

## Usage

1. **Accessing the Dashboard**:
   - Navigate to "AI Metrics" in the sidebar
   - The dashboard displays by default for the selected model

2. **Viewing Performance Charts**:
   - Select a model from the dropdown
   - Choose a metric (response time, success rate, request count, token usage)
   - Select a time period (hour, day, week, month, all)
   - The chart updates automatically

3. **Comparing Models**:
   - Click the "Model Comparison" tab
   - Select multiple models from the dropdown
   - View side-by-side metrics comparison
   - Sort by any metric to find the best performing model

## Benefits

The AI Performance Metrics feature provides several key benefits:

1. **Informed Decision Making**: Data-driven selection of the best models for specific tasks
2. **Cost Optimization**: Identification of cost-effective models and usage patterns
3. **Performance Monitoring**: Early detection of performance degradation
4. **Usage Tracking**: Understanding of usage patterns and trends
5. **Budget Management**: Monitoring and controlling costs for commercial providers

## Future Enhancements

Planned enhancements for this feature include:

1. **Alerting**: Notifications for performance degradation or cost thresholds
2. **Anomaly Detection**: Automatic identification of unusual performance patterns
3. **Recommendations**: AI-powered suggestions for model selection based on task type
4. **Custom Metrics**: User-defined metrics and calculations
5. **Export Capabilities**: Data export for external analysis

## Conclusion

The AI Performance Metrics feature provides comprehensive tools for monitoring, analyzing, and optimizing AI model usage in Dexter. By tracking key metrics like response time, success rate, and cost, users can make informed decisions about model selection and usage patterns.