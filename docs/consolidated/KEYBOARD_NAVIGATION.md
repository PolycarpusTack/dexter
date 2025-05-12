# Keyboard Navigation Guide

## Overview

Dexter provides comprehensive keyboard navigation to enhance productivity. This document consolidates information about keyboard shortcuts and navigation features throughout the application.

## Table of Contents

1. [Global Shortcuts](#global-shortcuts)
2. [Event Table Navigation](#event-table-navigation)
3. [Issue Navigation](#issue-navigation)
4. [Deadlock Analysis](#deadlock-analysis)
5. [Discover Interface](#discover-interface)
6. [Modal Interactions](#modal-interactions)
7. [Customizing Shortcuts](#customizing-shortcuts)
8. [Accessibility Considerations](#accessibility-considerations)

## Global Shortcuts

These shortcuts work throughout the application:

| Shortcut | Action |
|----------|--------|
| `?` | Open keyboard shortcut help |
| `g d` | Go to Dashboard |
| `g i` | Go to Issues |
| `g e` | Go to Events |
| `g s` | Go to Settings |
| `g h` | Go to Help |
| `Ctrl+/` | Global search |
| `Esc` | Close current modal/dialog |
| `Ctrl+Enter` | Submit current form |

### Navigation Between Sections

To quickly navigate between major sections:

| Shortcut | Action |
|----------|--------|
| `Tab` | Move to next focusable element |
| `Shift+Tab` | Move to previous focusable element |
| `Alt+1` through `Alt+9` | Jump to corresponding tab/section |

## Event Table Navigation

The event table supports efficient keyboard navigation:

| Shortcut | Action |
|----------|--------|
| `j` | Move down to next event |
| `k` | Move up to previous event |
| `o` or `Enter` | Open selected event details |
| `x` | Select/deselect current event |
| `Shift+x` | Select range of events |
| `/` | Focus the search box |
| `f` | Open filters panel |
| `r` | Refresh current view |
| `Shift+j` | Go to next page |
| `Shift+k` | Go to previous page |
| `Home` | Jump to first event in list |
| `End` | Jump to last event in list |

### Bulk Operations

When multiple events are selected:

| Shortcut | Action |
|----------|--------|
| `e` | Execute bulk operation |
| `a` | Select all events |
| `A` | Deselect all events |
| `i` | Invert selection |
| `m` | Mark selected events as reviewed |
| `Shift+a` | Archive selected events |
| `Shift+d` | Delete selected events |

## Issue Navigation

Shortcuts for the Issues view:

| Shortcut | Action |
|----------|--------|
| `j` | Move to next issue |
| `k` | Move to previous issue |
| `o` or `Enter` | Open selected issue |
| `x` | Select/deselect current issue |
| `u` | Mark as unresolved |
| `r` | Mark as resolved |
| `i` | Mark as ignored |
| `a` | Assign issue |
| `p` | Set priority |
| `t` | Add tag |
| `c` | Add comment |
| `s` | Subscribe/unsubscribe |

## Deadlock Analysis

Keyboard shortcuts for the Deadlock Analyzer:

| Shortcut | Action |
|----------|--------|
| `+` | Zoom in graph |
| `-` | Zoom out graph |
| `0` | Reset zoom |
| `f` | Focus on selected node |
| `c` | Center graph |
| `h` | Toggle highlight mode |
| `t` | Switch to tabular view |
| `g` | Switch to graph view |
| `r` | Show recommendations |
| `1-9` | Select node by number |
| `Shift+Arrow Keys` | Pan graph |

## Discover Interface

Shortcuts for the Discover query interface:

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Run query |
| `Ctrl+s` | Save query |
| `Ctrl+Space` | Show auto-complete suggestions |
| `Alt+q` | Focus query editor |
| `Alt+f` | Focus filter field |
| `Alt+g` | Focus groupby field |
| `Alt+s` | Focus sort field |
| `Alt+l` | Focus limit field |
| `Alt+v` | Toggle visualization |
| `Alt+t` | Toggle between table/visualization |
| `Alt+d` | Toggle date range selector |

## Modal Interactions

Keyboard shortcuts for modals:

| Shortcut | Action |
|----------|--------|
| `Esc` | Close modal |
| `Tab` | Navigate between elements |
| `Shift+Tab` | Navigate backward |
| `Enter` | Activate current element |
| `Space` | Activate current element |
| `Arrow Keys` | Navigate within dropdown or list |
| `Ctrl+Enter` | Submit form |
| `Alt+1` through `Alt+9` | Switch to corresponding tab |

## Customizing Shortcuts

Users can customize keyboard shortcuts in the Settings page:

1. Navigate to Settings > Keyboard
2. Find the shortcut you want to customize
3. Click the shortcut field
4. Press the desired key combination
5. Click Save

### Custom Shortcut Sets

The application supports multiple shortcut sets:

- **Default**: Standard shortcuts
- **Vim-inspired**: Vi/Vim-like navigation
- **VSCode**: Similar to Visual Studio Code
- **Custom**: User-defined shortcuts

To create a custom shortcut set:

1. Go to Settings > Keyboard
2. Click "Create New Set"
3. Name your set
4. Customize shortcuts
5. Click Save

## Accessibility Considerations

Keyboard navigation is designed with accessibility in mind:

1. **Focus Indicators**: Visible focus indicators are provided for all interactive elements
2. **Skip Links**: Hidden links that become visible on keyboard focus allow skipping to main content
3. **ARIA Support**: All interactive elements include appropriate ARIA attributes
4. **Consistent Patterns**: Navigation patterns are consistent throughout the application
5. **Screen Reader Support**: All actions are announced appropriately for screen readers

### Focus Management

The application manages focus carefully:

- When opening a modal, focus is automatically moved to the first interactive element
- When closing a modal, focus returns to the previously focused element
- In table views, the currently selected row has both visual and aria selection indicators

### Testing Accessibility

The development team regularly tests keyboard navigation using:

- Keyboard-only navigation
- Screen readers (NVDA, JAWS, VoiceOver)
- Focus tracking tools
- Automated accessibility testing tools

## Implementation Details

The keyboard navigation system is implemented using:

```typescript
// useKeyboardNavigation.ts
import { useEffect, useCallback, useState, RefObject } from 'react';

interface KeyboardNavigationOptions {
  containerRef: RefObject<HTMLElement>;
  itemSelector: string;
  onSelect?: (item: HTMLElement, index: number) => void;
  initialIndex?: number;
  enableWrapping?: boolean;
  disableTab?: boolean;
}

export function useKeyboardNavigation({
  containerRef,
  itemSelector,
  onSelect,
  initialIndex = -1,
  enableWrapping = true,
  disableTab = false,
}: KeyboardNavigationOptions) {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  const getItems = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll(itemSelector)) as HTMLElement[];
  }, [containerRef, itemSelector]);

  const selectItem = useCallback(
    (index: number) => {
      const items = getItems();
      if (items.length === 0) return;

      // Handle wrapping
      let newIndex = index;
      if (enableWrapping) {
        if (newIndex < 0) newIndex = items.length - 1;
        if (newIndex >= items.length) newIndex = 0;
      } else {
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= items.length) newIndex = items.length - 1;
      }

      setSelectedIndex(newIndex);
      const selectedItem = items[newIndex];
      
      if (selectedItem) {
        selectedItem.focus();
        if (onSelect) {
          onSelect(selectedItem, newIndex);
        }
      }
    },
    [getItems, enableWrapping, onSelect]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!containerRef.current) return;
      
      const items = getItems();
      if (items.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
        case 'j':
          event.preventDefault();
          selectItem(selectedIndex + 1);
          break;
        case 'ArrowUp':
        case 'k':
          event.preventDefault();
          selectItem(selectedIndex - 1);
          break;
        case 'Home':
          event.preventDefault();
          selectItem(0);
          break;
        case 'End':
          event.preventDefault();
          selectItem(items.length - 1);
          break;
        case 'Enter':
        case 'o':
          if (selectedIndex >= 0 && selectedIndex < items.length) {
            event.preventDefault();
            if (onSelect) {
              onSelect(items[selectedIndex], selectedIndex);
            }
          }
          break;
        case 'Tab':
          if (disableTab) {
            event.preventDefault();
            selectItem(event.shiftKey ? selectedIndex - 1 : selectedIndex + 1);
          }
          break;
      }
    },
    [containerRef, getItems, selectedIndex, selectItem, disableTab, onSelect]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, handleKeyDown]);

  return {
    selectedIndex,
    setSelectedIndex: selectItem,
  };
}
```

### Keyboard Shortcut Modal

The keyboard shortcut help is implemented as a modal dialog:

```typescript
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ShortcutInfo {
  key: string;
  description: string;
  section: string;
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: ShortcutInfo[];
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  shortcuts,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Group shortcuts by section
  const shortcutsBySection = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.section]) {
      acc[shortcut.section] = [];
    }
    acc[shortcut.section].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutInfo[]>);

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          {Object.entries(shortcutsBySection).map(([section, sectionShortcuts]) => (
            <div key={section} className="shortcut-section">
              <h3>{section}</h3>
              <table>
                <thead>
                  <tr>
                    <th>Shortcut</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionShortcuts.map((shortcut) => (
                    <tr key={`${shortcut.section}-${shortcut.key}`}>
                      <td>
                        <kbd>{shortcut.key}</kbd>
                      </td>
                      <td>{shortcut.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default KeyboardShortcutsModal;
```

### Usage in Component

Example of how keyboard navigation is integrated into a component:

```typescript
import React, { useRef } from 'react';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';

const EventList: React.FC<{ events: Event[] }> = ({ events }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleSelectEvent = (element: HTMLElement, index: number) => {
    // Handle selection
    console.log(`Selected event at index ${index}`);
    
    // You might want to navigate to event details
    // history.push(`/events/${events[index].id}`);
  };
  
  const { selectedIndex } = useKeyboardNavigation({
    containerRef,
    itemSelector: '.event-item',
    onSelect: handleSelectEvent,
    enableWrapping: true,
  });
  
  return (
    <div className="event-list-container" ref={containerRef}>
      {events.map((event, index) => (
        <div
          key={event.id}
          className={`event-item ${selectedIndex === index ? 'selected' : ''}`}
          tabIndex={0}
          role="option"
          aria-selected={selectedIndex === index}
        >
          <h3>{event.title}</h3>
          <p>{event.description}</p>
        </div>
      ))}
    </div>
  );
};

export default EventList;
```

## Common Keyboard Navigation Patterns

Dexter implements several common keyboard navigation patterns for consistency:

### Table Navigation

All tables follow a consistent navigation pattern:

- `j`/`k` or arrow keys to move up and down
- `Enter` to view details
- `x` to select
- Number keys (1-9) for common actions

### Form Navigation

All forms follow standard patterns:

- `Tab` to move between fields
- `Shift+Tab` to move backward
- `Enter` to submit
- `Esc` to cancel

### Modal Navigation

Modals trap focus within them until closed:

- Focus starts on the first interactive element
- `Tab` cycles through focusable elements without leaving the modal
- `Esc` closes the modal
- Focus returns to the element that opened the modal
