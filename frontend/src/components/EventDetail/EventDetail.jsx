// File: frontend/src/components/EventDetail/EventDetail.jsx

import React from "react";
import {
  Loader,
  Alert,
  Paper,
  Center,
  Text,
  Accordion,
  Space,
  Group,
  Button,
  Badge,
  Anchor,
  Stack,
  ScrollArea,
  Box,
  Divider,
  Tooltip,
  ThemeIcon,
  useMantineTheme,
  Code,
  Grid
} from "@mantine/core";
import { 
  IconAlertCircle,
  IconBug,
  IconExternalLink,
  IconCheck,
  IconBan,
  IconArrowRight,
  IconUser,
  IconBrowser,
  IconDeviceDesktop,
  IconServer,
  IconStack,
  IconHistory,
  IconFileCode,
  IconInfoCircle,
  IconClipboardCheck,
  IconRefresh
} from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from 'date-fns';
import useAppStore from "../../store/appStore";
import { getEventDetails, getLatestEventForIssue, updateIssueStatus } from "../../api/eventsApi";
import ExplainError from "../ExplainError/ExplainError";
import { SENTRY_WEB_URL } from "../../api/config";
import EmptyState from "../UI/EmptyState";
import LoadingSkeleton from "../UI/LoadingSkeleton";
import AccessibleIcon from "../UI/AccessibleIcon";
import AIModelSettings from "../Settings/AIModelSettings";
import { showSuccessNotification, showErrorNotification } from "../../utils/errorHandling";

/**
 * EventDetail component displays detailed information about a selected Sentry event
 */
