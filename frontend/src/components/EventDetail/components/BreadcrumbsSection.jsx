// File: frontend/src/components/EventDetail/components/BreadcrumbsSection.jsx
// (Partial update - just changing the import statement)

import React, { useState } from "react";
import {
  Accordion,
  Text,
  Stack,
  Box,
  Group,
  Button,
  Code,
  Timeline,
  Collapse,
  useMantineTheme,
} from "@mantine/core";
import { IconRoute, IconChevronDown, IconChevronUp, IconCircleDot } from "@tabler/icons-react";
import { format } from "date-fns";
import { ErrorBoundary } from "../../ErrorHandling";
import ErrorFallback from "../../ErrorHandling/ErrorFallback";

// Rest of the file unchanged...
