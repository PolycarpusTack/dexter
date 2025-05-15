/**
 * Utility functions for keyboard navigation
 */

// Key codes for arrow and navigation keys
export const Keys = {
  TAB: 'Tab',
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft', 
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

export type KeyboardEventKeys = typeof Keys[keyof typeof Keys];

// Modifier keys
export const ModifierKeys = {
  ALT: 'Alt',
  CONTROL: 'Control',
  META: 'Meta',
  SHIFT: 'Shift',
} as const;

export type ModifierKey = typeof ModifierKeys[keyof typeof ModifierKeys];

// Shortcut definition
export interface KeyboardShortcut {
  key: string;
  modifiers?: ModifierKey[];
  action: () => void;
  description: string;
  scope?: 'global' | 'component';
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

/**
 * Check if a keyboard event matches a keyboard shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut
): boolean {
  // Check if the pressed key matches the shortcut key
  if (event.key !== shortcut.key) {
    return false;
  }

  // If no modifiers are defined, just check for key match
  if (!shortcut.modifiers || shortcut.modifiers.length === 0) {
    return true;
  }

  // Check for each modifier
  const pressedModifiers = {
    [ModifierKeys.ALT]: event.altKey,
    [ModifierKeys.CONTROL]: event.ctrlKey,
    [ModifierKeys.META]: event.metaKey,
    [ModifierKeys.SHIFT]: event.shiftKey,
  };

  // All required modifiers must be pressed
  for (const modifier of shortcut.modifiers) {
    if (!pressedModifiers[modifier]) {
      return false;
    }
  }

  // Check no extra modifiers are pressed
  for (const [key, pressed] of Object.entries(pressedModifiers)) {
    if (pressed && !shortcut.modifiers.includes(key as ModifierKey)) {
      return false;
    }
  }

  return true;
}

/**
 * Create a keyboard event handler for multiple shortcuts
 */
export function createKeyboardHandler(
  shortcuts: KeyboardShortcut[]
): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    // Find matching shortcut
    const matchingShortcut = shortcuts.find(shortcut => 
      matchesShortcut(event, shortcut)
    );

    if (matchingShortcut) {
      // Prevent default browser behavior if requested
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault();
      }

      // Stop event propagation if requested
      if (matchingShortcut.stopPropagation) {
        event.stopPropagation();
      }

      // Execute the action
      matchingShortcut.action();
    }
  };
}

/**
 * Format a keyboard shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const modifiers = shortcut.modifiers || [];
  const formattedModifiers = modifiers.map(modifier => {
    switch (modifier) {
      case ModifierKeys.ALT:
        return 'Alt';
      case ModifierKeys.CONTROL:
        return 'Ctrl';
      case ModifierKeys.META:
        // Use Command on Mac, Windows key on Windows
        return navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Win';
      case ModifierKeys.SHIFT:
        return 'Shift';
      default:
        return modifier;
    }
  });

  // Format the key
  let formattedKey = shortcut.key;
  switch (shortcut.key) {
    case Keys.ARROW_UP:
      formattedKey = '↑';
      break;
    case Keys.ARROW_DOWN:
      formattedKey = '↓';
      break;
    case Keys.ARROW_LEFT:
      formattedKey = '←';
      break;
    case Keys.ARROW_RIGHT:
      formattedKey = '→';
      break;
    case Keys.ESCAPE:
      formattedKey = 'Esc';
      break;
    case Keys.SPACE:
      formattedKey = 'Space';
      break;
  }

  // Join modifiers and key with +
  return [...formattedModifiers, formattedKey].join(' + ');
}

/**
 * Handle keyboard navigation in a list, grid, or menu
 */
export function handleListKeyNavigation(
  event: React.KeyboardEvent,
  currentIndex: number,
  itemCount: number,
  isHorizontal: boolean = false,
  onSelect: (index: number) => void
): void {
  let newIndex = currentIndex;

  if (isHorizontal) {
    // Horizontal navigation (left/right)
    switch (event.key) {
      case Keys.ARROW_LEFT:
        newIndex = Math.max(0, currentIndex - 1);
        break;
      case Keys.ARROW_RIGHT:
        newIndex = Math.min(itemCount - 1, currentIndex + 1);
        break;
      case Keys.HOME:
        newIndex = 0;
        break;
      case Keys.END:
        newIndex = itemCount - 1;
        break;
      default:
        return;
    }
  } else {
    // Vertical navigation (up/down)
    switch (event.key) {
      case Keys.ARROW_UP:
        newIndex = Math.max(0, currentIndex - 1);
        break;
      case Keys.ARROW_DOWN:
        newIndex = Math.min(itemCount - 1, currentIndex + 1);
        break;
      case Keys.HOME:
        newIndex = 0;
        break;
      case Keys.END:
        newIndex = itemCount - 1;
        break;
      default:
        return;
    }
  }

  // Only update if index changed
  if (newIndex !== currentIndex) {
    event.preventDefault();
    onSelect(newIndex);
  }
}

