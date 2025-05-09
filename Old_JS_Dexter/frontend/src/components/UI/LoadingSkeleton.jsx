// File: frontend/src/components/UI/LoadingSkeleton.jsx

import React from 'react';
import PropTypes from 'prop-types';
import { Skeleton, Stack, Group, Box } from '@mantine/core';

/**
 * LoadingSkeleton component for displaying loading states
 * Provides different preset skeletons for various UI patterns
 * 
 * @param {Object} props - Component properties
 * @param {string} props.type - Type of skeleton to display 
 *                             ('table', 'detail', 'card', 'list')
 * @param {number} props.rows - Number of rows to display (for table/list)
 * @param {number} props.height - Height of the skeleton (optional)
 * @param {boolean} props.animate - Whether to animate the skeleton (default: true)
 */
function LoadingSkeleton({ 
  type = 'table', 
  rows = 5, 
  height,
  animate = true,
  ...otherProps 
}) {
  const renderTableSkeleton = () => (
    <Stack gap="sm">
      {/* Header row */}
      <Group gap="sm" mb="xs" style={{ flexWrap: 'nowrap' }}>
        <Skeleton height={40} radius="sm" width="25%" animate={animate} />
        <Skeleton height={40} radius="sm" width="15%" animate={animate} />
        <Skeleton height={40} radius="sm" width="15%" animate={animate} />
        <Skeleton height={40} radius="sm" width="20%" animate={animate} />
      </Group>
      
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, index) => (
        <Group key={index} gap="sm" style={{ flexWrap: 'nowrap' }}>
          <Skeleton height={30} radius="sm" width="25%" animate={animate} />
          <Skeleton height={30} radius="sm" width="15%" animate={animate} />
          <Skeleton height={30} radius="sm" width="15%" animate={animate} />
          <Skeleton height={30} radius="sm" width="20%" animate={animate} />
        </Group>
      ))}
    </Stack>
  );

  const renderDetailSkeleton = () => (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between" mb="xs">
        <Skeleton height={28} radius="sm" width="60%" animate={animate} />
        <Skeleton height={28} radius="sm" width="20%" animate={animate} />
      </Group>
      
      {/* Metadata */}
      <Group gap="sm" mb="md">
        <Skeleton height={24} radius="sm" width="15%" animate={animate} />
        <Skeleton height={24} radius="sm" width="25%" animate={animate} />
      </Group>
      
      {/* Content blocks */}
      <Skeleton height={100} radius="sm" width="100%" animate={animate} />
      <Skeleton height={60} radius="sm" width="90%" animate={animate} />
      
      {/* Action buttons */}
      <Group gap="sm" mt="md">
        <Skeleton height={36} radius="sm" width="15%" animate={animate} />
        <Skeleton height={36} radius="sm" width="15%" animate={animate} />
      </Group>
      
      {/* Section */}
      <Skeleton height={30} radius="sm" width="40%" animate={animate} mt="lg" />
      <Skeleton height={120} radius="sm" width="100%" animate={animate} />
    </Stack>
  );

  const renderCardSkeleton = () => (
    <Stack gap="sm">
      <Skeleton height={24} radius="sm" width="70%" animate={animate} />
      <Skeleton height={16} radius="sm" width="40%" animate={animate} />
      <Skeleton height={16} radius="sm" width="90%" animate={animate} mb="md" />
      <Skeleton height={20} radius="sm" width="30%" animate={animate} />
    </Stack>
  );

  const renderListSkeleton = () => (
    <Stack gap="sm">
      {Array.from({ length: rows }).map((_, index) => (
        <Group key={index} gap="sm" style={{ flexWrap: 'nowrap' }}>
          <Skeleton height={24} circle animate={animate} />
          <Skeleton height={24} radius="sm" width="80%" animate={animate} />
        </Group>
      ))}
    </Stack>
  );

  // Render appropriate skeleton based on type
  const renderSkeleton = () => {
    switch (type) {
      case 'table':
        return renderTableSkeleton();
      case 'detail':
        return renderDetailSkeleton();
      case 'card':
        return renderCardSkeleton();
      case 'list':
        return renderListSkeleton();
      default:
        return renderTableSkeleton();
    }
  };

  return (
    <Box style={{ height: height || 'auto' }} {...otherProps}>
      {renderSkeleton()}
    </Box>
  );
}

LoadingSkeleton.propTypes = {
  type: PropTypes.oneOf(['table', 'detail', 'card', 'list']),
  rows: PropTypes.number,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  animate: PropTypes.bool,
};

export default LoadingSkeleton;