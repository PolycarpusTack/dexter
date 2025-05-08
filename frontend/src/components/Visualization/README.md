# Visualization Components

This directory contains visualization components used throughout the Dexter application for displaying data insights.

## Components

### SparklineChart

The `SparklineChart` component visualizes event frequency over time in a compact, inline format. It's primarily used in table cells to show trends without taking up too much space.

#### Features

- Compact time-series visualization
- Optional trend indicator showing percentage change
- Interactive tooltips with detailed information
- Configurable color and size
- Loading state handling

#### Usage

```jsx
import SparklineChart from '../Visualization/SparklineChart';

// Example data format
const data = [
  { timestamp: '2023-06-01T12:00:00Z', count: 5 },
  { timestamp: '2023-06-01T13:00:00Z', count: 8 },
  { timestamp: '2023-06-01T14:00:00Z', count: 12 },
  // ...
];

<SparklineChart
  data={data}
  timeRange="24h"
  width={120}
  height={40}
  showTrend={true}
  isLoading={false}
  color="#ff6b6b"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| data | Array | [] | Array of objects with timestamp and count properties |
| timeRange | string | '24h' | Time range displayed ('24h', '7d', '30d') |
| width | number | 120 | Width of the chart in pixels |
| height | number | 40 | Height of the chart in pixels |
| showTrend | boolean | true | Whether to show the trend indicator |
| isLoading | boolean | false | Loading state of the chart |
| color | string | null | Color of the line (defaults to theme.colors.red[6]) |

## Usage in Table Columns

The visualization components are designed to be used in table columns to provide rich visual context. They follow a consistent pattern with the SparklineCell and ImpactCell components in the EventTable.

Example:

```jsx
<Table.Td>
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <SparklineCell eventData={issue} timeRange="24h" />
  </ErrorBoundary>
</Table.Td>
```

## Best Practices

1. **Always use ErrorBoundary**: Wrap visualization components in ErrorBoundary to prevent rendering failures from affecting the entire UI.

2. **Handle loading and empty states**: All visualization components should gracefully handle loading and empty data states.

3. **Keep visualizations compact**: Table visualizations should be compact and focused on a single insight.

4. **Use tooltips for details**: Provide additional context and detail through tooltips rather than cluttering the main visualization.

5. **Maintain consistency**: Use consistent colors and styling across visualizations for a cohesive user experience.

## Future Development

Planned enhancements for visualization components include:

- Geographic impact maps showing affected user locations
- Service dependency visualizations for distributed errors
- Timeline view with deployment markers
- Heatmaps for time-based frequency analysis
- User journey impact visualization
