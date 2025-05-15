# Ultimate Zero-to-Hero Guide: Keyboard Navigation

## Introduction

Keyboard navigation is a crucial accessibility and productivity feature in modern web applications. This guide covers the implementation of a comprehensive keyboard navigation system in Dexter, including global shortcuts, component-specific keyboard controls, and ARIA-compliant navigation patterns.

## Core Architecture

The keyboard navigation system is built on three main pillars:

1. **Global Shortcuts**: Application-wide keyboard shortcuts for navigation and common actions
2. **Component-Specific Navigation**: Specialized keyboard controls for specific components like tables
3. **Accessibility Integration**: ARIA attributes and focus management for screen reader compatibility

## Technical Implementation

### Global Shortcuts System

The global shortcuts system is implemented using the `useGlobalShortcuts` hook located in `/src/hooks/useGlobalShortcuts.ts`. This hook provides:

- Registration of keyboard shortcuts with modifiers (Ctrl, Alt, Shift)
- Scope-based activation (global vs. component-specific)
- Route-specific shortcuts
- Prevention of browser default behavior when needed

```typescript
export interface ShortcutConfig {
  key: string;              // The key to trigger the shortcut
  ctrl?: boolean;           // Whether Ctrl key is required
  shift?: boolean;          // Whether Shift key is required
  alt?: boolean;            // Whether Alt key is required
  action: () => void;       // Function to execute
  description: string;      // Description for documentation
  scope: 'global' | string; // Activation scope
  preventDefault?: boolean; // Whether to prevent browser defaults
  route?: string;           // Optional route restriction
  disabled?: boolean;       // Whether the shortcut is disabled
}

export function useGlobalShortcuts(
  shortcuts: ShortcutConfig[] = [],
  dependencies: any[] = []
) {
  // Implementation details...
}
```

The hook internally manages:

1. **Event Registration**: Global keydown event listener
2. **Input Field Detection**: Preventing activation in input fields
3. **Scope Management**: Active scope tracking for component-specific shortcuts
4. **Dynamic Updates**: Shortcut registration/unregistration during runtime

### Table Navigation

Tables have specialized navigation requirements handled by the `useTableKeyboardNavigation` hook in `/src/hooks/useTableKeyboardNavigation.ts`, featuring:

- Arrow key navigation between rows
- Space key for selection
- Enter key for activation
- Home/End keys for jumping to start/end
- Focus management with proper scrolling
- ARIA attributes for accessibility

```typescript
export function useTableKeyboardNavigation<T>(options: TableNavigationOptions<T>) {
  // State for focused index and selection
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        // Move focus down...
        break;
      case 'ArrowUp':
        // Move focus up...
        break;
      // Other key handlers...
    }
  }, [/* dependencies */]);
  
  // Return handlers and props
  return {
    focusedIndex,
    selectedIndexes,
    // Other values and methods...
    getRowProps: (index) => ({
      // ARIA and style props for rows
    }),
    getTableProps: () => ({
      // ARIA and interaction props for the table
    })
  };
}
```

### Integration in the Application Shell

Global shortcuts are integrated at the application shell level in `/src/components/Layout.tsx`:

```typescript
export function Layout({ children }: LayoutProps) {
  // Configure global shortcuts
  const appShortcuts = [
    {
      key: 'g',
      ctrl: true,
      action: () => navigate('/'),
      description: 'Go to dashboard',
      scope: 'global'
    },
    // More shortcuts...
  ];
  
  // Initialize with hook
  const shortcuts = useGlobalShortcuts(appShortcuts, [location.pathname]);
  
  // Render application with shortcuts guide
  return (
    <AppShell>
      {/* App components */}
      <KeyboardShortcutsGuide />
    </AppShell>
  );
}
```

### Shortcuts Documentation UI

The keyboard shortcuts guide component `/src/components/UI/KeyboardShortcutsGuide.tsx` provides:

- Categorized display of all keyboard shortcuts
- Platform-specific key symbols (Mac vs Windows)
- Toggling via the ? key
- Tabbed interface for different shortcut categories
- Visual styling of keyboard keys

## ARIA Compliance and Accessibility

The implementation follows accessibility best practices:

### ARIA Attributes

Tables and lists implement proper ARIA roles and states:

```typescript
// Table ARIA attributes
{
  role: 'grid',
  'aria-rowcount': items.length,
  'aria-colcount': columnCount
}

// Row ARIA attributes
{
  role: 'row',
  'aria-selected': isSelected,
  'aria-rowindex': index + 1
}
```

