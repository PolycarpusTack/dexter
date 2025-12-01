/**
 * AnalysisErrorBoundary Component
 *
 * Error boundary for AI analysis components with polished error states
 * and recovery actions.
 *
 * EPIC Q: AI Transparency & UX Polish - Story Q-4
 */

import React, { Component, ReactNode } from 'react';
import { Alert, Button, Container, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AnalysisErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AnalysisErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container size="sm" py="xl">
          <Alert
            icon={<IconAlertTriangle size={24} aria-hidden="true" />}
            title="Analysis Error"
            color="red"
            radius="md"
          >
            <Stack spacing="md">
              <div>
                <Text size="sm" weight={500} mb={4}>
                  Something went wrong while displaying the analysis.
                </Text>
                <Text size="sm" color="dimmed">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </Text>
              </div>
              <Button
                variant="light"
                color="red"
                leftIcon={<IconRefresh size={16} aria-hidden="true" />}
                onClick={this.handleReset}
                aria-label="Try again"
              >
                Try Again
              </Button>
            </Stack>
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}
