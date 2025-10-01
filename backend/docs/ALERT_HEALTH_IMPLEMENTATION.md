# Alert Health Monitor - Implementation Guide

## Technical Overview

The Alert Health Monitor is built using a microservices architecture with the following key technologies:
- **Backend**: FastAPI (Python)
- **Real-time Communication**: WebSockets
- **Caching**: Redis
- **Frontend**: React with TypeScript
- **Data Processing**: Pandas/NumPy for analytics
- **Monitoring**: Prometheus metrics

## Core Components

### 1. Alert Health Service

```python
# app/services/alert_health_service.py

class AlertHealthService:
    """
    Core service for calculating and managing alert health metrics
    """
    
    def __init__(self, sentry_client: SentryClient, cache: CacheService):
        self.sentry_client = sentry_client
        self.cache = cache
        self.analytics_engine = AnalyticsEngine()
        self.optimization_engine = OptimizationEngine()
    
    async def calculate_health_score(self, alert_id: str) -> AlertHealthScore:
        """
        Calculate comprehensive health score for an alert
        """
        metrics = await self._collect_metrics(alert_id)
        score = self._compute_score(metrics)
        recommendations = await self.optimization_engine.generate_recommendations(metrics)
        
        return AlertHealthScore(
            alert_id=alert_id,
            score=score,
            metrics=metrics,
            recommendations=recommendations,
            timestamp=datetime.utcnow()
        )
    
    async def _collect_metrics(self, alert_id: str) -> AlertMetrics:
        """
        Collect all relevant metrics for health calculation
        """
        # Fetch from cache first
        cached = await self.cache.get(f"alert_metrics:{alert_id}")
        if cached:
            return AlertMetrics(**cached)
        
        # Collect from Sentry API
        alert_data = await self.sentry_client.get_alert(alert_id)
        history = await self.sentry_client.get_alert_history(alert_id, days=30)
        
        metrics = AlertMetrics(
            trigger_count=len(history),
            false_positive_rate=self._calculate_false_positive_rate(history),
            mean_response_time=self._calculate_response_time(history),
            signal_to_noise_ratio=self._calculate_snr(history),
            last_triggered=history[-1].timestamp if history else None
        )
        
        # Cache for 5 minutes
        await self.cache.set(f"alert_metrics:{alert_id}", metrics.dict(), ttl=300)
        return metrics
```

### 2. Analytics Engine

```python
# app/services/analytics_engine.py

class AnalyticsEngine:
    """
    Advanced analytics for alert pattern recognition and analysis
    """
    
    def analyze_alert_patterns(self, alert_history: List[AlertEvent]) -> PatternAnalysis:
        """
        Identify patterns in alert triggering behavior
        """
        df = pd.DataFrame([event.dict() for event in alert_history])
        
        # Time-based analysis
        df['hour'] = pd.to_datetime(df['timestamp']).dt.hour
        df['day_of_week'] = pd.to_datetime(df['timestamp']).dt.dayofweek
        
        patterns = {
            'hourly_distribution': df.groupby('hour').size().to_dict(),
            'daily_distribution': df.groupby('day_of_week').size().to_dict(),
            'burst_detection': self._detect_bursts(df),
            'seasonality': self._detect_seasonality(df),
            'trend': self._calculate_trend(df)
        }
        
        return PatternAnalysis(**patterns)
    
    def _detect_bursts(self, df: pd.DataFrame) -> List[BurstPeriod]:
        """
        Detect burst periods using sliding window analysis
        """
        # Implementation using statistical methods
        pass
    
    def calculate_optimization_potential(self, metrics: AlertMetrics) -> float:
        """
        Calculate potential improvement score (0-100)
        """
        factors = {
            'false_positive_impact': metrics.false_positive_rate * 0.3,
            'response_time_impact': min(metrics.mean_response_time / 3600, 1) * 0.2,
            'volume_impact': min(metrics.trigger_count / 1000, 1) * 0.2,
            'snr_impact': (1 - metrics.signal_to_noise_ratio) * 0.3
        }
        
        return sum(factors.values()) * 100
```

### 3. Optimization Engine

