import { useRef, useCallback } from 'react';

/**
 * Custom hook for keyboard navigation in lists
 * 
 * Provides keyboard navigation functionality for lists, tables, and similar components.
 * Handles focus management and navigation direction.
 * 
 * @returns Object with navigation helpers and focusable ref
 */
export function useKeyboardNavigation<T extends HTMLElement>() {
  // Ref for the navigable container
  const focusableRef = useRef<T>(null);
  
  /**
   * Handle keyboard navigation within a list-like component
   * 
   * @param direction - Direction to navigate ('up' or 'down')
   * @param itemCount - Total number of items in the list
   * @param setActiveIndex - Callback to update the active index
   * @returns boolean indicating if the event was handled
   */
  const handleKeyNavigation = useCallback(
    (
      direction: 'up' | 'down',
      itemCount: number,
      setActiveIndex: (index: number | ((prev: number) => number)) => void
    ): boolean => {
      // Ensure focus is on the container
      if (document.activeElement !== focusableRef.current) {
        focusableRef.current?.focus();
        setActiveIndex(direction === 'up' ? itemCount - 1 : 0);
        return true;
      }
      
      // Update active index based on direction
      setActiveIndex((prevIndex: number) => {
        if (prevIndex === -1) {
          // If no item is active, select first or last based on direction
          return direction === 'up' ? itemCount - 1 : 0;
        } else if (direction === 'up') {
          // Move up, wrap around to bottom if at top
          return prevIndex > 0 ? prevIndex - 1 : itemCount - 1;
        } else {
          // Move down, wrap around to top if at bottom
          return prevIndex < itemCount - 1 ? prevIndex + 1 : 0;
        }
      });
      
      return true;
    },
    []
  );
  
  /**
   * Scroll an element into view with smooth behavior
   * 
   * @param element - Element to scroll into view
   */
  const scrollIntoView = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, []);
  
  /**
   * Focus specific item in a list by index
   * 
   * @param index - Index of item to focus
   * @param itemSelector - CSS selector for the items
   */
  const focusItemByIndex = useCallback(
    (index: number, itemSelector: string) => {
      if (!focusableRef.current) return;
      
      const items = focusableRef.current.querySelectorAll<HTMLElement>(itemSelector);
      if (index >= 0 && index < items.length) {
        const item = items[index];
        if (item) {
          scrollIntoView(item);
        }
      }
    },
    [scrollIntoView]
  );
  
  return {
    focusableRef,
    handleKeyNavigation,
    focusItemByIndex,
    scrollIntoView,
  };
}

export default useKeyboardNavigation;