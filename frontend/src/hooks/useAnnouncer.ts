import { useCallback } from 'react';
import announcer from '../services/announcer';

/**
 * Hook for making screen reader announcements
 * 
 * Provides convenient methods for announcing dynamic content changes to screen readers
 * using the centralized announcer service.
 */
export function useAnnouncer() {
  /**
   * Announce a message with specified politeness level
   */
  const announce = useCallback((
    message: string, 
    politeness: 'assertive' | 'polite' | 'off' = 'polite',
    timeout?: number
  ) => {
    announcer.announce(message, politeness, timeout);
  }, []);

  /**
   * Announce a status message (polite priority)
   */
  const announceStatus = useCallback((message: string) => {
    announcer.announceStatus(message);
  }, []);

  /**
   * Announce an important message (assertive priority)
   */
  const announceImportant = useCallback((message: string) => {
    announcer.announceImportant(message);
  }, []);

  /**
   * Announce navigation or page changes
   */
  const announceNavigation = useCallback((message: string) => {
    announcer.announceNavigation(message);
  }, []);

  /**
   * Announce a loading state change
   */
  const announceLoading = useCallback((isLoading: boolean, context?: string) => {
    announcer.announceLoading(isLoading, context);
  }, []);

  /**
   * Announce a successful operation
   */
  const announceSuccess = useCallback((message: string) => {
    announcer.announceSuccess(message);
  }, []);

  /**
   * Announce an error to users
   */
  const announceError = useCallback((message: string) => {
    announcer.announceError(message);
  }, []);

  return {
    announce,
    announceStatus,
    announceImportant,
    announceNavigation,
    announceLoading,
    announceSuccess,
    announceError,
  };
}

export default useAnnouncer;