// File: frontend/src/hooks/useTableKeyboardNavigation.ts

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Interface for the useTableKeyboardNavigation hook parameters
 */
interface TableNavigationOptions<T> {
  /** Array of items being displayed in the table */
  items: T[];
  /** Reference to the table container element */
  containerRef?: React.RefObject<HTMLElement>;
  /** Function to call when an item is selected */
  onSelect?: (item: T, index: number) => void;
  /** Function to call when a row should be opened/activated */
  onActivate?: (item: T, index: number) => void;
  /** Function to call when a row is toggled for bulk actions */
  onToggle?: (item: T, index: number, selected: boolean) => void;
  /** CSS selector for identifying table rows */
  rowSelector?: string;
  /** Whether to disable keyboard navigation */
  disabled?: boolean;
  /** ID for the list element, used for ARIA properties */
  listId?: string;
}

/**
 * Custom hook for keyboard navigation in tables
 * Provides functionality for navigating, selecting, and activating table rows
 * 
 * @param options - Configuration options for keyboard navigation behavior
 * @returns Object containing state and handlers for keyboard navigation
 */
export function useTableKeyboardNavigation<T>(options: TableNavigationOptions<T>) {
  const {
    items,
    containerRef,
    onSelect,
    onActivate,
    onToggle,
    rowSelector = 'tr[data-index]',
    disabled = false,
    listId = 'keyboard-nav-table'
  } = options;

  // Create ref if not provided
  const internalRef = useRef<HTMLDivElement>(null);
  const tableRef = containerRef || internalRef;
  
  // Currently focused item index
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  
  // Currently selected items (for bulk operations)
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  
  // Whether the table has focus
  const [hasFocus, setHasFocus] = useState<boolean>(false);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement> | KeyboardEvent) => {
    if (disabled || items.length === 0) return;
    
    // Only handle if we're focused or directly received the event
    if (!hasFocus && event instanceof KeyboardEvent) return;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev >= items.length - 1 ? 0 : prev + 1
        );
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev <= 0 ? items.length - 1 : prev - 1
        );
        break;
        
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
        
      case 'End':
        event.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
        
      case 'Enter':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          onActivate?.(items[focusedIndex], focusedIndex);
        }
        break;
        
      case ' ': // Space key
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          const isSelected = selectedIndexes.has(focusedIndex);
          const newSelection = new Set(selectedIndexes);
          
          if (isSelected) {
            newSelection.delete(focusedIndex);
          } else {
            newSelection.add(focusedIndex);
          }
          
          setSelectedIndexes(newSelection);
          onToggle?.(items[focusedIndex], focusedIndex, !isSelected);
        }
        break;
    }
  }, [disabled, items, hasFocus, focusedIndex, selectedIndexes, onActivate, onToggle]);
  
  // Focus row when index changes
  useEffect(() => {
    if (disabled || focusedIndex < 0 || !tableRef.current) return;
    
    // Find the focused row
    const rows = tableRef.current.querySelectorAll<HTMLElement>(rowSelector);
    const focusedRow = rows[focusedIndex];
    
    if (focusedRow) {
      // Scroll into view if needed
      if (focusedRow.scrollIntoView) {
        focusedRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      
      // Call onSelect callback if provided
      if (onSelect && focusedIndex >= 0 && focusedIndex < items.length) {
        onSelect(items[focusedIndex], focusedIndex);
      }
      
      // Update ARIA attributes
      rows.forEach((row, i) => {
        row.setAttribute('aria-selected', (i === focusedIndex).toString());
      });
    }
  }, [disabled, focusedIndex, items, onSelect, rowSelector, tableRef]);
  
  // Update focus state when container gets/loses focus
  useEffect(() => {
    if (disabled || !tableRef.current) return;
    
    const element = tableRef.current;
    
    const handleFocus = () => {
      setHasFocus(true);
      // If no row is focused, focus the first row
      if (focusedIndex < 0 && items.length > 0) {
        setFocusedIndex(0);
      }
    };
    
    const handleBlur = (e: FocusEvent) => {
      // Only set hasFocus to false if focus moved outside the container
      if (!element.contains(e.relatedTarget as Node)) {
        setHasFocus(false);
      }
    };
    
    element.addEventListener('focus', handleFocus, true);
    element.addEventListener('blur', handleBlur, true);
    
    // Set keyboard event listener on the container
    element.addEventListener('keydown', handleKeyDown as any);
    
    return () => {
      element.removeEventListener('focus', handleFocus, true);
      element.removeEventListener('blur', handleBlur, true);
      element.removeEventListener('keydown', handleKeyDown as any);
    };
  }, [disabled, tableRef, handleKeyDown, focusedIndex, items.length]);
  
  // Reset focused index when items change
  useEffect(() => {
    if (focusedIndex >= items.length) {
      setFocusedIndex(items.length > 0 ? items.length - 1 : -1);
    }
  }, [items, focusedIndex]);
  
  // Method to programmatically focus an item
  const focusItem = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      setFocusedIndex(index);
      tableRef.current?.focus();
      setHasFocus(true);
    }
  }, [items.length, tableRef]);
  
  return {
    focusedIndex,
    setFocusedIndex,
    selectedIndexes,
    isSelected: useCallback((index: number) => selectedIndexes.has(index), [selectedIndexes]),
    toggleSelection: useCallback((index: number) => {
      setSelectedIndexes(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(index)) {
          newSelection.delete(index);
        } else {
          newSelection.add(index);
        }
        return newSelection;
      });
    }, []),
    tableRef,
    handleKeyDown,
    focusItem,
    hasFocus,
    getRowProps: useCallback((index: number) => ({
      'data-index': index,
      'aria-selected': focusedIndex === index,
      tabIndex: focusedIndex === index ? 0 : -1,
      role: 'row',
      style: {
        cursor: 'pointer',
        backgroundColor: focusedIndex === index ? 'rgba(0, 120, 255, 0.1)' : undefined,
        outline: 'none'
      },
      onFocus: () => {
        setFocusedIndex(index);
        setHasFocus(true);
      }
    }), [focusedIndex]),
    getTableProps: useCallback(() => ({
      role: 'grid',
      'aria-rowcount': items.length,
      'aria-colcount': 1, // Default value, should be overridden by implementation
      tabIndex: 0,
      id: listId
    }), [items.length, listId])
  };
}

export default useTableKeyboardNavigation;