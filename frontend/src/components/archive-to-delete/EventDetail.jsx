// File: frontend/src/components/EventDetail/EventDetail.jsx

import React, { forwardRef } from "react";
import EnhancedEventDetail from "./EnhancedEventDetail";

/**
 * EventDetail component displays detailed information about a selected Sentry event
 * This is a wrapper around the enhanced implementation for backward compatibility
 */
const EventDetail = forwardRef((props, ref) => {
  return <EnhancedEventDetail {...props} ref={ref} />;
});

EventDetail.displayName = "EventDetail";

export default EventDetail;
