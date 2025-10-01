import { useState, useEffect } from 'react'
import { AppShell, Header, Navbar, Container, Title, Group, Button, Badge, Text, Stack, Card, Loader, Alert, Modal, Code, ScrollArea, Tabs, Grid, Paper, ThemeIcon, ActionIcon, TextInput } from '@mantine/core'
import { IconBug, IconAlertCircle, IconBrain, IconRefresh, IconSearch, IconX } from '@tabler/icons-react'
import axios from 'axios'

interface Issue {
  id: string
  title: string
  culprit: string
  level: string
  platform: string
  count: number
  userCount: number
  lastSeen: string
  status: string
  project: {
    name: string
  }
}

interface AIResponse {
  explanation: string
  model: string
  confidence: number
}

function App() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [aiExplanation, setAiExplanation] = useState<AIResponse | null>(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchIssues()
  }, [])

  const fetchIssues = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/issues')
      setIssues(response.data)
    } catch (error) {
      console.error('Failed to fetch issues:', error)
    } finally {
      setLoading(false)
    }
  }

  const explainError = async (issue: Issue) => {
    try {
      setExplainLoading(true)
      setSelectedIssue(issue)
      const response = await axios.post('/api/ai/explain', {
        type: issue.title.split(':')[0],
        message: issue.title
      })
      setAiExplanation(response.data)
    } catch (error) {
      console.error('Failed to get AI explanation:', error)
    } finally {
      setExplainLoading(false)
    }
  }

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      error: 'red',
      warning: 'yellow',
      info: 'blue',
      debug: 'gray'
    }
    return colors[level] || 'gray'
  }

  const filteredIssues = issues.filter(issue => 
    issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.culprit.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm' }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <ThemeIcon size="lg" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
              <IconBug size={24} />
            </ThemeIcon>
            <Title order={3}>Dexter - Sentry Companion</Title>
          </Group>
          <Group>
            <Badge variant="light">Mock-up Version</Badge>
            <ActionIcon onClick={fetchIssues} variant="light">
              <IconRefresh size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack>
          <Title order={4}>Navigation</Title>
          <Button leftSection={<IconBug />} variant="light" fullWidth>
            Issues
          </Button>
          <Button leftSection={<IconAlertCircle />} variant="subtle" fullWidth>
            Alerts
          </Button>
          <Button leftSection={<IconBrain />} variant="subtle" fullWidth>
            AI Analysis
          </Button>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="xl">
          <Stack>
            <Group justify="space-between" align="center">
              <Title order={2}>Issues Overview</Title>
              <TextInput
                placeholder="Search issues..."
                leftSection={<IconSearch size={16} />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.currentTarget.value)}
                rightSection={
                  searchTerm && (
                    <ActionIcon size="sm" variant="subtle" onClick={() => setSearchTerm('')}>
                      <IconX size={16} />
                    </ActionIcon>
                  )
                }
              />
            </Group>

            {loading ? (
              <Paper p="xl" withBorder>
                <Group justify="center">
                  <Loader />
                </Group>
              </Paper>
            ) : (
              <Grid>
                {filteredIssues.map((issue) => (
                  <Grid.Col key={issue.id} span={{ base: 12, md: 6, lg: 4 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                      <Stack gap="sm">
                        <Group justify="space-between" align="flex-start">
                          <Badge color={getLevelColor(issue.level)} variant="light">
                            {issue.level}
                          </Badge>
                          <Badge variant="outline">{issue.platform}</Badge>
                        </Group>
                        
                        <Text size="sm" fw={500} lineClamp={2}>
                          {issue.title}
                        </Text>
                        
                        <Code block>{issue.culprit}</Code>
                        
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">
                            {issue.count} events
                          </Text>
                          <Text size="xs" c="dimmed">
                            {issue.userCount} users
                          </Text>
                        </Group>
                        
                        <Group justify="space-between" align="center">
                          <Text size="xs" c="dimmed">
                            {issue.project.name}
                          </Text>
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconBrain size={14} />}
                            onClick={() => explainError(issue)}
                          >
                            Explain
                          </Button>
                        </Group>
                      </Stack>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>
            )}
          </Stack>
        </Container>
      </AppShell.Main>

      <Modal
        opened={!!selectedIssue}
        onClose={() => {
          setSelectedIssue(null)
          setAiExplanation(null)
        }}
        title="AI Error Analysis"
        size="lg"
      >
        {selectedIssue && (
          <Stack>
            <Alert variant="light" color={getLevelColor(selectedIssue.level)}>
              <Text fw={500}>{selectedIssue.title}</Text>
            </Alert>
            
            {explainLoading ? (
              <Paper p="xl" withBorder>
                <Group justify="center">
                  <Loader size="sm" />
                  <Text size="sm" c="dimmed">Analyzing error...</Text>
                </Group>
              </Paper>
            ) : aiExplanation ? (
              <Stack>
                <Paper p="md" withBorder>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Badge variant="light">AI Explanation</Badge>
                      <Badge variant="outline" size="sm">
                        {aiExplanation.model} - {Math.round(aiExplanation.confidence * 100)}% confidence
                      </Badge>
                    </Group>
                    <Text size="sm">{aiExplanation.explanation}</Text>
                  </Stack>
                </Paper>
                
                <Tabs defaultValue="details">
                  <Tabs.List>
                    <Tabs.Tab value="details">Details</Tabs.Tab>
                    <Tabs.Tab value="stacktrace">Stack Trace</Tabs.Tab>
                    <Tabs.Tab value="context">Context</Tabs.Tab>
                  </Tabs.List>
                  
                  <Tabs.Panel value="details" pt="md">
                    <Stack gap="xs">
                      <Text size="sm"><strong>File:</strong> {selectedIssue.culprit}</Text>
                      <Text size="sm"><strong>Platform:</strong> {selectedIssue.platform}</Text>
                      <Text size="sm"><strong>Occurrences:</strong> {selectedIssue.count}</Text>
                      <Text size="sm"><strong>Users Affected:</strong> {selectedIssue.userCount}</Text>
                    </Stack>
                  </Tabs.Panel>
                  
                  <Tabs.Panel value="stacktrace" pt="md">
                    <ScrollArea h={200}>
                      <Code block>
{`TypeError: Cannot read property 'map' of undefined
  at UserList (app/components/UserList.tsx:45:23)
  at renderWithHooks (react-dom.development.js:14985:18)
  at mountIndeterminateComponent (react-dom.development.js:17811:13)
  at beginWork (react-dom.development.js:19049:16)`}
                      </Code>
                    </ScrollArea>
                  </Tabs.Panel>
                  
                  <Tabs.Panel value="context" pt="md">
                    <Stack gap="xs">
                      <Text size="sm"><strong>Browser:</strong> Chrome 120</Text>
                      <Text size="sm"><strong>OS:</strong> Windows 10</Text>
                      <Text size="sm"><strong>Environment:</strong> production</Text>
                    </Stack>
                  </Tabs.Panel>
                </Tabs>
              </Stack>
            ) : null}
          </Stack>
        )}
      </Modal>
    </AppShell>
  )
}

export default App