```python
# app/services/optimization_engine.py

class OptimizationEngine:
    """
    Generate intelligent recommendations for alert optimization
    """
    
    def generate_recommendations(self, metrics: AlertMetrics, patterns: PatternAnalysis) -> List[Recommendation]:
        """
        Generate actionable recommendations based on metrics and patterns
        """
        recommendations = []
        
        # False positive optimization
        if metrics.false_positive_rate > 0.3:
            recommendations.append(self._recommend_threshold_adjustment(metrics))
        
        # Response time optimization
        if metrics.mean_response_time > 3600:  # 1 hour
            recommendations.append(self._recommend_alert_grouping(metrics))
        
        # Volume optimization
        if patterns.burst_detection:
            recommendations.append(self._recommend_rate_limiting(patterns))
        
        # Signal-to-noise optimization
        if metrics.signal_to_noise_ratio < 0.5:
            recommendations.append(self._recommend_condition_refinement(metrics))
        
        return recommendations
    
    def _recommend_threshold_adjustment(self, metrics: AlertMetrics) -> Recommendation:
        """
        Calculate optimal threshold based on historical data
        """
        # Statistical analysis to find optimal threshold
        optimal_threshold = self._calculate_optimal_threshold(metrics)
        
        return Recommendation(
            type=RecommendationType.THRESHOLD_ADJUSTMENT,
            priority=Priority.HIGH,
            title="Adjust Alert Threshold",
            description=f"Increase threshold to {optimal_threshold} to reduce false positives by ~{metrics.false_positive_rate * 0.7:.0%}",
            impact=Impact(
                false_positive_reduction=metrics.false_positive_rate * 0.7,
                volume_reduction=0.3,
                accuracy_improvement=0.2
            ),
            implementation=ThresholdAdjustment(
                current_value=metrics.current_threshold,
                recommended_value=optimal_threshold,
                confidence=0.85
            )
        )
```

### 4. WebSocket Manager

```python
# app/services/websocket_manager.py

class AlertHealthWebSocketManager:
    """
    Manage WebSocket connections for real-time alert health updates
    """
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.subscriptions: Dict[str, Set[str]] = defaultdict(set)
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """
        Accept new WebSocket connection
        """
        await websocket.accept()
        self.active_connections[client_id] = websocket
        await self.send_initial_state(client_id)
    
    async def subscribe_to_alerts(self, client_id: str, alert_ids: List[str]):
        """
        Subscribe client to specific alert health updates
        """
        for alert_id in alert_ids:
            self.subscriptions[alert_id].add(client_id)
    
    async def broadcast_health_update(self, alert_id: str, health_data: AlertHealthScore):
        """
        Broadcast health updates to subscribed clients
        """
        message = {
            "type": "health_update",
            "alert_id": alert_id,
            "data": health_data.dict()
        }
        
        for client_id in self.subscriptions.get(alert_id, []):
            if client_id in self.active_connections:
                try:
                    await self.active_connections[client_id].send_json(message)
                except WebSocketDisconnect:
                    await self.disconnect(client_id)
```

### 5. API Endpoints

```python
# app/routers/alert_health.py

router = APIRouter(prefix="/api/v1/alert-health", tags=["alert-health"])

@router.get("/alerts/{alert_id}/health")
async def get_alert_health(
    alert_id: str,
    alert_health_service: AlertHealthService = Depends()
) -> AlertHealthScore:
    """
    Get current health score and metrics for an alert
    """
    return await alert_health_service.calculate_health_score(alert_id)

@router.get("/alerts/health/summary")
async def get_health_summary(
    org_id: str,
    alert_health_service: AlertHealthService = Depends()
) -> HealthSummary:
    """
    Get health summary for all alerts in organization
    """
    return await alert_health_service.get_organization_summary(org_id)

@router.post("/alerts/{alert_id}/optimize")
async def optimize_alert(
    alert_id: str,
    recommendation_id: str,
    alert_health_service: AlertHealthService = Depends()
) -> OptimizationResult:
    """
    Apply optimization recommendation to alert
    """
    return await alert_health_service.apply_optimization(alert_id, recommendation_id)

@router.websocket("/ws/health-updates")
async def websocket_endpoint(
    websocket: WebSocket,
    manager: AlertHealthWebSocketManager = Depends()
):
    """
    WebSocket endpoint for real-time health updates
    """
    client_id = str(uuid.uuid4())
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            if data["type"] == "subscribe":
                await manager.subscribe_to_alerts(client_id, data["alert_ids"])
    except WebSocketDisconnect:
        await manager.disconnect(client_id)
```

