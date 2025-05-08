// File: frontend/src/components/EventDetail/components/Header.jsx

import React from "react";
import {
  Paper,
  Text,
  Group,
  Badge,
  ThemeIcon,
  Anchor,
  Stack,
  Alert,
  Button,
} from "@mantine/core";
import {
  IconBug,
  IconFileCode,
  IconAlertCircle,
  IconHistory,
  IconUser,
  IconExternalLink,
  IconRefresh,
} from "@tabler/icons-react";
import { format } from "date-fns";
import { SENTRY_WEB_URL } from "../../../api/config";

/**
 * Header component for EventDetail
 * Displays the main information about the error event
 */
function Header({
  eventDetails,
  organizationSlug,
  isFallbackData,
  isMinimalFallback,
  onRetry,
  queryClient,
}) {
  // Destructure event data with fallbacks
  const {
    title = "Unknown Error",
    level = "error",
    timestamp,
    platform = "Unknown",
    count,
    userCount,
    eventID,
    issueId,
    _error,
  } = eventDetails;

  // Formatting helpers
  const formattedDate = timestamp
    ? format(new Date(timestamp), "PPp")
    : "Unknown time";

  const sentryLinks = {
    event: `${SENTRY_WEB_URL}/organizations/${organizationSlug}/issues/${issueId}/events/${eventID}/`,
    issue: `${SENTRY_WEB_URL}/organizations/${organizationSlug}/issues/${issueId}/`,
  };

  return (
    <Paper p="md" radius="md" mb="md" withBorder>
      <Stack gap="xs">
        {isFallbackData && (
          <Alert
            color={isMinimalFallback ? "red" : "yellow"}
            title={
              isMinimalFallback
                ? "Error Retrieving Data"
                : "Limited Data Available"
            }
            mb="xs"
          >
            <Stack gap="xs">
              <Text size="sm">
                {isMinimalFallback
                  ? "Unable to retrieve event details from Sentry. This view shows minimal placeholder data."
                  : "This view shows basic information extracted from the issue data. Some details may be limited or unavailable."}
                {_error && ` Error: ${_error}`}
              </Text>
              <Group>
                <Button
                  leftSection={<IconRefresh size={16} />}
                  size="xs"
                  variant="light"
                  onClick={onRetry}
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
            <Text fw={700} size="lg" lineClamp={2}>
              {title}
            </Text>
          </Group>
          <Badge color={level} size="lg">
            {level}
          </Badge>
        </Group>

        <Group gap="lg">
          <Group gap={4}>
            <IconFileCode size={14} />
            <Text size="sm" c="dimmed">
              {platform}
            </Text>
          </Group>
          <Group gap={4}>
            <IconAlertCircle size={14} />
            <Text size="sm" c="dimmed">
              {formattedDate}
            </Text>
          </Group>
          {count && (
            <Group gap={4}>
              <IconHistory size={14} />
              <Text size="sm" c="dimmed">
                {count} occurrences
              </Text>
            </Group>
          )}
          {userCount && (
            <Group gap={4}>
              <IconUser size={14} />
              <Text size="sm" c="dimmed">
                {userCount} users affected
              </Text>
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
  );
}

export default Header;
