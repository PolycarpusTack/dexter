// File: frontend/src/components/EventDetail/EnhancedEventDetail.jsx

import React, { useRef, forwardRef, useImperativeHandle } from "react";
import {
  Loader,
  Alert,
  Center,
  Text,
  Accordion,
  Space,
  Stack,
  ScrollArea,
  Box,
  useMantineTheme,
} from "@mantine/core";
import { IconAlertCircle, IconBug } from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAppStore from "../../store/appStore";
import { getEventDetails, getLatestEventForIssue, updateIssueStatus } from "../../api/eventsApi";
import ExplainError from "../ExplainError/ExplainError";
import EnhancedDeadlockDisplay from "../DeadlockDisplay/EnhancedDeadlockDisplay";
import EmptyState from "../UI/EmptyState";
import LoadingSkeleton from "../UI/LoadingSkeleton";
import { ErrorBoundary } from "../ErrorHandling";
import ErrorFallback from "../ErrorHandling/ErrorFallback";
import { showSuccessNotification, showErrorNotification } from "../../utils/errorHandling";
import {
  isDeadlockError,
  extractRequestData,
  extractReleaseInfo,
  extractRelatedEvents,
} from "../../utils/sentryDataExtractors";

/**
 * Enhanced version of the EventDetail component with additional features
 * Provides detailed information about a selected Sentry event
 */
