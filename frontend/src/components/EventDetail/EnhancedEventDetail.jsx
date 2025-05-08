// File: frontend/src/components/EventDetail/EnhancedEventDetail.jsx
// (Partial update - just changing the import statement)

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

// Rest of the file unchanged...
