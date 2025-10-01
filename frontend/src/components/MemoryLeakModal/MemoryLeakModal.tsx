import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Button,
  Tabs,
  Group,
  Text,
  Paper,
  Alert,
  LoadingOverlay,
  Switch,
  Badge,
  Divider,
  Flex,
  Box,
  ThemeIcon,
  Stack,
  Card,
  ScrollArea
} from '@mantine/core';
import {
  IconAlertCircle,
  IconChartBar,
  IconDownload,
  IconRefresh,
  IconRocket,
  IconTable,
  IconMemory,
  IconArrowUp,
  IconTree,
  IconBulb,
  IconTimeline
} from '@tabler/icons-react';
import { MemoryTimelineChart } from './MemoryTimelineChart';
import { RetentionTreeVisualization } from './RetentionTreeVisualization';
import { LeakPatternTable } from './LeakPatternTable';
import type { 
  AnalysisResult,
  MemoryLeakAnalysis,
  LeakPattern,
  RetentionPath,
  MemoryLeakRecommendation
} from '../../api/unified/memoryLeakApi';
import { analyzeMemoryLeak, exportMemoryLeakSVG } from '../../api/unified/memoryLeakApi';

interface MemoryLeakModalProps {
  opened: boolean;
  onClose: () => void;
  data?: AnalysisResult;
  isLoading?: boolean;
  eventId: string;
}

