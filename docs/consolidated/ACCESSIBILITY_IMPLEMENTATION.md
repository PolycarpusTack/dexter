# Accessibility Implementation

**Date:** May 15, 2025  
**JIRA Epic:** DEXTER-320 (Accessibility Improvements)

This document outlines the accessibility enhancements implemented as part of the DEXTER-320 epic, detailing the components, utilities, and features added to improve the application's accessibility.

## Overview

The accessibility improvements focus on enhancing the application's usability for all users, including those who rely on assistive technologies. The implementation follows WCAG 2.1 AA guidelines and best practices to ensure that the application is accessible to the widest possible audience.

## Key Components and Utilities

### 1. Screen Reader Announcements (DEXTER-324)

- **announcer.ts**: Singleton service for making screen reader announcements
- **useAnnouncer.ts**: Hook for using the announcer service in components
- Implementation provides:
  - Different politeness levels (polite, assertive)
  - Queue-based announcement system to prevent announcement collisions
  - Specialized announcement types (status, error, navigation, etc.)
  - Visually hidden but screen reader accessible elements

### 2. Guided Tour System (DEXTER-323)

- **GuidedTour.tsx**: Main component for managing step-by-step user guidance
- **TourStep.tsx**: Individual step component with highlighting and tooltips
- **useTour.ts**: Hook for tour state management
- Features include:
  - Persistent tour progress
  - Keyboard navigation between steps
  - Focus management
  - Screen reader announcements
  - Required step enforcement
  - Visual highlighting of UI elements

### 3. Focus Management (DEXTER-321, DEXTER-322)

- **FocusTrap.tsx**: Component for trapping focus within modals and dialogs
- Focus handling features:
  - Retains focus within components for keyboard users
  - Restores focus when components are closed
  - Provides proper focus order
  - Handles modal dialogs appropriately

### 4. ARIA Attributes Utility (DEXTER-321)

- **aria.ts**: Utility functions for generating proper ARIA attributes
- Includes helpers for:
  - Dialogs, menus, and tooltips
  - Tabs and tab panels
  - Live regions
  - Form controls
  - Tables and grids
  - Visually hidden text

### 5. Keyboard Navigation (DEXTER-322)

- **keyboardNavigation.ts**: Utilities for enhanced keyboard interactions
- Features:
  - List, grid, and menu navigation
  - Tab panel navigation
  - Shortcut management
  - Keyboard event handlers

## Implementation Details

### Screen Reader Announcements

The announcement system uses aria-live regions to communicate dynamic changes to screen reader users:

```typescript
// Singleton announcer service
const announcer = new AnnouncerService();

// Create polite announcer
this.politeContainer = document.createElement('div');
this.politeContainer.setAttribute('aria-live', 'polite');
this.politeContainer.setAttribute('aria-atomic', 'true');
this.politeContainer.setAttribute('role', 'status');
```

The system manages a queue of announcements to prevent collisions:

```typescript
// Process the announcement queue
private processQueue(): void {
  if (this.queue.length === 0) {
    this.isProcessing = false;
    return;
  }
  
  this.isProcessing = true;
  const announcement = this.queue.shift();
  
  // ...handle announcement...
  
  // Process next announcement
  window.setTimeout(() => {
    this.processQueue();
  }, 50);
}
```

### Guided Tour System

The tour system provides step-by-step guidance with proper focus management and screen reader support:

```tsx
// TourStep component with ARIA attributes
<Paper
  ref={ref}
  shadow="md"
  p="md"
  radius="md"
  style={getTooltipStyle()}
  aria-live="polite"
  role="dialog"
  aria-modal="true"
  aria-labelledby={`tour-title-${step.id}`}
  aria-describedby={`tour-content-${step.id}`}
>
  // Step content...
</Paper>
```

Tour state management with persistence:

```typescript
// Save progress if persistent
if (config.persistent) {
  setTourStorage(prev => ({
    ...prev,
    tours: {
      ...prev.tours,
      [tour.id]: {
        ...tourData,
        currentStep: nextIndex
      }
    }
  }));
}
```

### Focus Management

Focus trapping is implemented with event listeners for tab key navigation:

```typescript
// Handle tab key to trap focus
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key !== 'Tab') return;
  
  // Get all focusable elements
  const focusableElements = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(el => {
    return el.offsetWidth > 0 && el.offsetHeight > 0;
  });
  
  // Handle tab and shift+tab to cycle through focusable elements
  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
};
```

### ARIA Attributes

The ARIA utilities provide helper functions for generating correct attributes:

```typescript
// Create ARIA props for a dialog
export function getDialogProps(
  id: string,
  titleId: string,
  descriptionId?: string
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': titleId,
  };

  if (descriptionId) {
    props['aria-describedby'] = descriptionId;
  }

  return props;
}
```

### Keyboard Navigation

Enhanced keyboard navigation with focus management:

```typescript
// Handle keyboard navigation in a list
export function handleListKeyNavigation(
  event: React.KeyboardEvent,
  currentIndex: number,
  itemCount: number,
  isHorizontal: boolean = false,
  onSelect: (index: number) => void
): void {
  let newIndex = currentIndex;

  // Vertical navigation (up/down)
  switch (event.key) {
    case Keys.ARROW_UP:
      newIndex = Math.max(0, currentIndex - 1);
      break;
    case Keys.ARROW_DOWN:
      newIndex = Math.min(itemCount - 1, currentIndex + 1);
      break;
    // ... more keys ...
  }

  // Only update if index changed
  if (newIndex !== currentIndex) {
    event.preventDefault();
    onSelect(newIndex);
  }
}
```

## Component Integration

The accessibility features have been integrated into core components:

1. **Modal components**: Now use FocusTrap for keyboard focus management
2. **Dynamic content**: Uses announcer for screen reader notifications
3. **Interactive controls**: Implement proper ARIA attributes and keyboard navigation
4. **Tutorials and onboarding**: Use the guided tour system

## Testing and Validation

The accessibility enhancements have been tested with:

- Keyboard-only navigation
- Screen readers (VoiceOver, NVDA, JAWS)
- Automated accessibility tools
- Contrast checkers
- Browser extensions for accessibility testing

## Compliance with WCAG 2.1 AA

The implementation addresses the following WCAG criteria:

- **1.3.1 Info and Relationships**: Proper semantic structure with ARIA attributes
- **1.3.2 Meaningful Sequence**: Logical reading and navigation order
- **2.1.1 Keyboard**: All functionality available via keyboard
- **2.1.2 No Keyboard Trap**: FocusTrap prevents unwanted keyboard traps
- **2.4.3 Focus Order**: Logical focus order in all interactive components
- **2.4.7 Focus Visible**: Enhanced focus indicators throughout the application
- **3.3.1 Error Identification**: Errors clearly identified and announced
- **4.1.2 Name, Role, Value**: ARIA attributes and proper semantics

## Future Enhancements

While this implementation significantly improves accessibility, future enhancements could include:

1. Automated accessibility testing in CI/CD pipeline
2. More comprehensive color contrast management
3. Advanced screen reader integration for complex data visualizations
4. Keyboard shortcuts customization
5. Accessibility preference settings

## Conclusion

The accessibility enhancements implemented in this phase provide a solid foundation for an accessible application. These features not only improve the experience for users with disabilities but also enhance the overall usability of the application for all users.