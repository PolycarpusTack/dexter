// File: frontend/src/components/EventTable/EventTable.jsx

import React, { forwardRef } from 'react';
import EnhancedEventTable from './EnhancedEventTable.jsx';

/**
 * EventTable component - wrapper around the enhanced implementation
 * This is a wrapper around the enhanced implementation for backward compatibility
 */
const EventTable = forwardRef((props, ref) => {
  return <EnhancedEventTable {...props} ref={ref} />;
});

EventTable.displayName = "EventTable";

export default EventTable;
