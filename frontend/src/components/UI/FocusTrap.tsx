import React, { useEffect, useRef } from 'react';

interface FocusTrapProps {
  /**
   * Whether the focus trap is active
   */
  active?: boolean;
  
  /**
   * Children to render
   */
  children: React.ReactNode;
  
  /**
   * Element to focus initially when trap is activated
   */
  initialFocus?: React.RefObject<HTMLElement>;
  
  /**
   * Element to focus when trap is deactivated
   */
  returnFocus?: React.RefObject<HTMLElement>;
  
  /**
   * Whether to restore focus when trap is deactivated
   */
  restoreFocus?: boolean;
  
  /**
   * Additional class names
   */
  className?: string;
  
  /**
   * Style properties
   */
  style?: React.CSSProperties;
}

/**
 * A component that traps focus within its children for improved keyboard accessibility
 */
const FocusTrap: React.FC<FocusTrapProps> = ({
  active = true,
  children,
  initialFocus,
  returnFocus,
  restoreFocus = true,
  className,
  style
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  
  // Save previously focused element when trap is activated
  useEffect(() => {
    if (active) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
    }
  }, [active]);
  
  // Handle initial focus when trap is activated
  useEffect(() => {
    if (!active) return;
    
    const focusElement = () => {
      // Focus the initial element if provided
      if (initialFocus && initialFocus.current) {
        initialFocus.current.focus();
        return;
      }
      
      // Otherwise focus the first focusable element in the container
      if (containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          // If no focusable elements, focus the container itself
          containerRef.current.setAttribute('tabindex', '-1');
          containerRef.current.focus();
        }
      }
    };
    
    // Delay focus to ensure DOM is ready
    setTimeout(focusElement, 50);
  }, [active, initialFocus]);
  
  // Restore focus when trap is deactivated
  useEffect(() => {
    return () => {
      if (active && restoreFocus) {
        const elementToFocus = returnFocus?.current || previouslyFocusedElement.current;
        
        if (elementToFocus) {
          setTimeout(() => {
            elementToFocus.focus();
          }, 0);
        }
      }
    };
  }, [active, restoreFocus, returnFocus]);
  
  // Handle tab key to trap focus
  useEffect(() => {
    if (!active || !containerRef.current) return;
    
    const container = containerRef.current;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      
      // Get all focusable elements in the container
      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => {
        // Filter out hidden elements
        return el.offsetWidth > 0 && el.offsetHeight > 0;
      });
      
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      // Handle tab and shift+tab to cycle through focusable elements
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);
  
  return (
    <div ref={containerRef} className={className} style={style}>
      {children}
    </div>
  );
};

export default FocusTrap;