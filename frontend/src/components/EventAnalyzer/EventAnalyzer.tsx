import React, { useState, useEffect } from 'react';
import { Button, Group, Menu, ThemeIcon, Text, Alert } from '@mantine/core';
import { IconArrowsMaximize, IconDatabase, IconLock, IconBolt, IconMemory, IconAlertCircle } from '@tabler/icons-react';
import { detectEventType, EventType } from '../../utils/eventTypeDetection';
import DeadlockModal from '../DeadlockDisplay/DeadlockModal';
import N1QueryModal from '../N1QueryModal/N1QueryModal';
import MemoryLeakModal from '../MemoryLeakModal/MemoryLeakModal';

interface EventAnalyzerProps {
  eventId: string;
  eventDetails: any;
}

/**
 * Component that detects event type and provides specialized analyzers
 */
const EventAnalyzer: React.FC<EventAnalyzerProps> = ({ eventId, eventDetails }) => {
  const [eventType, setEventType] = useState<EventType>(EventType.UNKNOWN);
  const [showDeadlockModal, setShowDeadlockModal] = useState(false);
  const [showN1QueryModal, setShowN1QueryModal] = useState(false);
  const [showMemoryLeakModal, setShowMemoryLeakModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (eventDetails) {
      try {
        setEventType(detectEventType(eventDetails));
        setError(null);
      } catch (err) {
        console.error('Error detecting event type:', err);
        setError('Failed to analyze event type');
        setEventType(EventType.UNKNOWN);
      }
    }
  }, [eventDetails]);
  
  // Detect available analyzers for this event
  const hasDeadlockAnalyzer = eventType === EventType.DEADLOCK;
  const hasN1QueryAnalyzer = eventType === EventType.N1_QUERY;
  const hasMemoryLeakAnalyzer = eventType === EventType.MEMORY_LEAK;
  
  // Check if any analyzer is available
  const hasAnalyzers = hasDeadlockAnalyzer || hasN1QueryAnalyzer || hasMemoryLeakAnalyzer;
  
  if (error) {
    return (
      <Alert 
        icon={<IconAlertCircle size={16} />} 
        color="red"
        variant="light"
      >
        {error}
      </Alert>
    );
  }
  
  if (!hasAnalyzers) {
    return null;
  }
  
  // Count available analyzers
  const analyzerCount = [hasDeadlockAnalyzer, hasN1QueryAnalyzer, hasMemoryLeakAnalyzer].filter(Boolean).length;
  const hasMultipleAnalyzers = analyzerCount > 1;
  
  return (
    <>
      {/* Main analyzer button or dropdown if multiple analyzers available */}
      {hasAnalyzers && (
        <>
          {/* Show individual buttons if only one analyzer is available */}
          {hasDeadlockAnalyzer && !hasMultipleAnalyzers && (
            <Button
              leftIcon={<IconLock size={16} />}
              variant="light"
              onClick={() => setShowDeadlockModal(true)}
              color="orange"
              size="xs"
            >
              Analyze Deadlock
            </Button>
          )}
          
          {hasN1QueryAnalyzer && !hasMultipleAnalyzers && (
            <Button
              leftIcon={<IconDatabase size={16} />}
              variant="light"
              onClick={() => setShowN1QueryModal(true)}
              color="blue"
              size="xs"
            >
              Analyze N+1 Query
            </Button>
          )}
          
          {hasMemoryLeakAnalyzer && !hasMultipleAnalyzers && (
            <Button
              leftIcon={<IconMemory size={16} />}
              variant="light"
              onClick={() => setShowMemoryLeakModal(true)}
              color="red"
              size="xs"
            >
              Analyze Memory Leak
            </Button>
          )}
          
          {/* Show dropdown if multiple analyzers are available */}
          {hasMultipleAnalyzers && (
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Button
                  leftIcon={<IconArrowsMaximize size={16} />}
                  variant="light"
                  color="gray"
                  size="xs"
                >
                  Analyze Issue
                </Button>
              </Menu.Target>
              
              <Menu.Dropdown>
                <Menu.Label>Available Analyzers</Menu.Label>
                
                {hasDeadlockAnalyzer && (
                  <Menu.Item 
                    icon={<IconLock size={14} />}
                    onClick={() => setShowDeadlockModal(true)}
                  >
                    Analyze Deadlock
                  </Menu.Item>
                )}
                
                {hasN1QueryAnalyzer && (
                  <Menu.Item 
                    icon={<IconDatabase size={14} />}
                    onClick={() => setShowN1QueryModal(true)}
                  >
                    Analyze N+1 Query
                  </Menu.Item>
                )}
                
                {hasMemoryLeakAnalyzer && (
                  <Menu.Item 
                    icon={<IconMemory size={14} />}
                    onClick={() => setShowMemoryLeakModal(true)}
                  >
                    Analyze Memory Leak
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          )}
        </>
      )}
      
      {/* Analyzer modals */}
      {hasDeadlockAnalyzer && (
        <DeadlockModal
          eventId={eventId}
          eventDetails={eventDetails}
          isOpen={showDeadlockModal}
          onClose={() => setShowDeadlockModal(false)}
        />
      )}
      
      {hasN1QueryAnalyzer && (
        <N1QueryModal
          eventId={eventId}
          eventDetails={eventDetails}
          isOpen={showN1QueryModal}
          onClose={() => setShowN1QueryModal(false)}
        />
      )}
      
      {hasMemoryLeakAnalyzer && (
        <MemoryLeakModal
          eventId={eventId}
          eventDetails={eventDetails}
          isOpen={showMemoryLeakModal}
          onClose={() => setShowMemoryLeakModal(false)}
        />
      )}
    </>
  );
};

export default EventAnalyzer;