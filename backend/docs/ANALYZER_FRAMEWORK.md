# Analyzer Framework Documentation

## Overview

The Dexter Analyzer Framework provides a standardized way to implement specialized error analyzers that can automatically detect, parse, analyze, and provide recommendations for specific types of errors and issues.

## Architecture

### Core Components

1. **BaseAnalyzer Protocol** - Defines the contract all analyzers must implement
2. **AnalyzerRegistry** - Manages analyzer lifecycle and discovery
3. **Analysis Models** - Standardized data structures for results
4. **Orchestrator Service** - Coordinates analyzer execution

### Data Flow

```
Event Data → Detection → Parsing → Analysis → Visualization → Recommendations
```

## Analyzer Protocol

All analyzers must implement the `BaseAnalyzer` protocol:

```python
from app.models.analyzers import BaseAnalyzer, AnalysisResult

class MyAnalyzer(BaseAnalyzer):
    @property
    def capabilities(self) -> AnalyzerCapabilities:
        return AnalyzerCapabilities(
            analyzer_type=AnalyzerType.CUSTOM,
            name="My Custom Analyzer",
            description="Detects custom error patterns",
            version="1.0.0",
            supported_platforms=["python"],
            supported_error_types=["CustomError"],
            typical_execution_time_ms=100.0,
            max_execution_time_ms=5000.0,
            memory_usage_mb=10.0
        )
    
    async def detect(self, event_data: Dict[str, Any]) -> bool:
        # Return True if this analyzer should process the event
        return "CustomError" in str(event_data.get("title", ""))
    
    async def parse(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        # Extract relevant data for analysis
        return {
            "error_message": event_data.get("message", ""),
            "stack_trace": event_data.get("exception", {}).get("values", [])
        }
    
    async def analyze(self, parsed_data: Dict[str, Any]) -> AnalysisResult:
        # Perform the main analysis
        confidence = 0.8  # Example confidence score
        
        return AnalysisResult(
            analyzer_type=AnalyzerType.CUSTOM,
            analyzer_version="1.0.0",
            analysis_id=f"custom_{datetime.utcnow().isoformat()}",
            event_id=parsed_data.get("event_id", "unknown"),
            execution_time_ms=50.0,
            is_detected=True,
            confidence=confidence,
            business_impact=BusinessImpact.MEDIUM,
            findings=[
                AnalysisFinding(
                    category="custom_pattern",
                    description="Detected custom error pattern",
                    severity=BusinessImpact.MEDIUM,
                    evidence={"pattern": "example"}
                )
            ]
        )
    
    async def visualize(self, analysis: AnalysisResult) -> VisualizationData:
        # Generate visualization data
        return VisualizationData(
            chart_type="timeline",
            data={"events": []},
            options={"title": "Custom Error Timeline"}
        )
    
    async def recommend(self, analysis: AnalysisResult) -> List[AnalysisRecommendation]:
        # Generate actionable recommendations
        return [
            AnalysisRecommendation(
                title="Fix Custom Error",
                description="Add proper error handling",
                priority=BusinessImpact.MEDIUM,
                effort_estimate="2 hours",
                code_example="try:\n    # code\nexcept CustomError:\n    # handle"
            )
        ]
```

## Registration

Register your analyzer with the global registry:

```python
from app.services.analyzer_registry import analyzer_registry
from app.models.analyzers import AnalyzerType

# Register the analyzer
analyzer_registry.register_analyzer(
    AnalyzerType.CUSTOM,
    MyAnalyzer
)
```

## Built-in Analyzers

### PostgreSQL Deadlock Analyzer
- **Type**: `AnalyzerType.DEADLOCK`
- **Purpose**: Detects and analyzes PostgreSQL deadlock errors
- **Visualization**: Network graph showing lock dependencies
- **Recommendations**: Query optimization suggestions

### Memory Leak Analyzer
- **Type**: `AnalyzerType.MEMORY_LEAK`
- **Purpose**: Detects JavaScript/Node.js memory leaks
- **Visualization**: Memory usage timeline
- **Recommendations**: Memory optimization strategies