const EnhancedEventDetail = forwardRef(({ eventId: propEventId, issueId: propIssueId, onStatusChange }, ref) => {
  const theme = useMantineTheme();
  const queryClient = useQueryClient();
  const scrollAreaRef = useRef(null);
  
  // Get selected event/issue from store
  const { 
    selectedEventId: storeEventId, 
    selectedIssueId: storeIssueId,
    activeOllamaModel
  } = useAppStore(state => ({
    selectedEventId: state.selectedEventId,
    selectedIssueId: state.selectedIssueId,
    activeOllamaModel: state.activeAIModel
  }));
  
  // Use prop values if provided, otherwise use store values
  const effectiveEventId = propEventId || storeEventId;
  const effectiveIssueId = propIssueId || storeIssueId;
  
  console.log("EventDetail rendering with:", {
    propEventId,
    propIssueId,
    storeEventId,
    storeIssueId,
    effectiveEventId,
    effectiveIssueId
  });
  
  useImperativeHandle(ref, () => ({
    scrollTo: (options) => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo(options);
      }
    },
  }));

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["eventDetail", effectiveEventId, effectiveIssueId],
    queryFn: () => {
      console.log("Fetching event details for:", { effectiveEventId, effectiveIssueId });
      return effectiveEventId 
        ? getEventDetails(effectiveEventId) 
        : effectiveIssueId 
          ? getLatestEventForIssue(effectiveIssueId) 
          : Promise.reject(new Error("Either eventId or issueId must be provided"));
    },
    enabled: !!effectiveEventId || !!effectiveIssueId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: updateIssueStatus,
    onSuccess: (data) => {
      queryClient.invalidateQueries(["issues"]);
      if (onStatusChange) {
        onStatusChange(data);
      }
      showSuccessNotification("Issue status updated successfully");
    },
    onError: (error) => {
      showErrorNotification("Failed to update issue status", error);
    },
  });

  if (isLoading) {
    return (
      <Box p="md">
        <LoadingSkeleton />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        icon={<IconAlertCircle size={16} />} 
        title="Error loading event details" 
        color="red"
        mt="md"
      >
        {error.message || "Failed to load event details. Please try again."}
      </Alert>
    );
  }

  if (!event) {
    return (
      <EmptyState
        icon={<IconBug size={48} />}
        title="No event selected"
        message={effectiveEventId || effectiveIssueId ? 
          "Could not load event details. Check console for errors." :
          "Select an event from the list to view details"
        }
      />
    );
  }

  const isDeadlock = isDeadlockError(event);
  const requestData = extractRequestData(event);
  const releaseInfo = extractReleaseInfo(event);
  const relatedEvents = extractRelatedEvents(event);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ScrollArea h="calc(100vh - 180px)" ref={scrollAreaRef}>
        <Box p="md">
          <Stack>
            {/* Event Summary */}
            <Text size="xl" weight={600}>{event.title || event.message || "Event Details"}</Text>
            
            {/* Deadlock Display */}
            {isDeadlock && (
              <>
                <EnhancedDeadlockDisplay event={event} />
                <Space h="md" />
              </>
            )}
            
            {/* AI Error Explanation */}
            <ExplainError 
              event={event} 
              model={activeOllamaModel} 
            />
            
            {/* Event Details Accordion */}
            <Accordion defaultValue="stack" mt="md">
              <Accordion.Item value="stack">
                <Accordion.Control>Stack Trace</Accordion.Control>
                <Accordion.Panel>
                  <pre style={{ 
                    whiteSpace: "pre-wrap", 
                    fontSize: theme.fontSizes.xs,
                    backgroundColor: theme.colorScheme === 'dark' 
                      ? theme.colors.dark[7] 
                      : theme.colors.gray[0],
                    padding: theme.spacing.xs,
                    borderRadius: theme.radius.sm
                  }}>
                    {event.stacktrace || "No stack trace available"}
                  </pre>
                </Accordion.Panel>
              </Accordion.Item>
              
              <Accordion.Item value="context">
                <Accordion.Control>Context Data</Accordion.Control>
                <Accordion.Panel>
                  <pre style={{ 
                    whiteSpace: "pre-wrap", 
                    fontSize: theme.fontSizes.xs,
                    backgroundColor: theme.colorScheme === 'dark' 
                      ? theme.colors.dark[7] 
                      : theme.colors.gray[0],
                    padding: theme.spacing.xs,
                    borderRadius: theme.radius.sm
                  }}>
                    {JSON.stringify(event.context || {}, null, 2)}
                  </pre>
                </Accordion.Panel>
              </Accordion.Item>
              
              {requestData && (
                <Accordion.Item value="request">
                  <Accordion.Control>Request Details</Accordion.Control>
                  <Accordion.Panel>
                    <pre style={{ 
                      whiteSpace: "pre-wrap", 
                      fontSize: theme.fontSizes.xs,
                      backgroundColor: theme.colorScheme === 'dark' 
                        ? theme.colors.dark[7] 
                        : theme.colors.gray[0],
                      padding: theme.spacing.xs,
                      borderRadius: theme.radius.sm
                    }}>
                      {JSON.stringify(requestData, null, 2)}
                    </pre>
                  </Accordion.Panel>
                </Accordion.Item>
              )}
              
              {releaseInfo && (
                <Accordion.Item value="release">
                  <Accordion.Control>Release Information</Accordion.Control>
                  <Accordion.Panel>
                    <pre style={{ 
                      whiteSpace: "pre-wrap", 
                      fontSize: theme.fontSizes.xs,
                      backgroundColor: theme.colorScheme === 'dark' 
                        ? theme.colors.dark[7] 
                        : theme.colors.gray[0],
                      padding: theme.spacing.xs,
                      borderRadius: theme.radius.sm
                    }}>
                      {JSON.stringify(releaseInfo, null, 2)}
                    </pre>
                  </Accordion.Panel>
                </Accordion.Item>
              )}
              
              {relatedEvents?.length > 0 && (
                <Accordion.Item value="related">
                  <Accordion.Control>Related Events</Accordion.Control>
                  <Accordion.Panel>
                    <pre style={{ 
                      whiteSpace: "pre-wrap", 
                      fontSize: theme.fontSizes.xs,
                      backgroundColor: theme.colorScheme === 'dark' 
                        ? theme.colors.dark[7] 
                        : theme.colors.gray[0],
                      padding: theme.spacing.xs,
                      borderRadius: theme.radius.sm
                    }}>
                      {JSON.stringify(relatedEvents, null, 2)}
                    </pre>
                  </Accordion.Panel>
                </Accordion.Item>
              )}
            </Accordion>
          </Stack>
        </Box>
      </ScrollArea>
    </ErrorBoundary>
  );
});

EnhancedEventDetail.displayName = "EnhancedEventDetail";

export default EnhancedEventDetail;