## Data Models

```python
# app/models/alert_health.py

class AlertMetrics(BaseModel):
    """Core metrics for alert health calculation"""
    trigger_count: int
    false_positive_rate: float
    mean_response_time: float  # seconds
    signal_to_noise_ratio: float
    last_triggered: Optional[datetime]
    acknowledgment_rate: float
    resolution_rate: float
    
class AlertHealthScore(BaseModel):
    """Comprehensive health score for an alert"""
    alert_id: str
    score: float  # 0-100
    metrics: AlertMetrics
    recommendations: List[Recommendation]
    timestamp: datetime
    trend: HealthTrend
    
class Recommendation(BaseModel):
    """Optimization recommendation"""
    id: str
    type: RecommendationType
    priority: Priority
    title: str
    description: str
    impact: Impact
    implementation: Union[ThresholdAdjustment, ConditionChange, AlertGrouping]
    confidence: float  # 0-1
    
class PatternAnalysis(BaseModel):
    """Alert pattern analysis results"""
    hourly_distribution: Dict[int, int]
    daily_distribution: Dict[int, int]
    burst_periods: List[BurstPeriod]
    seasonality: SeasonalityInfo
    trend: TrendInfo
    anomalies: List[Anomaly]
```

## Database Schema

```sql
-- Alert health metrics storage
CREATE TABLE alert_health_metrics (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255) NOT NULL,
    score FLOAT NOT NULL,
    metrics JSONB NOT NULL,
    recommendations JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alert optimization history
CREATE TABLE alert_optimizations (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(255) NOT NULL,
    recommendation_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    before_state JSONB NOT NULL,
    after_state JSONB NOT NULL,
    impact_metrics JSONB,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_by VARCHAR(255)
);

-- Indexes for performance
CREATE INDEX idx_alert_health_alert_id ON alert_health_metrics(alert_id);
CREATE INDEX idx_alert_health_org_id ON alert_health_metrics(organization_id);
CREATE INDEX idx_alert_health_created ON alert_health_metrics(created_at DESC);
```

## Caching Strategy

```python
# Cache keys and TTLs
CACHE_KEYS = {
    "alert_metrics": "alert:metrics:{alert_id}",  # TTL: 5 minutes
    "health_score": "alert:health:{alert_id}",    # TTL: 1 minute
    "org_summary": "org:health:summary:{org_id}", # TTL: 10 minutes
    "recommendations": "alert:recommendations:{alert_id}", # TTL: 15 minutes
}

class CacheManager:
    """Manage caching for alert health data"""
    
    async def get_or_compute(self, key: str, compute_fn: Callable, ttl: int):
        """Get from cache or compute and cache"""
        cached = await self.cache.get(key)
        if cached:
            return cached
        
        result = await compute_fn()
        await self.cache.set(key, result, ttl=ttl)
        return result
```

## Performance Considerations

### 1. Batch Processing
```python
async def batch_calculate_health_scores(alert_ids: List[str]) -> List[AlertHealthScore]:
    """Calculate health scores in batches for efficiency"""
    tasks = []
    for batch in chunks(alert_ids, size=10):
        tasks.append(asyncio.create_task(process_batch(batch)))
    
    results = await asyncio.gather(*tasks)
    return flatten(results)
```

### 2. Query Optimization
```python
# Use database views for complex queries
CREATE MATERIALIZED VIEW alert_health_summary AS
SELECT 
    alert_id,
    AVG(score) as avg_score,
    COUNT(*) as measurement_count,
    MAX(created_at) as last_updated
FROM alert_health_metrics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY alert_id;

# Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY alert_health_summary;
```

### 3. WebSocket Optimization
```python
class ThrottledWebSocketManager(AlertHealthWebSocketManager):
    """Throttle WebSocket updates to prevent overwhelming clients"""
    
    def __init__(self):
        super().__init__()
        self.update_queue = defaultdict(list)
        self.throttle_interval = 1.0  # seconds
    
    async def broadcast_health_update(self, alert_id: str, health_data: AlertHealthScore):
        """Queue updates and send in batches"""
        self.update_queue[alert_id].append(health_data)
        
        # Schedule batch send if not already scheduled
        if len(self.update_queue[alert_id]) == 1:
            asyncio.create_task(self._send_batch(alert_id))
```