### N+1 Query Analyzer
- **Type**: `AnalyzerType.N_PLUS_ONE`
- **Purpose**: Detects N+1 query performance issues
- **Visualization**: Query pattern timeline
- **Recommendations**: Query optimization techniques

## Analysis Results

### Confidence Levels
- **LOW** (0.0-0.4): Uncertain detection, manual review recommended
- **MEDIUM** (0.4-0.7): Likely detection, automated suggestions appropriate
- **HIGH** (0.7-1.0): Confident detection, automated actions safe

### Business Impact
- **LOW**: Minor performance impact, low user visibility
- **MEDIUM**: Noticeable performance impact, some user complaints
- **HIGH**: Significant performance degradation, user experience affected
- **CRITICAL**: System outage or security vulnerability

## Performance Guidelines

### Execution Time Limits
- **Target**: < 1 second for detection and parsing
- **Maximum**: < 5 seconds for complete analysis
- **Timeout**: Analysis will be terminated after max execution time

### Memory Usage
- **Target**: < 100MB per analyzer instance
- **Maximum**: < 500MB peak memory usage
- **Monitoring**: Memory usage is tracked and reported

### Error Handling
- Analyzers should handle errors gracefully
- Failed analysis should not crash the system
- Errors are logged and tracked in performance statistics

## Testing

### Unit Tests
```python
import pytest
from app.models.analyzers import AnalyzerType

@pytest.mark.asyncio
async def test_my_analyzer_detection():
    analyzer = MyAnalyzer()
    
    # Test positive detection
    event_data = {"title": "CustomError occurred"}
    assert await analyzer.detect(event_data) == True
    
    # Test negative detection
    event_data = {"title": "Different error"}
    assert await analyzer.detect(event_data) == False

@pytest.mark.asyncio
async def test_my_analyzer_analysis():
    analyzer = MyAnalyzer()
    parsed_data = {"error_message": "test error"}
    
    result = await analyzer.analyze(parsed_data)
    assert result.analyzer_type == AnalyzerType.CUSTOM
    assert result.confidence > 0.0
    assert len(result.findings) > 0
```

### Integration Tests
```python
@pytest.mark.asyncio
async def test_analyzer_registry_integration():
    from app.services.analyzer_registry import analyzer_registry
    
    # Register analyzer
    analyzer_registry.register_analyzer(AnalyzerType.CUSTOM, MyAnalyzer)
    
    # Test discovery
    event_data = {"title": "CustomError occurred"}
    applicable = await analyzer_registry.discover_applicable_analyzers(event_data)
    assert AnalyzerType.CUSTOM in applicable
    
    # Test execution
    result = await analyzer_registry.run_analyzer(AnalyzerType.CUSTOM, event_data)
    assert result.is_detected == True
```

## Best Practices

### Detection Logic
- Be specific in detection to avoid false positives
- Use multiple criteria for robust detection
- Consider error message, stack trace, and context

### Analysis Quality
- Provide clear, actionable findings
- Include relevant evidence and context
- Estimate business impact accurately

### Performance
- Cache expensive computations
- Use async/await for I/O operations
- Implement timeouts for external calls

### Error Handling
- Validate input data thoroughly
- Handle edge cases gracefully
- Log errors with sufficient context

### Documentation
- Document analyzer capabilities clearly
- Provide examples of supported error types
- Include troubleshooting guidance

## Monitoring and Observability

### Metrics Tracked
- Execution time per analyzer
- Success/failure rates
- Confidence score distributions
- Business impact distributions

### Health Checks
- Analyzer instantiation health
- Performance degradation detection
- Error rate monitoring

### Debugging
- Debug information in analysis results
- Performance statistics available via API
- Structured logging for troubleshooting

## Future Enhancements

### Planned Features
- Machine learning-based pattern detection
- Custom analyzer marketplace
- Real-time analysis streaming
- Cross-analyzer correlation

### Extension Points
- Custom visualization types
- External LLM integration
- Third-party tool integration
- Custom business impact calculators