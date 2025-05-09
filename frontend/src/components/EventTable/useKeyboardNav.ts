// File: frontend/src/components/EventTable/useKeyboardNav.ts

import { useState, useCallback, useEffect, KeyboardEvent, RefObject, useMemo } from 'react';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { EventType } from '../../types/eventTypes';

/**
 * Custom hook for keyboard navigation in EventTable
 * 
 * Provides keyboard shortcuts for navigating, selecting, and performing actions
 * on events in the event table.
 */
export function useEventTableKeyboardNav(
  events: EventType[] | undefined,
  containerRef: RefObject<HTMLDivElement>,
  onSelect: (event: EventType) => void
) {
  // Selected event index
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  
  // Import the base keyboard navigation hook
  const { handleKeyNavigation, scrollIntoView } = useKeyboardNavigation<HTMLDivElement>();
  
  // Get currently selected event
  const selectedEvent = useMemo(() => {
    if (!events || selectedIndex === -1) return null;
    return events[selectedIndex];
  }, [events, selectedIndex]);
  
  // Reset selection when events change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [events]);
  
  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!events || events.length === 0) return;
      
      // Check if input element has focus - don't navigate when typing in inputs
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.getAttribute('role') === 'combobox' ||
          activeElement.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }
      
      switch (event.key) {
        // Navigation
        case 'ArrowUp':
          event.preventDefault();
          handleKeyNavigation('up', events.length, setSelectedIndex);
          break;
          
        case 'ArrowDown':
          event.preventDefault();
          handleKeyNavigation('down', events.length, setSelectedIndex);
          break;
          
        // Selection
        case 'Enter':
          if (selectedIndex !== -1 && selectedEvent) {
            event.preventDefault();
            onSelect(selectedEvent);
          }
          break;
          
        // Focus the search field
        case '/':
          event.preventDefault();
          const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
          if (searchInput) {
            searchInput.focus();
          }
          break;
          
        // Home/End navigation
        case 'Home':
          event.preventDefault();
          setSelectedIndex(0);
          break;
          
        case 'End':
          event.preventDefault();
          setSelectedIndex(events.length - 1);
          break;
          
        default:
          break;
      }
    },
    [events, selectedIndex, selectedEvent, handleKeyNavigation, onSelect]
  );
  
  // Scroll selected row into view
  useEffect(() => {
    if (selectedIndex !== -1 && containerRef.current) {
      const rows = containerRef.current.querySelectorAll('tbody tr');
      if (rows[selectedIndex]) {
        scrollIntoView(rows[selectedIndex] as HTMLElement);
      }
    }
  }, [selectedIndex, containerRef, scrollIntoView]);
  
  // Attach keyboard event handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Add event listener for keyboard navigation
    container.addEventListener('keydown', handleKeyDown as any);
    
    // Clean up on unmount
    return () => {
      container.removeEventListener('keydown', handleKeyDown as any);
    };
  }, [containerRef, handleKeyDown]);
  
  // Ensure the container is focusable for keyboard navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Make container focusable if it isn't already
    if (!container.getAttribute('tabindex')) {
      container.setAttribute('tabindex', '0');
    }
  }, [containerRef]);
  
  return {
    selectedIndex,
    setSelectedIndex,
    selectedEvent,
    handleKeyDown
  };
}

export default useEventTableKeyboardNav;