/**
 * Handle keyboard navigation in a grid (2D navigation)
 */
export function handleGridKeyNavigation(
  event: React.KeyboardEvent,
  currentRow: number,
  currentCol: number, 
  rowCount: number,
  colCount: number,
  onSelect: (row: number, col: number) => void
): void {
  let newRow = currentRow;
  let newCol = currentCol;

  switch (event.key) {
    case Keys.ARROW_UP:
      newRow = Math.max(0, currentRow - 1);
      break;
    case Keys.ARROW_DOWN:
      newRow = Math.min(rowCount - 1, currentRow + 1);
      break;
    case Keys.ARROW_LEFT:
      newCol = Math.max(0, currentCol - 1);
      break;
    case Keys.ARROW_RIGHT:
      newCol = Math.min(colCount - 1, currentCol + 1);
      break;
    case Keys.HOME:
      if (event.ctrlKey) {
        // Ctrl+Home goes to first cell of first row
        newRow = 0;
        newCol = 0;
      } else {
        // Home goes to first cell of current row
        newCol = 0;
      }
      break;
    case Keys.END:
      if (event.ctrlKey) {
        // Ctrl+End goes to last cell of last row
        newRow = rowCount - 1;
        newCol = colCount - 1;
      } else {
        // End goes to last cell of current row
        newCol = colCount - 1;
      }
      break;
    case Keys.PAGE_UP:
      // Page up moves by 5 rows or to first row
      newRow = Math.max(0, currentRow - 5);
      break;
    case Keys.PAGE_DOWN:
      // Page down moves by 5 rows or to last row
      newRow = Math.min(rowCount - 1, currentRow + 5);
      break;
    default:
      return;
  }

  // Only update if position changed
  if (newRow !== currentRow || newCol !== currentCol) {
    event.preventDefault();
    onSelect(newRow, newCol);
  }
}

/**
 * Generate a key handler for tab panels
 */
export function createTabKeyHandler(
  tabCount: number,
  currentIndex: number,
  onChange: (index: number) => void
): (event: React.KeyboardEvent) => void {
  return (event: React.KeyboardEvent) => {
    let newIndex = currentIndex;

    switch (event.key) {
      case Keys.ARROW_LEFT:
        // Left arrow selects previous tab
        newIndex = (currentIndex - 1 + tabCount) % tabCount;
        break;
      case Keys.ARROW_RIGHT:
        // Right arrow selects next tab
        newIndex = (currentIndex + 1) % tabCount;
        break;
      case Keys.HOME:
        // Home selects first tab
        newIndex = 0;
        break;
      case Keys.END:
        // End selects last tab
        newIndex = tabCount - 1;
        break;
      default:
        return;
    }

    if (newIndex !== currentIndex) {
      event.preventDefault();
      onChange(newIndex);
    }
  };
}

/**
 * Parse a keyboard shortcut string into a KeyboardShortcut object
 * Format: "Ctrl+Shift+A", "Alt+Enter", etc.
 */
export function parseShortcutString(
  shortcutStr: string,
  action: () => void,
  description: string
): KeyboardShortcut {
  const parts = shortcutStr.split('+').map(part => part.trim());
  
  const modifiers: ModifierKey[] = [];
  let key = '';
  
  for (const part of parts) {
    const normalized = part.toLowerCase();
    
    // Check if this part is a modifier
    if (normalized === 'ctrl' || normalized === 'control') {
      modifiers.push(ModifierKeys.CONTROL);
    } else if (normalized === 'alt') {
      modifiers.push(ModifierKeys.ALT);
    } else if (normalized === 'shift') {
      modifiers.push(ModifierKeys.SHIFT);
    } else if (normalized === 'meta' || normalized === 'cmd' || normalized === 'command') {
      modifiers.push(ModifierKeys.META);
    } else {
      // This is the key
      if (normalized === 'up') {
        key = Keys.ARROW_UP;
      } else if (normalized === 'down') {
        key = Keys.ARROW_DOWN;
      } else if (normalized === 'left') {
        key = Keys.ARROW_LEFT;
      } else if (normalized === 'right') {
        key = Keys.ARROW_RIGHT;
      } else if (normalized === 'esc') {
        key = Keys.ESCAPE;
      } else if (normalized === 'space') {
        key = Keys.SPACE;
      } else {
        // Capitalize first letter for single keys
        key = part.length === 1 ? part.toUpperCase() : part;
      }
    }
  }
  
  return {
    key,
    modifiers,
    action,
    description,
    preventDefault: true,
  };
}

export default {
  Keys,
  ModifierKeys,
  matchesShortcut,
  createKeyboardHandler,
  formatShortcut,
  handleListKeyNavigation,
  handleGridKeyNavigation,
  createTabKeyHandler,
  parseShortcutString,
};