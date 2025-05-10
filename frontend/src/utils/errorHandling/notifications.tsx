// File: src/utils/errorHandling/notifications.tsx

import React from 'react';
import { 
  showNotification, 
  updateNotification,
  hideNotification 
} from '@mantine/notifications';
import { 
  IconCheck, 
  IconX, 
  IconInfoCircle, 
  IconAlertTriangle 
} from '@tabler/icons-react';

/**
 * Interface for notification options
 */
export interface NotificationOptions {
  /** Notification ID for updates */
  id?: string;
  /** Notification title */
  title: string;
  /** Notification message */
  message?: string;
  /** Error object, if any */
  error?: Error;
  /** Automatically hide after timeout (ms, 0 to persist) */
  autoClose?: number;
  /** Icon to show with notification */
  icon?: React.ReactNode;
  /** Notification color */
  color?: string;
  /** Loading state */
  loading?: boolean;
  /** Whether to disable auto-hiding */
  disableAutoClose?: boolean;
}

/**
 * Show a success notification
 * 
 * @param options - Notification options
 */
export function showSuccessNotification(options: NotificationOptions): void {
  const { 
    id = `success-${Date.now()}`,
    title, 
    message = 'Operation completed successfully',
    autoClose = 5000, 
    icon = <IconCheck size={18} />,
    color = 'green',
    disableAutoClose = false
  } = options;
  
  showNotification({
    id,
    title,
    message,
    color,
    icon,
    autoClose: disableAutoClose ? false : autoClose
  });
}

/**
 * Show an error notification
 * 
 * @param options - Notification options
 */
export function showErrorNotification(options: NotificationOptions): void {
  const { 
    id = `error-${Date.now()}`,
    title, 
    message = 'An error occurred',
    error,
    autoClose = 7000, 
    icon = <IconX size={18} />,
    color = 'red',
    disableAutoClose = false
  } = options;
  
  const errorMessage = error?.message || message;
  
  showNotification({
    id,
    title,
    message: errorMessage,
    color,
    icon,
    autoClose: disableAutoClose ? false : autoClose
  });
}

/**
 * Show an info notification
 * 
 * @param options - Notification options
 */
export function showInfoNotification(options: NotificationOptions): void {
  const { 
    id = `info-${Date.now()}`,
    title, 
    message = '',
    autoClose = 5000, 
    icon = <IconInfoCircle size={18} />,
    color = 'blue',
    disableAutoClose = false
  } = options;
  
  showNotification({
    id,
    title,
    message,
    color,
    icon,
    autoClose: disableAutoClose ? false : autoClose
  });
}

/**
 * Show a warning notification
 * 
 * @param options - Notification options
 */
export function showWarningNotification(options: NotificationOptions): void {
  const { 
    id = `warning-${Date.now()}`,
    title, 
    message = '',
    autoClose = 6000, 
    icon = <IconAlertTriangle size={18} />,
    color = 'yellow',
    disableAutoClose = false
  } = options;
  
  showNotification({
    id,
    title,
    message,
    color,
    icon,
    autoClose: disableAutoClose ? false : autoClose
  });
}

/**
 * Show a loading notification
 * 
 * @param options - Notification options
 * @returns Function to update or hide the notification
 */
export function showLoadingNotification(options: NotificationOptions): {
  updateMessage: (message: string) => void;
  complete: (completeOptions?: Partial<NotificationOptions>) => void;
} {
  const { 
    id = `loading-${Date.now()}`,
    title, 
    message = 'Processing...',
    color = 'blue',
    loading = true,
    disableAutoClose = true // This is used to ensure loading notifications persist
  } = options;
  
  // We use the disableAutoClose value by always setting autoClose: false for loading notifications
  const autoCloseValue = disableAutoClose ? false : 5000;
  
  showNotification({
    id,
    title,
    message,
    color,
    loading,
    autoClose: autoCloseValue // Use the calculated value
  });
  
  // Return functions to update or complete the notification
  return {
    // Update the loading message
    updateMessage: (newMessage: string) => {
      updateNotification({
        id,
        title,
        message: newMessage,
        color,
        loading,
        autoClose: false
      });
    },
    
    // Complete the loading notification
    complete: (completeOptions: Partial<NotificationOptions> = {}) => {
      const {
        title: completeTitle = 'Complete',
        message: completeMessage = 'Operation completed successfully',
        color: completeColor = 'green',
        icon: completeIcon = <IconCheck size={18} />,
        autoClose: completeAutoClose = 5000
      } = completeOptions;
      
      updateNotification({
        id,
        title: completeTitle,
        message: completeMessage,
        color: completeColor,
        icon: completeIcon,
        loading: false,
        autoClose: completeAutoClose
      });
    }
  };
}

/**
 * Hide a notification by ID
 * 
 * @param id - ID of the notification to hide
 */
export function dismissNotification(id: string): void {
  hideNotification(id);
}

export default {
  showSuccessNotification,
  showErrorNotification,
  showInfoNotification,
  showWarningNotification,
  showLoadingNotification,
  dismissNotification
};