## Testing Strategy

### 1. Unit Tests
```python
# tests/test_alert_health_service.py

async def test_calculate_health_score():
    """Test health score calculation"""
    service = AlertHealthService(mock_sentry, mock_cache)
    metrics = AlertMetrics(
        trigger_count=100,
        false_positive_rate=0.25,
        mean_response_time=3600,
        signal_to_noise_ratio=0.6
    )
    
    score = await service.calculate_health_score("alert-1")
    assert 0 <= score.score <= 100
    assert len(score.recommendations) > 0
```

### 2. Integration Tests
```python
# tests/integration/test_alert_health_integration.py

async def test_end_to_end_health_monitoring():
    """Test complete health monitoring flow"""
    async with TestClient(app) as client:
        # Create test alert
        alert_id = await create_test_alert()
        
        # Get health score
        response = await client.get(f"/api/v1/alert-health/alerts/{alert_id}/health")
        assert response.status_code == 200
        
        # Apply optimization
        recommendation_id = response.json()["recommendations"][0]["id"]
        response = await client.post(
            f"/api/v1/alert-health/alerts/{alert_id}/optimize",
            json={"recommendation_id": recommendation_id}
        )
        assert response.status_code == 200
```

### 3. Performance Tests
```python
# tests/performance/test_alert_health_performance.py

async def test_bulk_health_calculation_performance():
    """Test performance of bulk health calculations"""
    alert_ids = [f"alert-{i}" for i in range(1000)]
    
    start_time = time.time()
    results = await batch_calculate_health_scores(alert_ids)
    end_time = time.time()
    
    assert len(results) == 1000
    assert end_time - start_time < 10  # Should complete within 10 seconds
```

## Deployment Configuration

### Environment Variables
```bash
# Alert Health Configuration
ALERT_HEALTH_ENABLED=true
ALERT_HEALTH_CACHE_TTL=300
ALERT_HEALTH_BATCH_SIZE=10
ALERT_HEALTH_WEBSOCKET_THROTTLE=1000
ALERT_HEALTH_METRIC_RETENTION_DAYS=90

# Analytics Configuration
ANALYTICS_BURST_DETECTION_WINDOW=3600
ANALYTICS_SEASONALITY_PERIOD=weekly
ANALYTICS_TREND_LOOKBACK_DAYS=30

# Optimization Configuration
OPTIMIZATION_CONFIDENCE_THRESHOLD=0.7
OPTIMIZATION_MIN_DATA_POINTS=100
OPTIMIZATION_RECOMMENDATION_LIMIT=5
```

### Docker Configuration
```dockerfile
# Dockerfile additions for Alert Health Monitor
RUN pip install numpy pandas scikit-learn

# Health check endpoint
HEALTHCHECK CMD curl -f http://localhost:8000/api/v1/alert-health/health || exit 1
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dexter-alert-health
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: alert-health
        image: dexter:latest
        env:
        - name: ALERT_HEALTH_ENABLED
          value: "true"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

## Monitoring and Observability

### Prometheus Metrics
```python
# Metrics for monitoring
alert_health_calculation_duration = Histogram(
    'alert_health_calculation_duration_seconds',
    'Time spent calculating alert health score',
    ['alert_type']
)

alert_health_score_gauge = Gauge(
    'alert_health_score',
    'Current health score for alert',
    ['alert_id', 'organization_id']
)

optimization_recommendations_total = Counter(
    'optimization_recommendations_total',
    'Total optimization recommendations generated',
    ['recommendation_type', 'priority']
)
```

### Logging
```python
# Structured logging for alert health events
logger.info(
    "Alert health calculated",
    extra={
        "alert_id": alert_id,
        "score": score,
        "metrics": metrics.dict(),
        "recommendations_count": len(recommendations),
        "calculation_time": calculation_time
    }
)
```

### Error Handling
```python
class AlertHealthError(Exception):
    """Base exception for alert health errors"""
    pass

class MetricCalculationError(AlertHealthError):
    """Error calculating alert metrics"""
    pass

class OptimizationError(AlertHealthError):
    """Error applying optimization"""
    pass

# Error handling middleware
@app.exception_handler(AlertHealthError)
async def alert_health_error_handler(request: Request, exc: AlertHealthError):
    logger.error(f"Alert health error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "type": exc.__class__.__name__}
    )
```