function EventDetail() {
  const theme = useMantineTheme();
  const { 
    selectedIssueId,
    selectedEventId,
    organizationSlug,
    projectSlug,
    storeLatestEventId,
    setSelectedIssue
  } = useAppStore();

  const queryClient = useQueryClient();
  
  // Fetch latest event if none is selected
  const getLatestEventForIssueQuery = useQuery({
    queryKey: ["latestEventForIssue", { organizationSlug, projectSlug, issueId: selectedIssueId }],
    queryFn: async () => {
      const eventData = await getLatestEventForIssue({ 
        organizationSlug, 
        projectSlug, 
        issueId: selectedIssueId 
      });
      
      if (eventData?.id) {
        storeLatestEventId(selectedIssueId, eventData.id);
        setSelectedIssue(selectedIssueId, eventData.id);
        return eventData;
      }
      throw new Error('No event ID found in latest event response');
    },
    enabled: !!selectedIssueId && !!organizationSlug && !!projectSlug && !selectedEventId,
    retry: 1,
  });

  // Fetch event details when event ID is available
  const eventDetailQuery = useQuery({
    queryKey: ["eventDetails", { organizationSlug, projectSlug, eventId: selectedEventId }],
    queryFn: async () => {
      try {
        return await getEventDetails({ 
          organizationSlug, 
          projectSlug, 
          eventId: selectedEventId 
        });
      } catch (error) {
        console.error("Error fetching event details in query:", error);
        
        // If we can't get event details, try to get the issue details as a fallback
        if (selectedIssueId) {
          console.log("Falling back to issue details");
          return await getLatestEventForIssue({
            organizationSlug,
            projectSlug,
            issueId: selectedIssueId
          });
        }
        
        throw error;
      }
    },
    enabled: !!selectedEventId && !!organizationSlug && !!projectSlug,
    retry: 1
  });

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: updateIssueStatus,
    onSuccess: (updatedIssueData) => {
      showSuccessNotification({
        title: "Status Updated",
        message: `Issue ${updatedIssueData.shortId || selectedIssueId} set to ${updatedIssueData.status}`
      });
      queryClient.invalidateQueries(["issuesList"]);
    },
    onError: (error) => {
      showErrorNotification({
        title: "Status Update Failed",
        error,
      });
    },
  });

  // Handle resolve/ignore actions
  const handleResolve = () => selectedIssueId && statusMutation.mutate({
    issueId: selectedIssueId,
    statusUpdatePayload: { status: "resolved" }
  });
  
  const handleIgnore = () => selectedIssueId && statusMutation.mutate({
    issueId: selectedIssueId,
    statusUpdatePayload: { status: "ignored" }
  });

  // Render helpers
  const renderContext = (context) => Object.entries(context || {}).map(([key, value]) => (
    <Box key={key} mb="xs">
      <Group gap={4} mb={2}>
        <Text size="sm" fw={600}>{key}:</Text>
        {typeof value === 'object' && (
          <Tooltip label="Object value">
            <ThemeIcon size="xs" variant="light" color="blue" radius="xl">
              <IconInfoCircle size={10} />
            </ThemeIcon>
          </Tooltip>
        )}
      </Group>
      <Code block sx={{ fontSize: '0.85rem', width: '100%' }}>
        {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
      </Code>
    </Box>
  ));

  const renderStackFrame = (frame, index, totalFrames) => {
    const { filename, function: funcName, lineno, colno, context, inApp } = frame || {};
    const isRelevant = inApp || index === 0 || index === totalFrames - 1;
    
    return (
      <Box 
        key={index} 
        p="xs"
        sx={theme => ({
          backgroundColor: inApp ? theme.colors.blue[0] : 'transparent',
          borderLeft: inApp ? `3px solid ${theme.colors.blue[4]}` : 'none',
        })}
      >
        <Group gap="xs" noWrap mb={4}>
          {inApp && <Badge size="xs" color="blue">App</Badge>}
          <Text fw={isRelevant ? 600 : 400} c={isRelevant ? undefined : 'dimmed'} truncate>
            {funcName || '<anonymous>'}
          </Text>
        </Group>
        
        <Text size="xs" c="dimmed" truncate>
          {filename} {lineno && `:${lineno}${colno ? `:${colno}` : ''}`}
        </Text>
        
        {context && (
          <Code block mt="xs" sx={{ fontSize: '0.75rem', maxHeight: 150 }}>
            {Object.entries(context).map(([lineNo, code]) => (
              <Box 
                key={lineNo} 
                sx={{ 
                  color: lineNo === String(lineno) ? theme.colors.red[7] : 'inherit',
                  backgroundColor: lineNo === String(lineno) ? theme.colors.red[0] : 'transparent',
                }}
              >
                {lineNo}: {code}
              </Box>
            ))}
          </Code>
        )}
      </Box>
    );
  };

  // Component states
  if (!selectedIssueId) {
    return (
      <EmptyState
        icon={<IconBug size={48} />}
        title="No Issue Selected"
        message="Select an issue from the list to view its details."
      />
    );
  }

  if (getLatestEventForIssueQuery.isLoading) {
    return (
      <Center p="xl">
        <Stack align="center">
          <Loader size="md" />
          <Text size="sm">Finding latest event...</Text>
        </Stack>
      </Center>
    );
  }

  if (eventDetailQuery.isLoading) {
    return <LoadingSkeleton type="detail" />;
  }

  if (eventDetailQuery.isError || getLatestEventForIssueQuery.isError) {
    return (
      <Alert icon={<IconAlertCircle />} title="Error Loading Details" color="red">
        <Stack gap="xs">
          <Text size="sm">
            {eventDetailQuery.error?.message || getLatestEventForIssueQuery.error?.message}
          </Text>
          <Group>
            <Button 
              variant="light" 
              color="red" 
              size="xs"
              onClick={() => {
                queryClient.invalidateQueries(["issuesList"]);
                getLatestEventForIssueQuery.refetch();
                eventDetailQuery.refetch();
              }}
            >
              Retry
            </Button>
            <Anchor
              href={`${SENTRY_WEB_URL}/organizations/${organizationSlug}/issues/${selectedIssueId}/`}
              target="_blank"
              size="xs"
            >
              View in Sentry
            </Anchor>
          </Group>
        </Stack>
      </Alert>
    );
  }

  const eventDetails = eventDetailQuery.data;
  if (!eventDetails) {
    return (
      <Alert icon={<IconAlertCircle />} title="No Data Available" color="yellow">
        No event details found for the selected event.
      </Alert>
    );
  }

  // Check if this is fallback data and what type
  const isFallbackData = eventDetails._fallback === true;
  const isMinimalFallback = eventDetails._minimal === true;

  // Destructure event data with fallbacks
  const {
    title = "Unknown Error",
    level = "error",
    message,
    tags = [],
    timestamp,
    user = {},
    contexts = {},
    entries = [],
    platform = "Unknown",
    eventID,
    issueId,
    count,
    userCount,
    firstSeen
  } = eventDetails;

  // Formatting helpers
  const formattedDate = timestamp 
    ? format(new Date(timestamp), 'PPp')
    : 'Unknown time';
  
  const formattedFirstSeen = firstSeen
    ? format(new Date(firstSeen), 'PPp')
    : 'Unknown';
  
  const sentryLinks = {
    event: `${SENTRY_WEB_URL}/organizations/${organizationSlug}/issues/${issueId}/events/${eventID}/`,
    issue: `${SENTRY_WEB_URL}/organizations/${organizationSlug}/issues/${issueId}/`
  };

  return (
    <ScrollArea style={{ height: '100vh' }}>
      <Box p="md">
        {/* Header Section */}
        <Paper p="md" radius="md" mb="md" withBorder>
          <Stack gap="xs">
            {isFallbackData && (
              <Alert 
                color={isMinimalFallback ? "red" : "yellow"} 
                title={isMinimalFallback ? "Error Retrieving Data" : "Limited Data Available"} 
                mb="xs"
              >
                <Stack gap="xs">
                  <Text size="sm">
                    {isMinimalFallback 
                      ? "Unable to retrieve event details from Sentry. This view shows minimal placeholder data."
                      : "This view shows basic information extracted from the issue data. Some details may be limited or unavailable."
                    }
                    {eventDetails._error && ` Error: ${eventDetails._error}`}
                  </Text>
                  <Group>
                    <Button
                      leftSection={<IconRefresh size={16} />}
                      size="xs"
                      variant="light"
                      onClick={() => {
                        // Invalidate both queries to force a fresh fetch
                        queryClient.invalidateQueries(["eventDetails"]);
                        queryClient.invalidateQueries(["latestEventForIssue"]);
                        // Explicitly refetch the current query
                        eventDetailQuery.refetch();
                      }}
                    >
                      Try Again
                    </Button>
                  </Group>
                </Stack>
              </Alert>
            )}
            <Group justify="space-between">
              <Group gap="xs">
                <ThemeIcon color={level} size="lg" radius="md">
                  <IconBug size={18} />
                </ThemeIcon>
                <Text fw={700} size="lg" lineClamp={2}>{title}</Text>
              </Group>
              <Badge color={level} size="lg">{level}</Badge>
            </Group>

            <Group gap="lg">
              <Group gap={4}>
                <IconFileCode size={14} />
                <Text size="sm" c="dimmed">{platform}</Text>
              </Group>
              <Group gap={4}>
                <IconAlertCircle size={14} />
                <Text size="sm" c="dimmed">{formattedDate}</Text>
              </Group>
              {count && (
                <Group gap={4}>
                  <IconHistory size={14} />
                  <Text size="sm" c="dimmed">{count} occurrences</Text>
                </Group>
              )}
              {userCount && (
                <Group gap={4}>
                  <IconUser size={14} />
                  <Text size="sm" c="dimmed">{userCount} users affected</Text>
                </Group>
              )}
            </Group>

            <Group gap="xs">
              <Anchor href={sentryLinks.issue} target="_blank" size="sm">
                <Group gap={4}>
                  <Text>Issue</Text>
                  <IconExternalLink size={14} />
                </Group>
              </Anchor>
              <Anchor href={sentryLinks.event} target="_blank" size="sm">
                <Group gap={4}>
                  <Text>Event</Text>
                  <IconExternalLink size={14} />
                </Group>
              </Anchor>
            </Group>
          </Stack>
        </Paper>

        {/* Quick Actions and Model Settings */}
        <Grid mb="md" gutter="md">
          <Grid.Col span={8}>
            <Group>
              <Button
                leftSection={<IconCheck size={16} />}
                onClick={handleResolve}
                loading={statusMutation.isLoading}
                color="teal"
              >
                Resolve
              </Button>
              <Button
                leftSection={<IconBan size={16} />}
                onClick={handleIgnore}
                loading={statusMutation.isLoading}
                variant="outline"
              >
                Ignore
              </Button>
            </Group>
          </Grid.Col>
          <Grid.Col span={4}>
            <AIModelSettings />
          </Grid.Col>
        </Grid>

        {/* AI Explanation */}
        <ExplainError eventDetails={eventDetails} />
        <Space h="md" />

        {/* Error Message */}
        {message && (
          <Paper p="md" withBorder mb="md">
            <Text fw={600} mb="xs">Error Message</Text>
            <Code block sx={{ whiteSpace: 'pre-wrap' }}>{message}</Code>
          </Paper>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <Paper p="md" withBorder mb="md">
            <Text fw={600} mb="xs">Tags</Text>
            <Group gap="xs">
              {tags.map((tag, index) => (
                <Badge key={index} variant="outline" color="gray">
                  {tag.key}: {tag.value}
                </Badge>
              ))}
            </Group>
          </Paper>
        )}

        {/* Event Statistics (especially useful for fallback data) */}
        {(firstSeen || count || userCount) && (
          <Paper p="md" withBorder mb="md">
            <Text fw={600} mb="xs">Event Statistics</Text>
            <Group gap="lg">
              {firstSeen && (
                <Group gap={4}>
                  <Text fw={500} size="sm">First Seen:</Text>
                  <Text size="sm" c="dimmed">{formattedFirstSeen}</Text>
                </Group>
              )}
              {count && (
                <Group gap={4}>
                  <Text fw={500} size="sm">Occurrences:</Text>
                  <Text size="sm" c="dimmed">{count}</Text>
                </Group>
              )}
              {userCount && (
                <Group gap={4}>
                  <Text fw={500} size="sm">Users Affected:</Text>
                  <Text size="sm" c="dimmed">{userCount}</Text>
                </Group>
              )}
            </Group>
          </Paper>
        )}

        {/* Detailed Sections */}
        <Accordion multiple defaultValue={['stacktrace']} chevronPosition="left">
          {/* Stack Trace */}
          {entries.some(e => e.type === "exception") && (
            <Accordion.Item value="stacktrace">
              <Accordion.Control icon={<IconStack color={theme.colors.red[6]} />}>
                <Text fw={600}>Stack Trace</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  {entries
                    .filter(e => e.type === "exception")
                    .flatMap(e => e.data.values)
                    .map((exception, i) => (
                      <Box key={i}>
                        <Group gap="xs" mb="md">
                          <Badge color="red">{exception.type}</Badge>
                          <Text>{exception.value}</Text>
                        </Group>
                        {exception.stacktrace?.frames?.map((frame, j) =>
                          renderStackFrame(frame, j, exception.stacktrace.frames.length)
                        )}
                      </Box>
                    ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          )}

          {/* Context Data */}
          {Object.keys(contexts).length > 0 && (
            <Accordion.Item value="context">
              <Accordion.Control icon={<IconInfoCircle color={theme.colors.blue[6]} />}>
                <Text fw={600}>Context Data</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  {Object.entries(contexts).map(([key, value]) => (
                    <Box key={key}>
                      <Text fw={600} mb="xs" tt="capitalize">{key}</Text>
                      {renderContext(value)}
                    </Box>
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          )}

          {/* User Data */}
          {user && Object.keys(user).length > 0 && (
            <Accordion.Item value="user">
              <Accordion.Control icon={<IconUser color={theme.colors.indigo[6]} />}>
                <Text fw={600}>User Information</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  {renderContext(user)}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          )}
        </Accordion>
      </Box>
    </ScrollArea>
  );
}

export default EventDetail;