### Focus Management

Focus is managed using:

1. **Visual Indicators**: Clear focus styles for keyboard navigation
2. **Focus Containment**: Proper focus trapping in modal dialogs
3. **Programmatic Focus**: Moving focus to new content when needed
4. **Scroll Management**: Ensuring focused elements are visible

### Skip Navigation

The application implements skip navigation links for keyboard users to bypass repetitive navigation elements.

## Component Integration Examples

### Example: Data Table Integration

```typescript
function EventTable({ events }: EventTableProps) {
  const {
    focusedIndex,
    handleKeyDown,
    getRowProps,
    getTableProps
  } = useTableKeyboardNavigation({
    items: events,
    onActivate: (event) => navigateToEvent(event.id),
    onToggle: (event, index, selected) => handleRowSelection(event.id, selected)
  });
  
  return (
    <div 
      onKeyDown={handleKeyDown}
      tabIndex={0}
      {...getTableProps()}
    >
      <table>
        <tbody>
          {events.map((event, index) => (
            <tr 
              key={event.id}
              {...getRowProps(index)}
            >
              {/* Row cells */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Example: Modal Dialog Keyboard Handling

```typescript
function ModalDialog({ isOpen, onClose, children }) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  // Focus trap implementation
  const dialogRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      const focusableElements = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      // Set up focus trap logic...
    }
  }, [isOpen]);
  
  return (
    <div ref={dialogRef} role="dialog" aria-modal="true">
      {children}
    </div>
  );
}
```

## Testing Keyboard Navigation

The keyboard navigation system is tested through:

1. **Unit Tests**: Testing individual hooks and their behavior
2. **Integration Tests**: Testing component interactions with keyboard
3. **Accessibility Testing**: Using tools like axe and keyboard-only navigation

Example test:

```typescript
test('arrow keys navigate through table rows', async () => {
  render(<EventTable events={mockEvents} />);
  
  // Focus the table
  const table = screen.getByRole('grid');
  table.focus();
  
  // Press down arrow
  fireEvent.keyDown(table, { key: 'ArrowDown' });
  
  // Check first row is selected
  const firstRow = screen.getByText(mockEvents[0].title).closest('tr');
  expect(firstRow).toHaveAttribute('aria-selected', 'true');
  
  // Press down again
  fireEvent.keyDown(table, { key: 'ArrowDown' });
  
  // Check second row is now selected
  const secondRow = screen.getByText(mockEvents[1].title).closest('tr');
  expect(secondRow).toHaveAttribute('aria-selected', 'true');
});
```

## Performance Considerations

Keyboard event handling is optimized for performance:

1. **Event Delegation**: Using a single listener at high levels
2. **Throttling**: Preventing rapid-fire events
3. **Memoization**: Caching handler functions with useCallback
4. **Clean Listeners**: Properly removing event listeners

## Browser Compatibility

The implementation works across modern browsers:

- **Keyboard Events**: Using standardized KeyboardEvent properties
- **ARIA Support**: Using well-supported ARIA attributes
- **Focus Handling**: Accounting for browser-specific focus behaviors

## Extension Points

The keyboard navigation system is designed for extension:

1. **New Shortcut Registration**: Add to the `globalShortcuts` array
2. **Component-Specific Navigation**: Create specialized hooks
3. **Custom Key Handlers**: Implement for specific interaction patterns

## Troubleshooting

Common issues and solutions:

| Issue | Solution |
|-------|----------|
| Shortcuts not working in specific component | Check the current active scope with `setActiveScope` |
| Conflict with browser shortcuts | Add `preventDefault: true` to the shortcut config |
| Focus getting lost | Ensure proper tabIndex values and focus management |
| Screen reader announces wrong elements | Verify ARIA attributes are correct |

## Best Practices

When extending the keyboard navigation system:

1. **Be Consistent**: Use the same patterns throughout the application
2. **Document Shortcuts**: Add new shortcuts to the guide
3. **Test with Keyboard Only**: Verify navigation without a mouse
4. **Consider Screen Readers**: Test with assistive technologies
5. **Use Standard Keys**: Follow established patterns (arrows for navigation, etc.)

## Conclusion

Keyboard navigation is not just an accessibility feature but a productivity enhancement that benefits all users. The Dexter implementation provides a robust foundation that can be extended as the application grows, ensuring consistent and intuitive keyboard interactions throughout the user experience.