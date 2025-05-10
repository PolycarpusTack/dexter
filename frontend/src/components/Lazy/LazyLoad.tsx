import React, { Suspense } from 'react';
import { LoadingOverlay } from '@mantine/core';

interface LazyLoadProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const LazyLoad = ({ children, fallback }: LazyLoadProps) => {
  return (
    <Suspense
      fallback={
        fallback || (
          <LoadingOverlay
            visible
            zIndex={1000}
            overlayProps={{ radius: "sm", blur: 2 }}
          />
        )
      }
    >
      {children}
    </Suspense>
  );
};
