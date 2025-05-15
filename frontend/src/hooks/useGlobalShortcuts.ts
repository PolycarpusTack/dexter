// File: frontend/src/hooks/useGlobalShortcuts.ts

import { useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Shortcut configuration type
 */
export interface ShortcutConfig {
  /** The key to trigger the shortcut (e.g., 'e', 'ArrowUp') */
  key: string;
  /** Whether the ctrl key must be pressed */
  ctrl?: boolean;
  /** Whether the shift key must be pressed */
  shift?: boolean;
  /** Whether the alt key must be pressed */
  alt?: boolean;
  /** Callback to run when shortcut is triggered */
  action: () => void;
  /** Description of what the shortcut does */
  description: string;
  /** The scope where this shortcut is active ('global' or component name) */
  scope: 'global' | string;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
  /** Whether to stop event propagation */
  stopPropagation?: boolean;
  /** The route where this shortcut is active (optional) */
  route?: string;
  /** Is the shortcut disabled */
  disabled?: boolean;
}

/**
 * Global keyboard shortcuts hook for app-wide navigation and commands
 * 
 * @param shortcuts - Array of shortcut configurations
 * @param dependencies - Array of dependencies to update shortcuts
 * @returns Object with registered shortcuts and methods to add/remove shortcuts
 */
export function useGlobalShortcuts(
  shortcuts: ShortcutConfig[] = [],
  dependencies: any[] = []
) {
  const location = useLocation();
  const navigate = useNavigate();
  const registeredShortcuts = useRef<ShortcutConfig[]>(shortcuts);
  const activeScope = useRef<string>('global');
  
  // Update shortcuts when dependencies change
  useEffect(() => {
    registeredShortcuts.current = shortcuts;
  }, [shortcuts, ...dependencies]);
  
  // Set active scope for component-specific shortcuts
  const setActiveScope = useCallback((scope: string) => {
    activeScope.current = scope;
  }, []);
  
  // Reset scope to global
  const resetScope = useCallback(() => {
    activeScope.current = 'global';
  }, []);
  
  // Register a new shortcut dynamically
  const registerShortcut = useCallback((shortcut: ShortcutConfig) => {
    registeredShortcuts.current = [...registeredShortcuts.current, shortcut];
  }, []);
  
  // Remove a shortcut by key and modifiers
  const unregisterShortcut = useCallback((key: string, ctrl = false, shift = false, alt = false) => {
    registeredShortcuts.current = registeredShortcuts.current.filter(
      shortcut => 
        !(shortcut.key === key && 
          shortcut.ctrl === ctrl && 
          shortcut.shift === shift && 
          shortcut.alt === alt)
    );
  }, []);
  
  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if modifier key is pressed alone, or if target is an input element
    if (
      event.key === 'Control' ||
      event.key === 'Shift' ||
      event.key === 'Alt' ||
      event.key === 'Meta' ||
      (event.target instanceof HTMLElement &&
        (event.target.tagName === 'INPUT' ||
         event.target.tagName === 'TEXTAREA' ||
         event.target.isContentEditable))
    ) {
      return;
    }
    
    // Find matching shortcut
    const matchingShortcut = registeredShortcuts.current.find(shortcut => {
      // If shortcut is disabled, skip it
      if (shortcut.disabled) {
        return false;
      }
      
      // Check if shortcut is route-specific and current route doesn't match
      if (shortcut.route && !location.pathname.includes(shortcut.route)) {
        return false;
      }
      
      // Check if component-specific shortcut and active scope doesn't match
      if (shortcut.scope !== 'global' && shortcut.scope !== activeScope.current) {
        return false;
      }
      
      // Check key and modifiers
      return (
        shortcut.key === event.key &&
        !!shortcut.ctrl === event.ctrlKey &&
        !!shortcut.shift === event.shiftKey &&
        !!shortcut.alt === event.altKey
      );
    });
    
    // Execute matching shortcut if found
    if (matchingShortcut) {
      if (matchingShortcut.preventDefault) {
        event.preventDefault();
      }
      
      if (matchingShortcut.stopPropagation) {
        event.stopPropagation();
      }
      
      matchingShortcut.action();
    }
  }, [location.pathname]);
  
  // Register global keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  // Navigate to route with keyboard shortcut
  const navigateTo = useCallback((route: string) => {
    return () => {
      navigate(route);
    };
  }, [navigate]);
  
  return {
    registeredShortcuts: registeredShortcuts.current,
    setActiveScope,
    resetScope,
    registerShortcut,
    unregisterShortcut,
    navigateTo
  };
}

// Common shortcut configurations
export const globalShortcuts: ShortcutConfig[] = [
  {
    key: 'g',
    ctrl: true,
    action: () => document.location.href = '/',
    description: 'Go to dashboard',
    scope: 'global',
    preventDefault: true
  },
  {
    key: 'i',
    ctrl: true,
    action: () => document.location.href = '/issues',
    description: 'Go to issues',
    scope: 'global',
    preventDefault: true
  },
  {
    key: 'e',
    ctrl: true,
    action: () => document.location.href = '/events',
    description: 'Go to events',
    scope: 'global',
    preventDefault: true
  },
  {
    key: 'd',
    ctrl: true,
    action: () => document.location.href = '/discover',
    description: 'Go to discover',
    scope: 'global',
    preventDefault: true
  },
  {
    key: '/',
    action: () => {
      // Focus search input if it exists
      const searchInput = document.querySelector('input[type="search"]');
      if (searchInput instanceof HTMLElement) {
        searchInput.focus();
      }
    },
    description: 'Focus search',
    scope: 'global',
    preventDefault: true
  },
  {
    key: 'Escape',
    action: () => {
      // Close any open modal dialogs
      const closeButtons = document.querySelectorAll('[aria-label="Close modal"]');
      if (closeButtons.length > 0 && closeButtons[0] instanceof HTMLElement) {
        closeButtons[0].click();
      }
    },
    description: 'Close modal / Cancel',
    scope: 'global'
  },
  {
    key: '?',
    action: () => {
      // Show keyboard shortcuts guide
      const event = new CustomEvent('toggle-keyboard-shortcuts-guide');
      document.dispatchEvent(event);
    },
    description: 'Show keyboard shortcuts',
    scope: 'global',
    preventDefault: true
  }
];

export default useGlobalShortcuts;