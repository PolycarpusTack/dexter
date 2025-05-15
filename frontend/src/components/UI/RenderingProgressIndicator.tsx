import React from 'react';
import { Text, Group, Paper } from '@mantine/core';
import { useTheme } from '@mantine/styles';

export interface RenderingProgressIndicatorProps {
  /**
   * Current progress value (0-100)
   */
  progress: number;
  
  /**
   * Current rendering status or phase
   */
  status: 'initial' | 'background' | 'nodes' | 'links' | 'labels' | 'complete';
  
  /**
   * Whether to show the progress percentage
   */
  showPercentage?: boolean;
  
  /**
   * Additional CSS class names
   */
  className?: string;
  
  /**
   * Additional inline styles
   */
  style?: React.CSSProperties;
  
  /**
   * Position of the indicator (defaults to top-left)
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * A specialized progress indicator for visualization rendering processes
 */
const RenderingProgressIndicator: React.FC<RenderingProgressIndicatorProps> = ({
  progress,
  status,
  showPercentage = true,
  className,
  style,
  position = 'top-left'
}) => {
  const theme = useTheme();
  
  // Get status text based on rendering phase
  const getStatusText = () => {
    switch (status) {
      case 'initial': return 'Initializing...';
      case 'background': return 'Preparing nodes...';
      case 'nodes': return 'Rendering nodes...';
      case 'links': return 'Adding connections...';
      case 'labels': return 'Finalizing labels...';
      case 'complete': return 'Rendering complete';
      default: return 'Rendering...';
    }
  };
  
  // Determine position styles
  const getPositionStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'absolute',
      zIndex: 10,
      margin: '10px'
    };
    
    switch (position) {
      case 'top-left':
        return { ...baseStyles, top: 0, left: 0 };
      case 'top-right':
        return { ...baseStyles, top: 0, right: 0 };
      case 'bottom-left':
        return { ...baseStyles, bottom: 0, left: 0 };
      case 'bottom-right':
        return { ...baseStyles, bottom: 0, right: 0 };
      default:
        return { ...baseStyles, top: 0, left: 0 };
    }
  };
  
  // Combine position styles with provided styles
  const combinedStyles = {
    ...getPositionStyles(),
    ...style
  };
  
  // Only render if not complete
  if (status === 'complete') return null;
  
  return (
    <Paper
      p="sm"
      shadow="sm"
      style={{
        backgroundColor: theme.colorScheme === 'dark' 
          ? 'rgba(26, 27, 30, 0.9)' 
          : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(2px)',
        border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        borderRadius: theme.radius.sm,
        ...combinedStyles
      }}
      className={className}
    >
      <Text size="sm" mb={5}>Rendering Graph...</Text>
      <Group position="apart" spacing="xs" align="center" noWrap>
        <Text size="xs" color="dimmed" style={{ width: '120px' }}>
          {getStatusText()}
        </Text>
        {showPercentage && (
          <Text size="xs" fw="bold">{Math.round(progress)}%</Text>
        )}
      </Group>
      <div style={{ 
        width: '100%', 
        height: '6px', 
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[2],
        borderRadius: theme.radius.sm,
        marginTop: '5px',
        overflow: 'hidden'
      }}>
        <div style={{ 
          width: `${progress}%`,
          height: '100%',
          backgroundColor: theme.colors.blue[6],
          borderRadius: theme.radius.sm,
          transition: 'width 0.3s ease-in-out'
        }}></div>
      </div>
    </Paper>
  );
};

export default RenderingProgressIndicator;