export const MemoryLeakModal: React.FC<MemoryLeakModalProps> = ({
  opened,
  onClose,
  data,
  isLoading = false,
  eventId
}) => {
  const [enableAiRecommendations, setEnableAiRecommendations] = useState<boolean>(true);
  const [enableMlDetection, setEnableMlDetection] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string | null>('overview');
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(data || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Update analysis data when prop changes
  useEffect(() => {
    setAnalysisData(data || null);
  }, [data]);

  // Extract findings as memory leak patterns
  const leakPatterns: LeakPattern[] = React.useMemo(() => {
    if (!analysisData?.findings) return [];
    
    return analysisData.findings.map((finding: any) => ({
      type: finding.type || 'unknown',
      confidence: finding.confidence || 0,
      affected_objects: finding.affected_objects || [],
      total_retained_size: finding.retained_size || 0,
      description: finding.description || 'No description available',
      evidence: finding.evidence || {}
    }));
  }, [analysisData]);

  // Extract retention paths from metadata
  const retentionPaths: RetentionPath[] = React.useMemo(() => {
    if (!analysisData?.metadata?.retention_paths) return [];
    return analysisData.metadata.retention_paths;
  }, [analysisData]);

  // Extract recommendations
  const recommendations: MemoryLeakRecommendation[] = React.useMemo(() => {
    if (!analysisData?.recommendations) return [];
    return analysisData.recommendations;
  }, [analysisData]);
  
  // Handle re-analysis
  const handleReanalyze = async () => {
    if (!eventId) return;
    
    setIsAnalyzing(true);
    try {
      const result = await analyzeMemoryLeak(eventId, {
        enableAiRecommendations,
        enableMlDetection
      });
      setAnalysisData(result);
    } catch (error) {
      console.error('Error re-analyzing memory leak:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle export SVG
  const handleExportSVG = async () => {
    if (!svgRef.current || !eventId) return;
    
    try {
      await exportMemoryLeakSVG(eventId, svgRef.current);
    } catch (error) {
      console.error('Error exporting SVG:', error);
    }
  };
  
  // Calculate statistics
  const statistics = React.useMemo(() => {
    if (!analysisData) return null;
    
    const totalPatterns = leakPatterns.length;
    const totalRetainedSize = leakPatterns.reduce((sum, pattern) => sum + pattern.total_retained_size, 0);
    const avgConfidence = leakPatterns.length > 0 
      ? leakPatterns.reduce((sum, pattern) => sum + pattern.confidence, 0) / leakPatterns.length 
      : 0;
    const highRiskPatterns = leakPatterns.filter(p => p.confidence > 0.8).length;
    
    return {
      totalPatterns,
      totalRetainedSize,
      avgConfidence: (avgConfidence * 100).toFixed(0),
      highRiskPatterns,
      overallConfidence: (analysisData.confidence * 100).toFixed(0),
      isDetected: analysisData.is_detected
    };
  }, [analysisData, leakPatterns]);
  
  // Format bytes to human-readable string
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) {
      return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    } else if (bytes < 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    } else {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
  };
  
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <ThemeIcon size="lg" variant="light" color="red">
            <IconMemory size={20} />
          </ThemeIcon>
          <Text fw={700} size="lg">Memory Leak Analysis</Text>
          {statistics && statistics.isDetected && (
            <Badge color={statistics.highRiskPatterns > 0 ? "red" : "orange"} variant="outline">
              {statistics.totalPatterns} patterns detected
            </Badge>
          )}
        </Group>
      }
      size="xl"
    >
      <LoadingOverlay visible={isLoading || isAnalyzing} overlayBlur={2} />
      
      {!isLoading && !analysisData && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="No Analysis Data" 
          color="blue"
        >
          No memory leak analysis data is available for this event. Click "Analyze" to start the analysis.
        </Alert>
      )}
      
      {analysisData && !analysisData.is_detected && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="No Memory Leaks Detected" 
          color="green"
        >
          No memory leaks were detected in this event. The analysis confidence is {statistics?.overallConfidence}%.
        </Alert>
      )}
      
      {analysisData && (
        <>
          <Group position="apart" mb="md">
            <Group>
              <Switch 
                label="AI Recommendations" 
                checked={enableAiRecommendations}
                onChange={(e) => setEnableAiRecommendations(e.currentTarget.checked)}
              />
              <Switch 
                label="ML Detection" 
                checked={enableMlDetection}
                onChange={(e) => setEnableMlDetection(e.currentTarget.checked)}
              />
              <Button 
                leftIcon={<IconRefresh size={16} />}
                variant="outline"
                compact
                onClick={handleReanalyze}
                loading={isAnalyzing}
              >
                Re-analyze
              </Button>
            </Group>
            
            <Button 
              leftIcon={<IconDownload size={16} />}
              variant="outline"
              compact
              onClick={handleExportSVG}
            >
              Export SVG
            </Button>
          </Group>
          
          {statistics && analysisData.is_detected && (
            <Paper withBorder p="sm" mb="md" radius="md">
              <Flex gap="md" wrap="wrap">
                <Box sx={{ flex: 1, minWidth: 120 }}>
                  <Text size="sm" c="dimmed">Leak Patterns</Text>
                  <Group spacing="xs">
                    <ThemeIcon size="sm" color="red" variant="light">
                      <IconMemory size={14} />
                    </ThemeIcon>
                    <Text fw={700}>{statistics.totalPatterns}</Text>
                  </Group>
                </Box>
                
                <Box sx={{ flex: 1, minWidth: 120 }}>
                  <Text size="sm" c="dimmed">Memory Impact</Text>
                  <Group spacing="xs">
                    <ThemeIcon size="sm" color="orange" variant="light">
                      <IconChartBar size={14} />
                    </ThemeIcon>
                    <Text fw={700}>{formatBytes(statistics.totalRetainedSize)}</Text>
                  </Group>
                </Box>
                
                <Box sx={{ flex: 1, minWidth: 120 }}>
                  <Text size="sm" c="dimmed">High Risk</Text>
                  <Group spacing="xs">
                    <ThemeIcon size="sm" color="red" variant="light">
                      <IconArrowUp size={14} />
                    </ThemeIcon>
                    <Text fw={700}>{statistics.highRiskPatterns}</Text>
                  </Group>
                </Box>
                
                <Box sx={{ flex: 1, minWidth: 120 }}>
                  <Text size="sm" c="dimmed">Confidence</Text>
                  <Group spacing="xs">
                    <ThemeIcon size="sm" color="blue" variant="light">
                      <IconRocket size={14} />
                    </ThemeIcon>
                    <Text fw={700}>{statistics.overallConfidence}%</Text>
                  </Group>
                </Box>
              </Flex>
            </Paper>
          )}
          
          <Tabs value={activeTab} onTabChange={setActiveTab}>
            <Tabs.List>
              <Tabs.Tab 
                value="overview" 
                icon={<IconChartBar size={14} />}
              >
                Overview
              </Tabs.Tab>
              <Tabs.Tab 
                value="timeline" 
                icon={<IconTimeline size={14} />}
              >
                Timeline
              </Tabs.Tab>
              <Tabs.Tab 
                value="retention" 
                icon={<IconTree size={14} />}
              >
                Retention Paths
              </Tabs.Tab>
              <Tabs.Tab 
                value="patterns" 
                icon={<IconTable size={14} />}
              >
                Leak Patterns
              </Tabs.Tab>
              <Tabs.Tab 
                value="recommendations" 
                icon={<IconBulb size={14} />}
              >
                Recommendations
              </Tabs.Tab>
            </Tabs.List>
            
            <Tabs.Panel value="overview" pt="xs">
              <ScrollArea style={{ height: 400 }}>
                <Stack spacing="md">
                  {analysisData.is_detected ? (
                    <Card withBorder p="md">
                      <Group position="apart" mb="sm">
                        <Text fw={600} size="lg">Analysis Summary</Text>
                        <Badge 
                          color={analysisData.confidence > 0.8 ? "red" : analysisData.confidence > 0.5 ? "orange" : "yellow"}
                          size="lg"
                        >
                          {analysisData.confidence_level} confidence
                        </Badge>
                      </Group>
                      <Text size="sm" mb="md">
                        Memory leak analysis completed with {statistics?.overallConfidence}% confidence. 
                        Found {leakPatterns.length} potential leak patterns affecting {formatBytes(statistics?.totalRetainedSize || 0)} of memory.
                      </Text>
                      
                      {analysisData.metadata.analysis_duration_ms && (
                        <Text size="xs" color="dimmed">
                          Analysis completed in {analysisData.metadata.analysis_duration_ms}ms
                        </Text>
                      )}
                    </Card>
                  ) : (
                    <Card withBorder p="md">
                      <Text fw={600} mb="sm">No Memory Leaks Detected</Text>
                      <Text size="sm">
                        The analysis found no significant memory leak patterns in this event. 
                        This could indicate good memory management or insufficient data for detection.
                      </Text>
                    </Card>
                  )}
                  
                  {analysisData.metadata.growth_pattern && (
                    <Card withBorder p="md">
                      <Text fw={600} mb="sm">Memory Growth Pattern</Text>
                      <Badge color="blue" variant="light" size="lg">
                        {analysisData.metadata.growth_pattern}
                      </Badge>
                    </Card>
                  )}
                </Stack>
              </ScrollArea>
            </Tabs.Panel>
            
            <Tabs.Panel value="timeline" pt="xs">
              <MemoryTimelineChart 
                data={analysisData.visualization_data} 
                height={400}
              />
            </Tabs.Panel>
            
            <Tabs.Panel value="retention" pt="xs">
              <RetentionTreeVisualization 
                retentionPaths={retentionPaths}
                leakPatterns={leakPatterns}
                height={400}
              />
            </Tabs.Panel>
            
            <Tabs.Panel value="patterns" pt="xs">
              <ScrollArea style={{ height: 400 }}>
                <LeakPatternTable patterns={leakPatterns} />
              </ScrollArea>
            </Tabs.Panel>
            
            <Tabs.Panel value="recommendations" pt="xs">
              <ScrollArea style={{ height: 400 }}>
                <Stack spacing="md">
                  {recommendations.length > 0 ? (
                    recommendations.map((rec, index) => (
                      <Card key={index} withBorder p="md">
                        <Group position="apart" mb="sm">
                          <Text fw={600}>{rec.title}</Text>
                          <Badge 
                            color={rec.priority === 'critical' ? 'red' : rec.priority === 'high' ? 'orange' : rec.priority === 'medium' ? 'yellow' : 'blue'}
                            variant="light"
                          >
                            {rec.priority} priority
                          </Badge>
                        </Group>
                        <Text size="sm" mb="md">{rec.description}</Text>
                        
                        {rec.code_example && (
                          <Box>
                            <Text size="sm" fw={500} mb="xs">Code Example:</Text>
                            <Paper withBorder p="sm" style={{ backgroundColor: '#f8f9fa' }}>
                              <Text size="xs" ff="monospace">
                                {rec.code_example}
                              </Text>
                            </Paper>
                          </Box>
                        )}
                        
                        {rec.tags && rec.tags.length > 0 && (
                          <Group spacing="xs" mt="sm">
                            {rec.tags.map((tag, tagIndex) => (
                              <Badge key={tagIndex} size="xs" variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </Group>
                        )}
                      </Card>
                    ))
                  ) : (
                    <Card withBorder p="md">
                      <Text size="sm" color="dimmed">No recommendations available.</Text>
                    </Card>
                  )}
                </Stack>
              </ScrollArea>
            </Tabs.Panel>
          </Tabs>
        </>
      )}
    </Modal>
  );