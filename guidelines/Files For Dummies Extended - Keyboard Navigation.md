# Files For Dummies: Keyboard Navigation

## What is Keyboard Navigation?

Keyboard navigation allows users to control and interact with the Dexter application using only their keyboard, without needing to use a mouse. This makes the application:

- More accessible for users with motor disabilities
- Faster for power users who prefer keyboard shortcuts
- More efficient for common operations

## Key Files and What They Do

### 1. useGlobalShortcuts.ts

This file creates a hook that handles keyboard shortcuts throughout the entire application. It:

- Detects keyboard combinations (like Ctrl+G)
- Runs specific actions when shortcuts are pressed
- Prevents conflicts with browser shortcuts
- Makes sure shortcuts only work when they should (not in text fields)

```typescript
// Example of how it defines shortcuts
const globalShortcuts = [
  {
    key: 'g',
    ctrl: true,
    action: () => navigate('/'),
    description: 'Go to dashboard',
    scope: 'global'
  },
  // More shortcuts...
];
```

### 2. useTableKeyboardNavigation.ts

This file helps you navigate tables with the keyboard. It:

- Lets you move up and down with arrow keys
- Highlights the currently selected row
- Lets you select rows with the space bar
- Opens items when you press Enter
- Supports Home/End keys to jump to start/end

```typescript
// Example of how you use it in a component:
const {
  focusedIndex,
  handleKeyDown,
  getRowProps,
  getTableProps
} = useTableKeyboardNavigation({
  items: events,
  onActivate: (event) => openEventDetails(event.id)
});
```

### 3. KeyboardShortcutsGuide.tsx

This file creates a help screen showing all the available keyboard shortcuts. It:

- Shows different categories of shortcuts
- Explains what each shortcut does
- Shows different shortcuts for Mac vs Windows users
- Can be opened by pressing the ? key

### 4. Layout.tsx

This file sets up the global keyboard shortcuts for the application. It:

- Registers all the navigation shortcuts
- Adds the keyboard shortcuts guide
- Detects if the user is on Mac or Windows
- Sets up special shortcuts for each section of the app

## Common Use Cases

### Application Navigation

Use these global shortcuts to quickly jump between different sections:

- **Ctrl+G**: Go to dashboard
- **Ctrl+I**: Go to issues
- **Ctrl+E**: Go to events
- **Ctrl+D**: Go to discover
- **Ctrl+R**: Refresh page

### Table Navigation

When viewing a table of events or issues:

- **↑/↓**: Move up and down between rows
- **Home/End**: Jump to first/last row
- **Enter**: Open the selected item
- **Space**: Select/deselect the row (for bulk actions)

### Interface Controls

General shortcuts that work throughout the app:

- **?**: Show keyboard shortcuts guide
- **Esc**: Close dialogs or cancel operations
- **/**: Focus the search box
- **Ctrl+F**: Find in page

## How It Works

1. **Global Event Listening**:
   The application sets up event listeners that watch for keyboard presses.

2. **Context Awareness**:
   Shortcuts only work in the right context (e.g., table shortcuts only work when a table has focus).

3. **Action Mapping**:
   Each key combination is mapped to a specific function.

4. **Visual Feedback**:
   You get visual feedback showing which element is focused.

## Accessibility Benefits

- Users with mobility impairments can navigate without using a mouse
- Screen reader compatibility with proper ARIA attributes
- Consistent keyboard shortcuts across the entire application
- Clear visual indicators of keyboard focus

## Tips for Using Keyboard Navigation

1. Press **?** at any time to see available shortcuts
2. Use **Tab** to move between interactive elements
3. Look for the blue outline showing which element has keyboard focus
4. Keyboard shortcuts don't work when you're typing in a text field

## For Developers

If you're adding new features, remember to:

1. Add keyboard support to new interactive components
2. Update the shortcuts guide with any new shortcuts
3. Use existing hooks to maintain consistent behavior
4. Add proper ARIA attributes for accessibility
5. Test your feature with keyboard-only navigation