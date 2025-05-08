# Changelog

## Version 1.1.0 - MVP Completion Phase

### Enhanced EventDetail Component

- **Modular Architecture**: Split the component into smaller, focused components
- **Data Security**: Added data masking for sensitive information
- **Error Boundaries**: Added robust error handling with ErrorBoundary components
- **Enhanced Data Extraction**: Created utilities to extract and format Sentry data
- **Better Visualization**: Improved UI organization and formatting
- **Timeline View for Breadcrumbs**: Added a timeline format for breadcrumbs
- **Release Information**: Added a dedicated release info component
- **Keyboard Navigation**: Improved keyboard support with refs and keyboard handlers
- **Accessibility**: Enhanced with better ARIA attributes and screen reader support
- **Type Safety**: Added JSDoc props documentation and better type handling
- **Compliance**: Implemented PII masking and sensitive data protection

### Enhanced EventTable Component

- **Visual Data Indicators**: Added sparkline charts and user impact visualizations
- **Multi-Select Capabilities**: Select multiple issues for bulk actions
- **Advanced Sorting**: More flexible sorting options
- **Keyboard Navigation**: Improved keyboard accessibility
- **Bulk Actions**: Perform actions on multiple issues at once
- **Context Menus**: Added more actions via context menus
- **Error Handling**: Component-level error boundaries

### New Visualization Components

- **SparklineChart**: Compact time-series visualization component
- **Frequency Analysis**: Event frequency visualization over time
- **User Impact Visualization**: Progress bar showing percentage of affected users
- **Impact Metrics**: Color-coded impact levels (critical, high, medium, low)

### API Enhancements

- **Analytics API**: New endpoints for event frequency and user impact data
- **Mock Data Generation**: Development-friendly fallback data generation
- **Custom Hooks**: Reusable data fetching hooks for visualizations

### Error Handling Improvements

- **AppErrorBoundary**: Application-level error boundary
- **Component-Level Boundaries**: Isolated error handling
- **ErrorFallback Component**: Consistent error UI
- **Error Tracking Integration**: Better error logging and reporting

### Accessibility Improvements

- **Keyboard Navigation**: Arrow key navigation in tables
- **Focus Management**: Visual focus indicators
- **Screen Reader Support**: ARIA attributes and accessible labeling
- **Color Contrast**: Improved contrast ratios for better readability

### Code Quality Improvements

- **Modular Architecture**: Better component organization
- **Documentation**: Detailed documentation for all new components
- **Type Safety**: JSDoc types for better editor support
- **Performance Optimizations**: Memoization and efficient rendering

## Version 1.0.0 - Initial Release

- Initial MVP implementation with basic error monitoring capabilities
- Sentry API integration
- Basic event detail view
- Simple error list view
- Ollama LLM integration for error explanations
- PostgreSQL deadlock detection
