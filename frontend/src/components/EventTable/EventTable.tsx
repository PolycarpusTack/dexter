// File: frontend/src/components/EventTable/EventTable.tsx

import React, { forwardRef, ForwardedRef } from 'react';
import EnhancedEventTable from './EnhancedEventTable';
import { EventTableProps } from './types';

/**
 * EventTable component - wrapper around the enhanced implementation
 * This is a wrapper around the enhanced implementation for backward compatibility
 */
const EventTable = forwardRef((props: EventTableProps, ref: ForwardedRef<any>) => {
  return <EnhancedEventTable {...props} ref={ref} />;
});

EventTable.displayName = "EventTable";

export default EventTable;