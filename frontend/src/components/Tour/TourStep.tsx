import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  Paper, 
  Text, 
  Button, 
  Group, 
  Tooltip, 
  Progress, 
  Stack,
  useMantineTheme
} from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { 
  IconArrowRight, 
  IconArrowLeft, 
  IconX, 
  IconInfoCircle
} from '@tabler/icons-react';
import useAnnouncer from '../../hooks/useAnnouncer';
import type { TourStep as TourStepType } from '../../hooks/useTour';

interface TourStepProps {
  /**
   * Step data for current tour step
   */
  step: TourStepType;
  
  /**
   * Current step index (0-based)
   */
  currentIndex: number;
  
  /**
   * Total number of steps
   */
  totalSteps: number;
  
  /**
   * Whether this is the first step in the tour
   */
  isFirstStep: boolean;
  
  /**
   * Whether this is the last step in the tour
   */
  isLastStep: boolean;
  
  /**
   * Handler for next step button
   */
  onNext: () => void;
  
  /**
   * Handler for previous step button
   */
  onPrev: () => void;
  
  /**
   * Handler for close button
   */
  onClose: () => void;
  
  /**
   * Optional custom render function for tooltip content
   */
  renderContent?: (step: TourStepType) => React.ReactNode;
  
  /**
   * Z-index for the tour elements
   */
  zIndex?: number;
  
  /**
   * Delay before showing the tooltip in ms
   */
  showDelay?: number;
}

/**
 * A step in a guided tour with highlighted target and explanatory tooltip
 */
const TourStep: React.FC<TourStepProps> = ({
  step,
  currentIndex,
  totalSteps,
  isFirstStep,
  isLastStep,
  onNext,
  onPrev,
  onClose,
  renderContent,
  zIndex = 1000,
  showDelay = 100
}) => {
  const theme = useMantineTheme();
  const { announceStatus } = useAnnouncer();
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [position, setPosition] = useState<'top' | 'right' | 'bottom' | 'left'>(
    step.position as any || 'bottom'
  );
  const { ref, width, height } = useElementSize();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  // Find target element based on selector
  useEffect(() => {
    const findTarget = () => {
      if (step.selector) {
        try {
          const element = document.querySelector(step.selector) as HTMLElement;
          if (element) {
            setTargetElement(element);
            const rect = element.getBoundingClientRect();
            setTargetRect(rect);
          } else {
            console.warn(`Tour target not found: ${step.selector}`);
          }
        } catch (error) {
          console.error(`Error finding tour target: ${error}`);
        }
      } else if (step.position === 'center') {
        // Center in viewport if no selector
        setTargetElement(null);
        setTargetRect(null);
      }
    };
    
    // Delay finding target to ensure DOM is ready
    const timer = setTimeout(() => {
      findTarget();
      setIsVisible(true);
      
      // Announce step to screen readers
      announceStatus(`Tour step ${currentIndex + 1} of ${totalSteps}: ${step.title}`);
    }, showDelay);
    
    return () => clearTimeout(timer);
  }, [step, announceStatus, currentIndex, totalSteps, showDelay]);
  
  // Determine the best position for the tooltip
  useEffect(() => {
    if (!targetRect || !width || !height || step.position === 'center') return;
    
    // Use specified position as default
    let bestPosition = step.position || 'bottom';
    
    // Auto determine if not specified or 'auto'
    if (!step.position || step.position === 'auto') {
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      
      // Check if there's enough space below
      const hasSpaceBelow = targetRect.bottom + height + 20 < windowHeight;
      // Check if there's enough space above
      const hasSpaceAbove = targetRect.top - height - 20 > 0;
      // Check if there's enough space to the right
      const hasSpaceRight = targetRect.right + width + 20 < windowWidth;
      // Check if there's enough space to the left
      const hasSpaceLeft = targetRect.left - width - 20 > 0;
      
      // Determine best position
      if (hasSpaceBelow) {
        bestPosition = 'bottom';
      } else if (hasSpaceRight) {
        bestPosition = 'right';
      } else if (hasSpaceLeft) {
        bestPosition = 'left';
      } else if (hasSpaceAbove) {
        bestPosition = 'top';
      } else {
        // Default to bottom if no good position
        bestPosition = 'bottom';
      }
    }
    
    setPosition(bestPosition as any);
  }, [targetRect, width, height, step.position]);
  
  // Calculate tooltip position based on target and position
  const getTooltipStyle = useCallback((): React.CSSProperties => {
    if (!targetRect) {
      // Center in viewport if no target
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex,
        maxWidth: '350px',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out'
      };
    }
    
    // Position tooltip based on target and selected position
    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex,
      maxWidth: '350px',
      opacity: isVisible ? 1 : 0,
      transition: 'opacity 0.2s ease-in-out'
    };
    
    const margin = 12; // Margin between target and tooltip
    
    switch (position) {
      case 'top':
        style.bottom = window.innerHeight - targetRect.top + margin;
        style.left = targetRect.left + targetRect.width / 2;
        style.transform = 'translateX(-50%)';
        break;
      case 'right':
        style.left = targetRect.right + margin;
        style.top = targetRect.top + targetRect.height / 2;
        style.transform = 'translateY(-50%)';
        break;
      case 'bottom':
        style.top = targetRect.bottom + margin;
        style.left = targetRect.left + targetRect.width / 2;
        style.transform = 'translateX(-50%)';
        break;
      case 'left':
        style.right = window.innerWidth - targetRect.left + margin;
        style.top = targetRect.top + targetRect.height / 2;
        style.transform = 'translateY(-50%)';
        break;
      default:
        // Default to bottom
        style.top = targetRect.bottom + margin;
        style.left = targetRect.left + targetRect.width / 2;
        style.transform = 'translateX(-50%)';
    }
    
    return style;
  }, [targetRect, position, zIndex, isVisible]);
  
  // Calculate highlight overlay position and size
  const getHighlightStyle = useCallback((): React.CSSProperties => {
    if (!targetRect) return { display: 'none' };
    
    return {
      position: 'fixed',
      top: targetRect.top - 5,
      left: targetRect.left - 5,
      width: targetRect.width + 10,
      height: targetRect.height + 10,
      borderRadius: '4px',
      boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.5)`,
      zIndex: zIndex - 1,
      pointerEvents: 'none',
      border: `2px solid ${theme.colors.blue[6]}`,
      boxSizing: 'content-box',
      opacity: isVisible ? 1 : 0,
      transition: 'opacity 0.2s ease-in-out'
    };
  }, [targetRect, theme.colors.blue, zIndex, isVisible]);
  
  // Get arrow style based on position
  const getArrowStyle = useCallback((): React.CSSProperties => {
    if (!targetRect || step.position === 'center') return { display: 'none' };
    
    const style: React.CSSProperties = {
      position: 'absolute',
      width: '10px',
      height: '10px',
      background: theme.colorScheme === 'dark' ? theme.colors.dark[7] : 'white',
      transform: 'rotate(45deg)',
      border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
      zIndex: -1
    };
    
    switch (position) {
      case 'top':
        style.bottom = '-5px';
        style.left = 'calc(50% - 5px)';
        style.borderTop = 'none';
        style.borderLeft = 'none';
        break;
      case 'right':
        style.left = '-5px';
        style.top = 'calc(50% - 5px)';
        style.borderRight = 'none';
        style.borderTop = 'none';
        break;
      case 'bottom':
        style.top = '-5px';
        style.left = 'calc(50% - 5px)';
        style.borderBottom = 'none';
        style.borderRight = 'none';
        break;
      case 'left':
        style.right = '-5px';
        style.top = 'calc(50% - 5px)';
        style.borderLeft = 'none';
        style.borderBottom = 'none';
        break;
      default:
        style.display = 'none';
    }
    
    return style;
  }, [position, targetRect, theme.colorScheme, theme.colors, step.position]);
  
  return (
    <>
      {/* Highlighted area */}
      {targetRect && (
        <div style={getHighlightStyle()} aria-hidden="true" />
      )}
      
      {/* Tooltip */}
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
        {/* Arrow */}
        <div style={getArrowStyle()} aria-hidden="true" />
        
        {/* Header */}
        <Group position="apart" mb="xs">
          <Text id={`tour-title-${step.id}`} fw={600} size="sm">{step.title}</Text>
          <Tooltip label="Close tour" withinPortal>
            <Button 
              variant="subtle" 
              size="xs" 
              p={0} 
              style={{ width: 24, height: 24, minWidth: 24, minHeight: 24 }}
              onClick={onClose}
              aria-label="Close tour"
            >
              <IconX size={18} />
            </Button>
          </Tooltip>
        </Group>
        
        {/* Progress */}
        <Progress 
          value={(currentIndex / (totalSteps - 1)) * 100} 
          size="xs" 
          mb="xs"
          aria-label={`Step ${currentIndex + 1} of ${totalSteps}`}
        />
        
        {/* Content */}
        <Stack spacing="xs" mb="md">
          {renderContent ? (
            renderContent(step)
          ) : (
            <Text id={`tour-content-${step.id}`} size="sm">{step.content}</Text>
          )}
        </Stack>
        
        {/* Footer */}
        <Group position="apart">
          <Group spacing="xs">
            <Text size="xs" color="dimmed">
              {currentIndex + 1} of {totalSteps}
            </Text>
            {step.required && (
              <Tooltip 
                label="This step is required to continue" 
                position="bottom"
                withinPortal
              >
                <Text size="xs" color="blue" style={{ display: 'flex', alignItems: 'center' }}>
                  <IconInfoCircle size={14} style={{ marginRight: 4 }} />
                  Required
                </Text>
              </Tooltip>
            )}
          </Group>
          
          <Group spacing="xs">
            <Button
              variant="outline"
              size="xs"
              leftIcon={<IconArrowLeft size={16} />}
              onClick={onPrev}
              disabled={isFirstStep}
              aria-label="Previous step"
            >
              Back
            </Button>
            
            <Button
              variant="filled"
              size="xs"
              rightIcon={<IconArrowRight size={16} />}
              onClick={onNext}
              aria-label={isLastStep ? "Finish tour" : "Next step"}
            >
              {isLastStep ? "Finish" : "Next"}
            </Button>
          </Group>
        </Group>
      </Paper>
    </>
  );
};

export default TourStep;