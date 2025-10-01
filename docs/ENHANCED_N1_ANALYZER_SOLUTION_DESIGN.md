# Enhanced N+1 Query Analyzer Solution Design for Dexter Framework
## Enterprise-Grade Implementation with Developer-Focused Architecture

### Executive Summary

This document presents a refined, production-ready design for the N+1 Query Analyzer that addresses developer feedback while maintaining enterprise-grade robustness. The design emphasizes **progressive complexity**, **developer experience**, and **operational excellence** through a modular, MVP-first approach.

---

## Core Design Principles

### 1. **MVP-First Architecture**
- **Core**: Rule-based N+1 detection with basic tracing
- **Enhancement Layer**: AI fallbacks, cross-ORM correlation
- **Enterprise Layer**: Advanced monitoring, compliance, chaos testing

### 2. **Developer Experience Priority**
- Opinionated defaults with escape hatches
- Rich debugging visibility
- Clear error messages and tracing
- Gradual complexity adoption

### 3. **Operational Excellence**
- Self-healing pipelines
- Comprehensive observability
- Automated rollback capabilities
- Policy-driven governance

---

## System Architecture Overview

```mermaid
graph TB
    subgraph "Dexter Plugin Interface"
        A[Query Event Bus] --> B[N+1 Analyzer Plugin]
        B --> C[Plugin Health Check]
        C --> D[Configuration Service]
    end
    
    subgraph "Core Detection Engine"
        E[Query Ingestion] --> F[Validation Pipeline]
        F --> G[ORM Parser Factory]
        G --> H[Pattern Detection Engine]
        H --> I[Impact Calculator]
    end
    
    subgraph "Enhancement Layer"
        J[AI Fix Generator] --> K[Cross-ORM Correlator]
        K --> L[Pattern Learning Engine]
    end
    
    subgraph "Resilience Framework"
        M[Circuit Breaker] --> N[Retry Engine]
        N --> O[Fallback Systems]
        O --> P[Error Recovery]
    end
    
    subgraph "Observability Stack"
        Q[Distributed Tracing] --> R[Metrics Collection]
        R --> S[Health Monitoring]
        S --> T[Alerting System]
    end
    
    B --> E
    I --> J
    I --> M
    P --> Q
    
    classDef core fill:#e1f5fe,stroke:#0277bd,stroke-width:2px;
    classDef enhancement fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef resilience fill:#fff3e0,stroke:#ef6c00,stroke-width:2px;
    classDef observability fill:#e8f5e8,stroke:#388e3c,stroke-width:2px;
    
    class E,F,G,H,I core;
    class J,K,L enhancement;
    class M,N,O,P resilience;
    class Q,R,S,T observability;
```

---

## 1. Dexter Plugin Integration & Lifecycle

### Plugin Interface Implementation

```python
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

class PluginStatus(str, Enum):
    INITIALIZING = "initializing"
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    SHUTTING_DOWN = "shutting_down"

@dataclass
class PluginManifest:
    name: str
    version: str
    dexter_compatibility: str
    supported_orms: List[str]
    supported_databases: List[str]
    min_memory_mb: int
    max_cpu_cores: int

class IPlugin(ABC):
    @abstractmethod
    async def initialize(self, config: Dict[str, Any]) -> bool:
        """Initialize plugin with configuration"""
        
    @abstractmethod
    async def analyze(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze a query event"""
        
    @abstractmethod
    async def health_check(self) -> PluginStatus:
        """Check plugin health"""
        
    @abstractmethod
    async def shutdown(self) -> bool:
        """Graceful shutdown"""

class NPlusOneAnalyzerPlugin(IPlugin):
    def __init__(self):
        self.manifest = PluginManifest(
            name="n1-query-analyzer",
            version="2.0.0",
            dexter_compatibility=">=1.0.0",
            supported_orms=["django", "sqlalchemy", "sequelize", "typeorm", "prisma"],
            supported_databases=["postgresql", "mysql", "sqlite", "mongodb"],
            min_memory_mb=512,
            max_cpu_cores=2
        )
        self.status = PluginStatus.INITIALIZING
        self.core_engine = None
        self.enhancement_layer = None
        self.resilience_framework = None
        
    async def initialize(self, config: Dict[str, Any]) -> bool:
        """
        Progressive initialization based on configuration mode
        """
        try:
            # Phase 1: Core Engine (MVP)
            self.core_engine = await self._initialize_core_engine(config)
            
            # Phase 2: Enhancement Layer (optional)
            if config.get("enable_ai_enhancements", False):
                self.enhancement_layer = await self._initialize_ai_layer(config)
            
            # Phase 3: Resilience Framework
            self.resilience_framework = await self._initialize_resilience(config)
            
            # Subscribe to Dexter's query event bus
            await self._subscribe_to_events()
            
            self.status = PluginStatus.HEALTHY
            return True
            
        except Exception as e:
            logger.error(f"Plugin initialization failed: {e}")
            self.status = PluginStatus.UNHEALTHY
            return False
    
    async def _subscribe_to_events(self):
        """Subscribe to Dexter's real-time query event bus"""
        from dexter.events import QueryEventBus
        
        bus = QueryEventBus()
        await bus.subscribe("query.executed", self._handle_query_event)
        await bus.subscribe("query.batch", self._handle_batch_event)
```

### Dynamic Configuration Management

```python
class ConfigurationManager:
    """
    Centralized configuration with live updates and validation
    """
    
    def __init__(self, dexter_config_service):
        self.config_service = dexter_config_service
        self.schema = self._load_config_schema()
        self.current_config = {}
        self.watchers = []
    
    async def initialize(self):
        """Load initial configuration and set up watchers"""
        self.current_config = await self.config_service.get("n1-analyzer")
        await self._validate_config(self.current_config)
        
        # Watch for configuration changes
        await self.config_service.watch("n1-analyzer", self._on_config_change)
    
    async def _on_config_change(self, new_config: Dict[str, Any]):
        """Handle live configuration updates"""
        try:
            await self._validate_config(new_config)
            old_config = self.current_config.copy()
            self.current_config = new_config
            
            # Notify watchers of config changes
            for watcher in self.watchers:
                await watcher(old_config, new_config)
                
            logger.info("Configuration updated successfully")
            
        except ValidationError as e:
            logger.error(f"Invalid configuration rejected: {e}")
            # Keep using old configuration
    
    def _load_config_schema(self) -> Dict[str, Any]:
        """Load configuration schema with defaults"""
        return {
            "detection": {
                "batch_size": {"default": 1000, "min": 100, "max": 10000},
                "confidence_threshold": {"default": 0.7, "min": 0.1, "max": 1.0},
                "max_analysis_time_ms": {"default": 5000, "min": 100, "max": 30000}
            },
            "ai_enhancements": {
                "enabled": {"default": False},
                "model_version": {"default": "n1net-v4"},
                "min_confidence": {"default": 0.85, "min": 0.5, "max": 1.0}
            },
            "resilience": {
                "circuit_breaker": {
                    "failure_threshold": {"default": 5, "min": 1, "max": 20},
                    "recovery_timeout_ms": {"default": 60000, "min": 1000, "max": 300000}
                },
                "retry_policy": {
                    "max_attempts": {"default": 3, "min": 1, "max": 10},
                    "backoff_factor": {"default": 2.0, "min": 1.0, "max": 5.0}
                }
            }
        }
```

---

## 2. Core Detection Engine (MVP)

### Schema-Driven Parser Factory

```python
class ORMParserRegistry:
    """
    Dynamic ORM parser registry with versioned definitions
    """
    
    def __init__(self):
        self.parsers = {}
        self.fallback_parser = GenericSQLParser()
        self.parser_definitions = self._load_parser_definitions()
    
    def _load_parser_definitions(self) -> Dict[str, Any]:
        """Load parser definitions from versioned registry"""
        return {
            "django": {
                "versions": ["3.0+", "4.0+", "5.0+"],
                "patterns": {
                    "select_related": r"\.select_related\(([^)]+)\)",
                    "prefetch_related": r"\.prefetch_related\(([^)]+)\)",
                    "queryset_iteration": r"for\s+\w+\s+in\s+(\w+\.objects\.)"
                },
                "fixes": {
                    "n1_loop": "Use select_related() or prefetch_related()",
                    "nested_access": "Use select_related() for ForeignKey access"
                }
            },
            "sqlalchemy": {
                "versions": ["1.4+", "2.0+"],
                "patterns": {
                    "joinedload": r"\.options\(joinedload\(([^)]+)\)\)",
                    "selectinload": r"\.options\(selectinload\(([^)]+)\)\)",
                    "lazy_loading": r"\.(\w+)\.all\(\)"
                },
                "fixes": {
                    "n1_loop": "Use joinedload() or selectinload()",
                    "lazy_access": "Use eager loading strategies"
                }
            },
            "generic_sql": {
                "patterns": {
                    "repeated_query": r"SELECT.*FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=",
                    "in_loop": r"for.*SELECT.*WHERE"
                },
                "fixes": {
                    "join_opportunity": "Consider using JOIN instead of separate queries",
                    "bulk_fetch": "Consider bulk fetching with IN clause"
                }
            }
        }
    
    def get_parser(self, orm_type: str, version: str = None) -> 'BaseORMParser':
        """Get appropriate parser for ORM type and version"""
        parser_key = f"{orm_type}:{version}" if version else orm_type
        
        if parser_key in self.parsers:
            return self.parsers[parser_key]
        
        # Try to create parser from definition
        definition = self.parser_definitions.get(orm_type)
        if definition:
            parser = self._create_parser_from_definition(orm_type, definition, version)
            self.parsers[parser_key] = parser
            return parser
        
        # Log unknown ORM for forensic review
        logger.warning(f"Unknown ORM {orm_type}:{version}, using fallback parser")
        telemetry.record("unknown_orm", {"type": orm_type, "version": version})
        
        return self.fallback_parser
    
    def _create_parser_from_definition(self, orm_type: str, definition: Dict[str, Any], version: str) -> 'BaseORMParser':
        """Create parser instance from definition"""
        if orm_type == "django":
            return DjangoParser(definition, version)
        elif orm_type == "sqlalchemy":
            return SQLAlchemyParser(definition, version)
        else:
            return ConfigurableParser(orm_type, definition, version)
```

### Intelligent Pattern Detection Engine

```python
class N1PatternDetector:
    """
    Multi-strategy pattern detection with confidence scoring
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.base_detectors = {
            "classic": ClassicN1Detector(),
            "nested": NestedN1Detector(),
            "hidden": HiddenN1Detector(),
            "batch": BatchN1Detector(),
            "distributed": DistributedN1Detector()
        }
        self.confidence_calculator = ConfidenceCalculator()
        self.pattern_cache = LRUCache(maxsize=10000)
    
    async def detect_patterns(self, query_sequence: List[Dict[str, Any]], context: Dict[str, Any]) -> List[N1Pattern]:
        """
        Detect N+1 patterns with confidence scoring and caching
        """
        # Check cache first
        cache_key = self._generate_cache_key(query_sequence, context)
        cached_result = self.pattern_cache.get(cache_key)
        if cached_result:
            telemetry.increment("pattern_cache_hit")
            return cached_result
        
        # Run detection pipeline
        detected_patterns = []
        
        for detector_name, detector in self.base_detectors.items():
            try:
                with timer(f"detector.{detector_name}"):
                    patterns = await detector.detect(query_sequence, context)
                    
                    for pattern in patterns:
                        # Calculate confidence score
                        confidence = self.confidence_calculator.calculate(pattern, context)
                        pattern.confidence = confidence
                        pattern.detector = detector_name
                        
                        # Only include patterns above threshold
                        if confidence >= self.config.get("confidence_threshold", 0.7):
                            detected_patterns.append(pattern)
                            
            except Exception as e:
                logger.warning(f"Detector {detector_name} failed: {e}")
                telemetry.increment(f"detector_error.{detector_name}")
                continue
        
        # Consolidate overlapping patterns
        consolidated = self._consolidate_patterns(detected_patterns)
        
        # Cache results
        self.pattern_cache[cache_key] = consolidated
        telemetry.increment("pattern_cache_miss")
        
        return consolidated
    
    def _consolidate_patterns(self, patterns: List[N1Pattern]) -> List[N1Pattern]:
        """
        Merge overlapping patterns and resolve conflicts
        """
        consolidated = []
        patterns.sort(key=lambda p: p.confidence, reverse=True)
        
        for pattern in patterns:
            # Check for overlap with existing patterns
            overlapping = [p for p in consolidated if self._patterns_overlap(pattern, p)]
            
            if not overlapping:
                consolidated.append(pattern)
            else:
                # Merge with highest confidence overlapping pattern
                best_overlap = max(overlapping, key=lambda p: p.confidence)
                if pattern.confidence > best_overlap.confidence:
                    consolidated.remove(best_overlap)
                    consolidated.append(pattern)
        
        return consolidated

class ConfidenceCalculator:
    """
    Multi-factor confidence scoring system
    """
    
    BASE_WEIGHTS = {
        "repetition_factor": 0.35,      # How repetitive the queries are
        "similarity_score": 0.25,       # Structural similarity
        "context_correlation": 0.20,    # Request context correlation
        "historical_prevalence": 0.10,  # How common this pattern is
        "performance_impact": 0.10      # Measured performance impact
    }
    
    def calculate(self, pattern: N1Pattern, context: Dict[str, Any]) -> float:
        """Calculate weighted confidence score"""
        score = 0.0
        
        for factor, weight in self.BASE_WEIGHTS.items():
            factor_score = self._calculate_factor_score(pattern, context, factor)
            score += factor_score * weight
        
        # Apply context boosts
        boosted_score = score * self._calculate_context_boost(pattern, context)
        
        return min(boosted_score, 1.0)
    
    def _calculate_factor_score(self, pattern: N1Pattern, context: Dict[str, Any], factor: str) -> float:
        """Calculate individual factor scores"""
        if factor == "repetition_factor":
            # Higher repetition = higher confidence
            return min(pattern.query_count / 10.0, 1.0)
        
        elif factor == "similarity_score":
            # Measure structural similarity between queries
            if len(pattern.queries) < 2:
                return 0.0
            
            similarities = []
            for i in range(len(pattern.queries) - 1):
                sim = self._calculate_query_similarity(pattern.queries[i], pattern.queries[i + 1])
                similarities.append(sim)
            
            return sum(similarities) / len(similarities)
        
        elif factor == "context_correlation":
            # Higher correlation with request context = higher confidence
            return self._calculate_context_correlation(pattern, context)
        
        elif factor == "historical_prevalence":
            # How often we've seen this pattern before
            return self._get_historical_prevalence(pattern)
        
        elif factor == "performance_impact":
            # Measured performance impact
            return min(pattern.performance_impact / 1000.0, 1.0)  # Normalize by 1000ms
        
        return 0.0
    
    def _calculate_context_boost(self, pattern: N1Pattern, context: Dict[str, Any]) -> float:
        """Calculate context-based confidence boosts"""
        boost = 1.0
        
        # Boost for high-traffic endpoints
        if context.get("request_volume", 0) > 1000:
            boost *= 1.2
        
        # Boost for production environments
        if context.get("environment") == "production":
            boost *= 1.1
        
        # Boost for authenticated users (more critical)
        if context.get("authenticated", False):
            boost *= 1.05
        
        return min(boost, 1.5)  # Cap boost at 50%
```

---

## 3. Resilience Framework

### Circuit Breaker Implementation

```python
import asyncio
import time
from enum import Enum
from typing import Dict, Any, Callable, Optional
from dataclasses import dataclass, field

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

@dataclass
class CircuitBreakerConfig:
    failure_threshold: int = 5
    recovery_timeout_ms: int = 60000
    success_threshold: int = 3  # Successes needed to close from half-open
    timeout_ms: int = 5000

@dataclass
class CircuitBreakerMetrics:
    total_requests: int = 0
    failures: int = 0
    successes: int = 0
    consecutive_failures: int = 0
    consecutive_successes: int = 0
    last_failure_time: Optional[float] = None
    state_transitions: Dict[str, int] = field(default_factory=lambda: {
        "closed_to_open": 0,
        "open_to_half_open": 0,
        "half_open_to_closed": 0,
        "half_open_to_open": 0
    })

class CircuitBreaker:
    """
    Enterprise-grade circuit breaker with Redis persistence
    """
    
    def __init__(self, name: str, config: CircuitBreakerConfig, redis_client=None):
        self.name = name
        self.config = config
        self.redis = redis_client
        self.state = CircuitState.CLOSED
        self.metrics = CircuitBreakerMetrics()
        self._lock = asyncio.Lock()
    
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection"""
        async with self._lock:
            await self._update_state()
            
            if self.state == CircuitState.OPEN:
                raise CircuitBreakerOpenError(f"Circuit breaker {self.name} is OPEN")
            
            # Allow limited requests in HALF_OPEN state
            if self.state == CircuitState.HALF_OPEN and self.metrics.consecutive_successes >= self.config.success_threshold:
                await self._transition_to_closed()
        
        # Execute the function
        start_time = time.time()
        try:
            result = await asyncio.wait_for(func(*args, **kwargs), timeout=self.config.timeout_ms / 1000)
            await self._record_success()
            return result
            
        except asyncio.TimeoutError:
            await self._record_failure("timeout")
            raise CircuitBreakerTimeoutError(f"Function {func.__name__} timed out")
            
        except Exception as e:
            await self._record_failure(str(e))
            raise
        
        finally:
            # Record execution time
            execution_time = (time.time() - start_time) * 1000
            telemetry.histogram("circuit_breaker.execution_time", execution_time, {"circuit": self.name})
    
    async def _update_state(self):
        """Update circuit breaker state based on current metrics"""
        if self.state == CircuitState.OPEN:
            # Check if recovery timeout has passed
            if self.metrics.last_failure_time and \
               (time.time() * 1000 - self.metrics.last_failure_time) > self.config.recovery_timeout_ms:
                await self._transition_to_half_open()
        
        elif self.state == CircuitState.CLOSED:
            # Check if failure threshold exceeded
            if self.metrics.consecutive_failures >= self.config.failure_threshold:
                await self._transition_to_open()
        
        elif self.state == CircuitState.HALF_OPEN:
            # Check if we should close or open based on recent results
            if self.metrics.consecutive_successes >= self.config.success_threshold:
                await self._transition_to_closed()
            elif self.metrics.consecutive_failures >= 1:  # Fail fast in half-open
                await self._transition_to_open()
    
    async def _record_success(self):
        """Record successful execution"""
        self.metrics.total_requests += 1
        self.metrics.successes += 1
        self.metrics.consecutive_successes += 1
        self.metrics.consecutive_failures = 0
        
        # Persist to Redis if available
        if self.redis:
            await self._persist_metrics()
        
        telemetry.increment("circuit_breaker.success", {"circuit": self.name})
    
    async def _record_failure(self, error: str):
        """Record failed execution"""
        self.metrics.total_requests += 1
        self.metrics.failures += 1
        self.metrics.consecutive_failures += 1
        self.metrics.consecutive_successes = 0
        self.metrics.last_failure_time = time.time() * 1000
        
        # Persist to Redis if available
        if self.redis:
            await self._persist_metrics()
        
        telemetry.increment("circuit_breaker.failure", {
            "circuit": self.name,
            "error": error[:100]  # Truncate long error messages
        })
    
    async def _transition_to_open(self):
        """Transition circuit breaker to OPEN state"""
        old_state = self.state
        self.state = CircuitState.OPEN
        self.metrics.state_transitions["closed_to_open"] += 1
        
        logger.warning(f"Circuit breaker {self.name} opened after {self.metrics.consecutive_failures} failures")
        telemetry.increment("circuit_breaker.state_change", {
            "circuit": self.name,
            "from": old_state.value,
            "to": self.state.value
        })
    
    async def _transition_to_half_open(self):
        """Transition circuit breaker to HALF_OPEN state"""
        old_state = self.state
        self.state = CircuitState.HALF_OPEN
        self.metrics.state_transitions["open_to_half_open"] += 1
        
        logger.info(f"Circuit breaker {self.name} transitioning to half-open for testing")
        telemetry.increment("circuit_breaker.state_change", {
            "circuit": self.name,
            "from": old_state.value,
            "to": self.state.value
        })
    
    async def _transition_to_closed(self):
        """Transition circuit breaker to CLOSED state"""
        old_state = self.state
        self.state = CircuitState.CLOSED
        self.metrics.consecutive_failures = 0
        self.metrics.state_transitions["half_open_to_closed"] += 1
        
        logger.info(f"Circuit breaker {self.name} closed after successful recovery")
        telemetry.increment("circuit_breaker.state_change", {
            "circuit": self.name,
            "from": old_state.value,
            "to": self.state.value
        })

class AdaptiveRetryEngine:
    """
    Intelligent retry engine with exponential backoff and jitter
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.max_attempts = config.get("max_attempts", 3)
        self.base_delay_ms = config.get("base_delay_ms", 1000)
        self.max_delay_ms = config.get("max_delay_ms", 30000)
        self.backoff_factor = config.get("backoff_factor", 2.0)
        self.jitter_factor = config.get("jitter_factor", 0.1)
        self.retryable_errors = config.get("retryable_errors", [
            "ConnectionError", "TimeoutError", "TemporaryError"
        ])
    
    async def execute(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with adaptive retry logic"""
        last_exception = None
        
        for attempt in range(self.max_attempts):
            try:
                if attempt > 0:
                    delay = self._calculate_delay(attempt)
                    logger.debug(f"Retrying {func.__name__} after {delay}ms (attempt {attempt + 1}/{self.max_attempts})")
                    await asyncio.sleep(delay / 1000)
                
                result = await func(*args, **kwargs)
                
                if attempt > 0:
                    telemetry.increment("retry.success", {
                        "function": func.__name__,
                        "attempt": attempt + 1
                    })
                
                return result
                
            except Exception as e:
                last_exception = e
                error_type = type(e).__name__
                
                # Check if error is retryable
                if not self._is_retryable_error(error_type):
                    logger.warning(f"Non-retryable error {error_type}: {e}")
                    telemetry.increment("retry.non_retryable", {
                        "function": func.__name__,
                        "error": error_type
                    })
                    raise
                
                logger.warning(f"Retryable error on attempt {attempt + 1}: {e}")
                telemetry.increment("retry.attempt", {
                    "function": func.__name__,
                    "attempt": attempt + 1,
                    "error": error_type
                })
        
        # All retries exhausted
        telemetry.increment("retry.exhausted", {"function": func.__name__})
        raise RetryExhaustedError(f"All {self.max_attempts} retry attempts failed") from last_exception
    
    def _calculate_delay(self, attempt: int) -> float:
        """Calculate delay with exponential backoff and jitter"""
        # Exponential backoff
        delay = min(
            self.base_delay_ms * (self.backoff_factor ** (attempt - 1)),
            self.max_delay_ms
        )
        
        # Add jitter to prevent thundering herd
        jitter = delay * self.jitter_factor * (0.5 - random.random())
        
        return max(delay + jitter, 0)
    
    def _is_retryable_error(self, error_type: str) -> bool:
        """Check if error type is retryable"""
        return error_type in self.retryable_errors

class GracefulDegradationManager:
    """
    Manages graceful degradation when services are unavailable
    """
    
    def __init__(self):
        self.fallback_strategies = {}
        self.service_health = {}
    
    def register_fallback(self, service_name: str, fallback_func: Callable):
        """Register a fallback strategy for a service"""
        self.fallback_strategies[service_name] = fallback_func
    
    async def execute_with_fallback(self, service_name: str, primary_func: Callable, *args, **kwargs) -> Any:
        """Execute primary function with fallback if needed"""
        try:
            result = await primary_func(*args, **kwargs)
            self.service_health[service_name] = True
            return result
            
        except Exception as e:
            logger.warning(f"Primary service {service_name} failed: {e}")
            self.service_health[service_name] = False
            
            # Try fallback if available
            fallback = self.fallback_strategies.get(service_name)
            if fallback:
                logger.info(f"Using fallback for {service_name}")
                telemetry.increment("fallback.used", {"service": service_name})
                
                try:
                    result = await fallback(*args, **kwargs)
                    # Mark result as fallback-generated
                    if isinstance(result, dict):
                        result["_fallback"] = True
                    return result
                    
                except Exception as fallback_error:
                    logger.error(f"Fallback for {service_name} also failed: {fallback_error}")
                    telemetry.increment("fallback.failed", {"service": service_name})
                    raise
            else:
                logger.error(f"No fallback available for {service_name}")
                telemetry.increment("fallback.unavailable", {"service": service_name})
                raise
```

---

## 4. Enhanced AI Integration Layer

### Shadow Testing & Model Management

```python
class ModelManager:
    """
    Manages AI model versions with shadow testing and gradual rollout
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.models = {}
        self.shadow_models = {}
        self.rollout_manager = RolloutManager()
        self.model_registry = ModelRegistry()
    
    async def initialize(self):
        """Initialize models from registry"""
        # Load stable model
        stable_version = self.config.get("stable_model_version", "n1net-v4")
        self.models["stable"] = await self.model_registry.load_model(stable_version)
        
        # Load shadow model if configured
        shadow_version = self.config.get("shadow_model_version")
        if shadow_version and shadow_version != stable_version:
            self.shadow_models["candidate"] = await self.model_registry.load_model(shadow_version)
    
    async def analyze_pattern(self, pattern_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze pattern with stable model and optional shadow testing
        """
        # Always run stable model
        stable_result = await self._run_model_analysis(self.models["stable"], pattern_data, context)
        
        # Run shadow model on subset of traffic
        shadow_result = None
        if "candidate" in self.shadow_models and self._should_run_shadow_test(context):
            try:
                shadow_result = await self._run_model_analysis(
                    self.shadow_models["candidate"], 
                    pattern_data, 
                    context
                )
                
                # Compare results and log differences
                await self._compare_results(stable_result, shadow_result, context)
                
            except Exception as e:
                logger.warning(f"Shadow model analysis failed: {e}")
                telemetry.increment("shadow_model.error")
        
        # Return stable result
        return stable_result
    
    def _should_run_shadow_test(self, context: Dict[str, Any]) -> bool:
        """Determine if shadow testing should run for this request"""
        shadow_percentage = self.config.get("shadow_test_percentage", 10)
        
        # Hash-based consistent sampling
        request_id = context.get("request_id", "")
        hash_value = hash(request_id) % 100
        
        return hash_value < shadow_percentage
    
    async def _compare_results(self, stable: Dict[str, Any], shadow: Dict[str, Any], context: Dict[str, Any]):
        """Compare stable and shadow results for analysis"""
        comparison = {
            "stable_confidence": stable.get("confidence", 0),
            "shadow_confidence": shadow.get("confidence", 0),
            "stable_patterns": len(stable.get("patterns", [])),
            "shadow_patterns": len(shadow.get("patterns", [])),
            "confidence_diff": abs(stable.get("confidence", 0) - shadow.get("confidence", 0)),
            "pattern_overlap": self._calculate_pattern_overlap(
                stable.get("patterns", []),
                shadow.get("patterns", [])
            )
        }
        
        # Log significant differences
        if comparison["confidence_diff"] > 0.2 or comparison["pattern_overlap"] < 0.8:
            logger.info("Significant model difference detected", extra={
                "comparison": comparison,
                "context": context
            })
            
            telemetry.histogram("shadow_model.confidence_diff", comparison["confidence_diff"])
            telemetry.histogram("shadow_model.pattern_overlap", comparison["pattern_overlap"])

class ExplainableAI:
    """
    Provides explainability for AI-generated recommendations
    """
    
    def __init__(self):
        self.explanation_templates = self._load_explanation_templates()
        self.feature_importance_calculator = FeatureImportanceCalculator()
    
    def generate_explanation(self, recommendation: Dict[str, Any], pattern: Dict[str, Any]) -> Dict[str, Any]:
        """Generate human-readable explanation for AI recommendation"""
        
        # Calculate feature importance
        feature_importance = self.feature_importance_calculator.calculate(pattern)
        
        # Select appropriate explanation template
        template = self._select_explanation_template(recommendation, pattern)
        
        # Generate explanation
        explanation = {
            "summary": template["summary"].format(**pattern),
            "reasoning": self._generate_reasoning(feature_importance, pattern),
            "confidence_factors": self._explain_confidence(recommendation, feature_importance),
            "alternative_approaches": self._suggest_alternatives(pattern),
            "risk_assessment": self._assess_risks(recommendation, pattern)
        }
        
        return explanation
    
    def _generate_reasoning(self, feature_importance: Dict[str, float], pattern: Dict[str, Any]) -> List[str]:
        """Generate step-by-step reasoning"""
        reasoning = []
        
        # Sort features by importance
        sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
        
        for feature, importance in sorted_features[:3]:  # Top 3 features
            if importance > 0.1:  # Only include significant features
                reasoning.append(
                    self._explain_feature_impact(feature, importance, pattern)
                )
        
        return reasoning
    
    def _explain_feature_impact(self, feature: str, importance: float, pattern: Dict[str, Any]) -> str:
        """Explain how a specific feature contributes to the decision"""
        explanations = {
            "query_repetition": f"The query pattern repeats {pattern.get('repetition_count', 0)} times, indicating a potential N+1 issue",
            "structural_similarity": f"Queries show {importance:.1%} structural similarity, suggesting they could be optimized together",
            "performance_impact": f"The pattern causes an estimated {pattern.get('latency_impact', 0)}ms latency increase",
            "context_correlation": f"This pattern commonly occurs in {pattern.get('endpoint_context', 'similar contexts')}"
        }
        
        return explanations.get(feature, f"Feature {feature} contributes {importance:.1%} to the decision")

class UserFeedbackLoop:
    """
    Collects and processes user feedback to improve model accuracy
    """
    
    def __init__(self, feedback_store):
        self.feedback_store = feedback_store
        self.feedback_processor = FeedbackProcessor()
        self.retraining_scheduler = RetrainingScheduler()
    
    async def record_feedback(self, recommendation_id: str, feedback: Dict[str, Any]):
        """Record user feedback on a recommendation"""
        feedback_record = {
            "recommendation_id": recommendation_id,
            "user_id": feedback.get("user_id"),
            "action": feedback.get("action"),  # "accepted", "rejected", "modified"
            "rating": feedback.get("rating"),  # 1-5 scale
            "comments": feedback.get("comments"),
            "timestamp": time.time(),
            "context": feedback.get("context", {})
        }
        
        await self.feedback_store.store_feedback(feedback_record)
        
        # Process feedback immediately for fast learning
        await self.feedback_processor.process_immediate_feedback(feedback_record)
        
        # Schedule retraining if enough feedback accumulated
        if await self.feedback_store.get_pending_feedback_count() > 1000:
            await self.retraining_scheduler.schedule_retraining()
    
    async def get_feedback_summary(self, time_range: str = "24h") -> Dict[str, Any]:
        """Get summary of recent feedback for monitoring"""
        feedback_data = await self.feedback_store.get_feedback_in_range(time_range)
        
        return {
            "total_feedback": len(feedback_data),
            "acceptance_rate": len([f for f in feedback_data if f["action"] == "accepted"]) / len(feedback_data),
            "average_rating": sum(f.get("rating", 0) for f in feedback_data) / len(feedback_data),
            "common_issues": self._analyze_common_issues(feedback_data),
            "improvement_suggestions": self._generate_improvement_suggestions(feedback_data)
        }
```

---

## 5. Observability & Monitoring

### Distributed Tracing Integration

```python
from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.auto_instrumentation import sitecustomize

class TracingManager:
    """
    Comprehensive distributed tracing for N+1 analysis pipeline
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.tracer = trace.get_tracer(__name__)
        self._setup_tracing()
    
    def _setup_tracing(self):
        """Setup OpenTelemetry tracing"""
        # Configure Jaeger exporter
        jaeger_exporter = JaegerExporter(
            agent_host_name=self.config.get("jaeger_host", "localhost"),
            agent_port=self.config.get("jaeger_port", 6831),
        )
        
        # Configure tracer provider
        trace.set_tracer_provider(TracerProvider())
        span_processor = BatchSpanProcessor(jaeger_exporter)
        trace.get_tracer_provider().add_span_processor(span_processor)
    
    def trace_analysis_pipeline(self, query_batch: List[Dict[str, Any]], context: Dict[str, Any]):
        """Create traced analysis pipeline"""
        return TracedAnalysisPipeline(self.tracer, query_batch, context)

class TracedAnalysisPipeline:
    """
    Analysis pipeline with comprehensive tracing
    """
    
    def __init__(self, tracer, query_batch: List[Dict[str, Any]], context: Dict[str, Any]):
        self.tracer = tracer
        self.query_batch = query_batch
        self.context = context
        self.trace_context = context.get("trace_context", {})
    
    async def execute(self) -> Dict[str, Any]:
        """Execute analysis pipeline with full tracing"""
        
        with self.tracer.start_as_current_span("n1_analysis_pipeline") as span:
            # Set span attributes
            span.set_attributes({
                "n1.query_count": len(self.query_batch),
                "n1.request_id": self.context.get("request_id", ""),
                "n1.user_id": self.context.get("user_id", ""),
                "n1.endpoint": self.context.get("endpoint", ""),
                "n1.orm_type": self.context.get("orm_type", ""),
                "n1.environment": self.context.get("environment", "")
            })
            
            try:
                # Step 1: Query validation
                with self.tracer.start_as_current_span("query_validation") as validation_span:
                    validated_queries = await self._validate_queries()
                    validation_span.set_attribute("n1.valid_queries", len(validated_queries))
                
                # Step 2: Pattern detection
                with self.tracer.start_as_current_span("pattern_detection") as detection_span:
                    patterns = await self._detect_patterns(validated_queries)
                    detection_span.set_attributes({
                        "n1.patterns_found": len(patterns),
                        "n1.max_confidence": max([p.confidence for p in patterns], default=0)
                    })
                
                # Step 3: Impact analysis
                with self.tracer.start_as_current_span("impact_analysis") as impact_span:
                    impact_data = await self._analyze_impact(patterns)
                    impact_span.set_attributes({
                        "n1.estimated_latency_ms": impact_data.get("estimated_latency", 0),
                        "n1.affected_users": impact_data.get("affected_users", 0)
                    })
                
                # Step 4: Fix generation
                with self.tracer.start_as_current_span("fix_generation") as fix_span:
                    fixes = await self._generate_fixes(patterns)
                    fix_span.set_attributes({
                        "n1.fixes_generated": len(fixes),
                        "n1.ai_fixes": len([f for f in fixes if f.get("source") == "ai"]),
                        "n1.rule_fixes": len([f for f in fixes if f.get("source") == "rules"])
                    })
                
                result = {
                    "patterns": patterns,
                    "impact": impact_data,
                    "fixes": fixes,
                    "metadata": {
                        "trace_id": span.get_span_context().trace_id,
                        "processing_time_ms": self._get_span_duration(span)
                    }
                }
                
                span.set_attribute("n1.analysis_success", True)
                return result
                
            except Exception as e:
                span.set_attributes({
                    "n1.analysis_success": False,
                    "n1.error_type": type(e).__name__,
                    "n1.error_message": str(e)[:200]
                })
                span.record_exception(e)
                raise

class MetricsCollector:
    """
    Comprehensive metrics collection for N+1 analyzer
    """
    
    def __init__(self, prometheus_client):
        self.prometheus = prometheus_client
        self._setup_metrics()
    
    def _setup_metrics(self):
        """Setup Prometheus metrics"""
        
        # Core detection metrics
        self.detection_latency = self.prometheus.Histogram(
            "n1_detection_latency_seconds",
            "Time taken for N+1 pattern detection",
            buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0],
            labelnames=["orm_type", "detector", "environment"]
        )
        
        self.patterns_detected = self.prometheus.Counter(
            "n1_patterns_detected_total",
            "Total number of N+1 patterns detected",
            labelnames=["pattern_type", "confidence_level", "environment"]
        )
        
        self.false_positive_rate = self.prometheus.Gauge(
            "n1_false_positive_rate",
            "Estimated false positive rate based on user feedback",
            labelnames=["detector", "confidence_threshold"]
        )
        
        # Fix generation metrics
        self.fix_generation_success = self.prometheus.Counter(
            "n1_fix_generation_success_total",
            "Successful fix generations",
            labelnames=["fix_source", "pattern_type", "orm_type"]
        )
        
        self.fix_application_success = self.prometheus.Counter(
            "n1_fix_application_success_total",
            "Successful fix applications",
            labelnames=["fix_type", "environment", "user_applied"]
        )
        
        # AI model metrics
        self.ai_model_latency = self.prometheus.Histogram(
            "n1_ai_model_latency_seconds",
            "AI model inference latency",
            buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0],
            labelnames=["model_version", "input_size"]
        )
        
        self.ai_confidence_distribution = self.prometheus.Histogram(
            "n1_ai_confidence_distribution",
            "Distribution of AI confidence scores",
            buckets=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
            labelnames=["model_version", "pattern_type"]
        )
        
        # System health metrics
        self.circuit_breaker_state = self.prometheus.Enum(
            "n1_circuit_breaker_state",
            "Current state of circuit breakers",
            labelnames=["service"],
            states=["closed", "open", "half_open"]
        )
        
        self.cache_hit_rate = self.prometheus.Gauge(
            "n1_cache_hit_rate",
            "Cache hit rate for pattern detection",
            labelnames=["cache_type"]
        )
    
    def record_detection(self, duration: float, orm_type: str, detector: str, environment: str):
        """Record pattern detection metrics"""
        self.detection_latency.labels(
            orm_type=orm_type,
            detector=detector,
            environment=environment
        ).observe(duration)
    
    def record_pattern_found(self, pattern_type: str, confidence: float, environment: str):
        """Record detected pattern"""
        confidence_level = "high" if confidence > 0.8 else "medium" if confidence > 0.5 else "low"
        
        self.patterns_detected.labels(
            pattern_type=pattern_type,
            confidence_level=confidence_level,
            environment=environment
        ).inc()
    
    def update_false_positive_rate(self, detector: str, threshold: float, rate: float):
        """Update false positive rate based on feedback"""
        self.false_positive_rate.labels(
            detector=detector,
            confidence_threshold=str(threshold)
        ).set(rate)

class HealthMonitor:
    """
    Comprehensive health monitoring for the N+1 analyzer
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.health_checks = {}
        self.alert_manager = AlertManager(config.get("alerting", {}))
        self.slo_monitor = SLOMonitor(config.get("slos", {}))
    
    def register_health_check(self, name: str, check_func: Callable, critical: bool = False):
        """Register a health check function"""
        self.health_checks[name] = {
            "func": check_func,
            "critical": critical,
            "last_result": None,
            "last_check": None
        }
    
    async def run_health_checks(self) -> Dict[str, Any]:
        """Run all registered health checks"""
        results = {}
        overall_status = "healthy"
        
        for name, check_config in self.health_checks.items():
            try:
                start_time = time.time()
                result = await check_config["func"]()
                duration = time.time() - start_time
                
                check_result = {
                    "status": "healthy" if result else "unhealthy",
                    "duration_ms": duration * 1000,
                    "timestamp": time.time(),
                    "details": result if isinstance(result, dict) else {}
                }
                
                # Update overall status
                if not result and check_config["critical"]:
                    overall_status = "unhealthy"
                elif not result and overall_status == "healthy":
                    overall_status = "degraded"
                
                results[name] = check_result
                check_config["last_result"] = check_result
                check_config["last_check"] = time.time()
                
            except Exception as e:
                error_result = {
                    "status": "error",
                    "error": str(e),
                    "timestamp": time.time()
                }
                
                results[name] = error_result
                check_config["last_result"] = error_result
                
                if check_config["critical"]:
                    overall_status = "unhealthy"
                elif overall_status == "healthy":
                    overall_status = "degraded"
        
        # Generate overall health report
        health_report = {
            "status": overall_status,
            "timestamp": time.time(),
            "checks": results,
            "summary": {
                "total_checks": len(results),
                "healthy_checks": len([r for r in results.values() if r["status"] == "healthy"]),
                "unhealthy_checks": len([r for r in results.values() if r["status"] == "unhealthy"]),
                "error_checks": len([r for r in results.values() if r["status"] == "error"])
            }
        }
        
        # Send alerts if needed
        await self._check_alerts(health_report)
        
        return health_report
    
    async def _check_alerts(self, health_report: Dict[str, Any]):
        """Check if alerts should be sent based on health status"""
        if health_report["status"] == "unhealthy":
            await self.alert_manager.send_alert(
                "critical",
                "N+1 Analyzer Unhealthy",
                f"Critical health checks failed: {health_report['summary']}"
            )
        elif health_report["status"] == "degraded":
            await self.alert_manager.send_alert(
                "warning",
                "N+1 Analyzer Degraded",
                f"Some health checks failed: {health_report['summary']}"
            )

# Example health check functions
async def check_database_connectivity():
    """Check if database connection is healthy"""
    try:
        # Simple query to check connectivity
        result = await db.execute("SELECT 1")
        return {"connected": True, "response_time_ms": 5}
    except Exception:
        return False

async def check_ai_model_availability():
    """Check if AI model is available and responsive"""
    try:
        # Test model with dummy input
        test_result = await ai_model.predict({"test": "data"})
        return {"available": True, "model_version": "n1net-v4"}
    except Exception:
        return False

async def check_cache_performance():
    """Check cache hit rate and performance"""
    cache_stats = await cache.get_stats()
    hit_rate = cache_stats["hits"] / (cache_stats["hits"] + cache_stats["misses"])
    
    return {
        "hit_rate": hit_rate,
        "healthy": hit_rate > 0.8  # Alert if hit rate drops below 80%
    }
```

---

## 6. Security & Compliance Framework

### Advanced Query Sanitization

```python
import re
import ast
import hashlib
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

@dataclass
class SanitizationRule:
    name: str
    pattern: str
    replacement: str
    severity: str  # "low", "medium", "high", "critical"
    compliance_frameworks: List[str]

class AdvancedQuerySanitizer:
    """
    Multi-layer query sanitization with compliance framework support
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.rules = self._load_sanitization_rules()
        self.ast_sanitizer = ASTSanitizer()
        self.compliance_handlers = self._load_compliance_handlers()
    
    def _load_sanitization_rules(self) -> List[SanitizationRule]:
        """Load sanitization rules from configuration"""
        return [
            # Credentials and secrets
            SanitizationRule(
                name="database_credentials",
                pattern=r"(?i)(password|passwd|pwd|secret|token|key)\s*[=:]\s*['\"]?([^'\"\s;,)]+)",
                replacement=r"\1=[CREDENTIAL_REDACTED]",
                severity="critical",
                compliance_frameworks=["gdpr", "hipaa", "pci", "sox"]
            ),
            
            # Personal identifiers
            SanitizationRule(
                name="email_addresses",
                pattern=r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
                replacement="[EMAIL_REDACTED]",
                severity="high",
                compliance_frameworks=["gdpr", "ccpa", "pipeda"]
            ),
            
            SanitizationRule(
                name="phone_numbers",
                pattern=r"(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})",
                replacement="[PHONE_REDACTED]",
                severity="high",
                compliance_frameworks=["gdpr", "hipaa", "ccpa"]
            ),
            
            # Financial data
            SanitizationRule(
                name="credit_cards",
                pattern=r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b",
                replacement="[CARD_REDACTED]",
                severity="critical",
                compliance_frameworks=["pci", "sox"]
            ),
            
            # Health information
            SanitizationRule(
                name="medical_record_numbers",
                pattern=r"\b(MRN|mrn|medical_record|patient_id)\s*[=:]\s*['\"]?([A-Z0-9-]+)",
                replacement=r"\1=[MRN_REDACTED]",
                severity="critical",
                compliance_frameworks=["hipaa"]
            ),
            
            # Government IDs
            SanitizationRule(
                name="social_security",
                pattern=r"\b\d{3}-?\d{2}-?\d{4}\b",
                replacement="[SSN_REDACTED]",
                severity="critical",
                compliance_frameworks=["hipaa", "ferpa", "gdpr"]
            ),
            
            # API keys and tokens
            SanitizationRule(
                name="api_keys",
                pattern=r"\b[A-Za-z0-9]{32,}\b",
                replacement="[API_KEY_REDACTED]",
                severity="high",
                compliance_frameworks=["general"]
            ),
            
            # IP addresses (sometimes PII)
            SanitizationRule(
                name="ip_addresses",
                pattern=r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b",
                replacement="[IP_REDACTED]",
                severity="medium",
                compliance_frameworks=["gdpr", "ccpa"]
            )
        ]
    
    async def sanitize_query(self, query: str, compliance_framework: str = "general") -> Dict[str, Any]:
        """
        Sanitize query with multi-layer approach
        """
        original_hash = hashlib.sha256(query.encode()).hexdigest()
        sanitized_query = query
        applied_rules = []
        risk_level = "low"
        
        # Layer 1: Regex-based sanitization
        for rule in self.rules:
            if compliance_framework in rule.compliance_frameworks or "general" in rule.compliance_frameworks:
                if re.search(rule.pattern, sanitized_query):
                    sanitized_query = re.sub(rule.pattern, rule.replacement, sanitized_query)
                    applied_rules.append({
                        "rule": rule.name,
                        "severity": rule.severity,
                        "compliance": rule.compliance_frameworks
                    })
                    
                    # Update risk level
                    if rule.severity == "critical":
                        risk_level = "critical"
                    elif rule.severity == "high" and risk_level != "critical":
                        risk_level = "high"
                    elif rule.severity == "medium" and risk_level not in ["critical", "high"]:
                        risk_level = "medium"
        
        # Layer 2: AST-based sanitization for structured queries
        try:
            ast_result = await self.ast_sanitizer.sanitize(sanitized_query)
            if ast_result["modified"]:
                sanitized_query = ast_result["query"]
                applied_rules.extend(ast_result["rules_applied"])
        except Exception as e:
            logger.warning(f"AST sanitization failed: {e}")
        
        # Layer 3: Compliance-specific sanitization
        compliance_handler = self.compliance_handlers.get(compliance_framework)
        if compliance_handler:
            compliance_result = await compliance_handler.sanitize(sanitized_query)
            sanitized_query = compliance_result["query"]
            applied_rules.extend(compliance_result.get("rules_applied", []))
        
        sanitized_hash = hashlib.sha256(sanitized_query.encode()).hexdigest()
        
        return {
            "original_hash": original_hash,
            "sanitized_hash": sanitized_hash,
            "sanitized_query": sanitized_query,
            "modified": original_hash != sanitized_hash,
            "risk_level": risk_level,
            "applied_rules": applied_rules,
            "compliance_framework": compliance_framework
        }

class ASTSanitizer:
    """
    AST-based sanitization for structured queries
    """
    
    def __init__(self):
        self.sql_parsers = {
            "select": self._sanitize_select_statement,
            "insert": self._sanitize_insert_statement,
            "update": self._sanitize_update_statement,
            "delete": self._sanitize_delete_statement
        }
    
    async def sanitize(self, query: str) -> Dict[str, Any]:
        """
        Parse and sanitize SQL query using AST
        """
        try:
            # Parse SQL query (using sqlparse or similar)
            parsed = sqlparse.parse(query)[0]
            
            # Identify query type
            query_type = self._identify_query_type(parsed)
            
            # Apply appropriate sanitization
            sanitizer = self.sql_parsers.get(query_type.lower())
            if sanitizer:
                result = await sanitizer(parsed)
                return {
                    "query": str(result["parsed"]),
                    "modified": result["modified"],
                    "rules_applied": result["rules_applied"]
                }
            
            return {
                "query": query,
                "modified": False,
                "rules_applied": []
            }
            
        except Exception as e:
            logger.warning(f"AST parsing failed: {e}")
            return {
                "query": query,
                "modified": False,
                "rules_applied": []
            }
    
    def _identify_query_type(self, parsed) -> str:
        """Identify the type of SQL query"""
        first_token = next(token for token in parsed.flatten() if not token.is_whitespace)
        return first_token.value.upper()
    
    async def _sanitize_select_statement(self, parsed) -> Dict[str, Any]:
        """Sanitize SELECT statement"""
        modified = False
        rules_applied = []
        
        # Remove or redact literal values in WHERE clauses
        for token in parsed.flatten():
            if token.ttype in (sqlparse.tokens.String.Single, sqlparse.tokens.String.Symbol):
                if self._is_sensitive_literal(token.value):
                    token.value = "'[REDACTED]'"
                    modified = True
                    rules_applied.append({
                        "rule": "sensitive_literal",
                        "location": "WHERE clause",
                        "severity": "medium"
                    })
        
        return {
            "parsed": parsed,
            "modified": modified,
            "rules_applied": rules_applied
        }
    
    def _is_sensitive_literal(self, value: str) -> bool:
        """Check if a literal value might be sensitive"""
        # Remove quotes
        clean_value = value.strip("'\"")
        
        # Check patterns that might indicate sensitive data
        sensitive_patterns = [
            r"^\d{3}-?\d{2}-?\d{4}$",  # SSN pattern
            r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$",  # Email
            r"^\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}$",  # Credit card
        ]
        
        return any(re.match(pattern, clean_value) for pattern in sensitive_patterns)

class ComplianceFrameworkManager:
    """
    Manages compliance-specific sanitization and validation
    """
    
    def __init__(self):
        self.frameworks = {
            "gdpr": GDPRHandler(),
            "hipaa": HIPAAHandler(),
            "pci": PCIHandler(),
            "ccpa": CCPAHandler(),
            "sox": SOXHandler(),
            "ferpa": FERPAHandler(),
            "pipeda": PIPEDAHandler()
        }
    
    async def validate_compliance(self, query_data: Dict[str, Any], framework: str) -> Dict[str, Any]:
        """
        Validate query data against compliance framework
        """
        handler = self.frameworks.get(framework.lower())
        if not handler:
            return {
                "compliant": False,
                "error": f"Unsupported compliance framework: {framework}",
                "violations": []
            }
        
        return await handler.validate(query_data)
    
    async def generate_compliance_report(self, analysis_results: List[Dict[str, Any]], framework: str) -> Dict[str, Any]:
        """
        Generate compliance report for analysis results
        """
        handler = self.frameworks.get(framework.lower())
        if not handler:
            return {"error": f"Unsupported framework: {framework}"}
        
        return await handler.generate_report(analysis_results)

class GDPRHandler:
    """
    GDPR-specific compliance handling
    """
    
    async def validate(self, query_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate GDPR compliance"""
        violations = []
        
        # Check for personal data processing
        if self._contains_personal_data(query_data):
            # Verify lawful basis
            if not query_data.get("lawful_basis"):
                violations.append({
                    "type": "missing_lawful_basis",
                    "severity": "high",
                    "description": "Processing personal data without documented lawful basis"
                })
            
            # Check data minimization
            if not self._validates_data_minimization(query_data):
                violations.append({
                    "type": "data_minimization",
                    "severity": "medium",
                    "description": "Query may be accessing more personal data than necessary"
                })
        
        # Check for cross-border transfer
        if self._involves_cross_border_transfer(query_data):
            if not query_data.get("adequacy_decision") and not query_data.get("safeguards"):
                violations.append({
                    "type": "inadequate_transfer_mechanism",
                    "severity": "high",
                    "description": "Cross-border transfer without adequate protection"
                })
        
        return {
            "compliant": len(violations) == 0,
            "framework": "gdpr",
            "violations": violations,
            "recommendations": self._generate_gdpr_recommendations(violations)
        }
    
    def _contains_personal_data(self, query_data: Dict[str, Any]) -> bool:
        """Check if query involves personal data"""
        personal_data_indicators = [
            "email", "phone", "address", "name", "id", "user_id",
            "customer_id", "patient_id", "social_security", "birth_date"
        ]
        
        query_text = query_data.get("sanitized_query", "").lower()
        return any(indicator in query_text for indicator in personal_data_indicators)
    
    def _validates_data_minimization(self, query_data: Dict[str, Any]) -> bool:
        """Check if query follows data minimization principle"""
        # Analyze if query selects only necessary fields
        query = query_data.get("sanitized_query", "")
        
        # Flag queries that select all fields
        if "SELECT *" in query.upper():
            return False
        
        # Check if query includes purpose limitation
        return query_data.get("processing_purpose") is not None
    
    def _involves_cross_border_transfer(self, query_data: Dict[str, Any]) -> bool:
        """Check if query involves cross-border data transfer"""
        source_country = query_data.get("source_country")
        target_country = query_data.get("target_country")
        
        if source_country and target_country:
            return source_country != target_country
        
        return False

class RBACEnforcer:
    """
    Role-Based Access Control for N+1 analyzer features
    """
    
    def __init__(self, rbac_config: Dict[str, Any]):
        self.roles = rbac_config.get("roles", {})
        self.permissions = rbac_config.get("permissions", {})
        self.role_hierarchy = rbac_config.get("role_hierarchy", {})
    
    async def check_permission(self, user_id: str, action: str, resource: str, context: Dict[str, Any] = None) -> bool:
        """
        Check if user has permission to perform action on resource
        """
        try:
            # Get user roles
            user_roles = await self._get_user_roles(user_id)
            
            # Get effective permissions (including inherited)
            effective_permissions = await self._get_effective_permissions(user_roles)
            
            # Check permission
            permission_key = f"{action}:{resource}"
            
            if permission_key in effective_permissions:
                # Check context-based restrictions
                if context and effective_permissions[permission_key].get("conditions"):
                    return await self._evaluate_conditions(
                        effective_permissions[permission_key]["conditions"],
                        context
                    )
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"RBAC check failed for user {user_id}: {e}")
            return False  # Fail closed
    
    async def _get_user_roles(self, user_id: str) -> List[str]:
        """Get roles assigned to user"""
        # This would typically query a user management system
        # For now, return example roles
        return ["analyzer_user", "developer"]
    
    async def _get_effective_permissions(self, roles: List[str]) -> Dict[str, Any]:
        """Get effective permissions including role hierarchy"""
        effective_permissions = {}
        
        # Process roles in hierarchy order
        processed_roles = set()
        role_queue = roles.copy()
        
        while role_queue:
            role = role_queue.pop(0)
            if role in processed_roles:
                continue
            
            processed_roles.add(role)
            
            # Add role permissions
            role_permissions = self.permissions.get(role, {})
            effective_permissions.update(role_permissions)
            
            # Add parent roles to queue
            parent_roles = self.role_hierarchy.get(role, [])
            role_queue.extend(parent_roles)
        
        return effective_permissions
    
    async def _evaluate_conditions(self, conditions: List[Dict[str, Any]], context: Dict[str, Any]) -> bool:
        """Evaluate context-based permission conditions"""
        for condition in conditions:
            condition_type = condition.get("type")
            
            if condition_type == "environment":
                allowed_environments = condition.get("values", [])
                if context.get("environment") not in allowed_environments:
                    return False
            
            elif condition_type == "time_window":
                # Check if current time is within allowed window
                current_hour = datetime.now().hour
                start_hour = condition.get("start_hour", 0)
                end_hour = condition.get("end_hour", 24)
                
                if not (start_hour <= current_hour <= end_hour):
                    return False
            
            elif condition_type == "data_sensitivity":
                max_sensitivity = condition.get("max_level", "public")
                data_sensitivity = context.get("data_sensitivity", "public")
                
                sensitivity_levels = ["public", "internal", "confidential", "restricted"]
                if sensitivity_levels.index(data_sensitivity) > sensitivity_levels.index(max_sensitivity):
                    return False
        
        return True

# Example RBAC configuration
RBAC_CONFIG = {
    "roles": {
        "analyzer_viewer": {
            "view:analysis_results": {"conditions": []},
            "view:patterns": {"conditions": []}
        },
        "analyzer_user": {
            "view:analysis_results": {"conditions": []},
            "view:patterns": {"conditions": []},
            "run:analysis": {"conditions": [{"type": "environment", "values": ["development", "staging"]}]},
            "view:recommendations": {"conditions": []}
        },
        "analyzer_admin": {
            "view:analysis_results": {"conditions": []},
            "view:patterns": {"conditions": []},
            "run:analysis": {"conditions": []},
            "view:recommendations": {"conditions": []},
            "apply:fixes": {"conditions": [{"type": "environment", "values": ["development"]}]},
            "manage:configuration": {"conditions": []}
        },
        "security_admin": {
            "view:audit_logs": {"conditions": []},
            "manage:rbac": {"conditions": []},
            "view:compliance_reports": {"conditions": []}
        }
    },
    "role_hierarchy": {
        "analyzer_user": ["analyzer_viewer"],
        "analyzer_admin": ["analyzer_user"],
        "security_admin": ["analyzer_admin"]
    }
}
```

---

## 7. Deployment & Operations

### Containerized Deployment Architecture

```yaml
# docker-compose.yml for N+1 Analyzer
version: '3.8'

services:
  # Core analyzer service
  n1-analyzer-core:
    image: dexter/n1-analyzer:${VERSION:-latest}
    environment:
      - MODE=core
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/dexter
      - JAEGER_ENDPOINT=http://jaeger:14268/api/traces
      - PROMETHEUS_ENDPOINT=http://prometheus:9090
    depends_on:
      - redis
      - postgres
      - jaeger
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # AI enhancement service
  n1-ai-engine:
    image: dexter/n1-ai:${AI_VERSION:-v4.2}
    environment:
      - MODEL_VERSION=n1net-v4
      - GPU_ENABLED=${GPU_ENABLED:-false}
      - MIN_CONFIDENCE=0.85
      - REDIS_URL=redis://redis:6379
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '4.0'
          memory: 8G
        reservations:
          cpus: '2.0'
          memory: 4G
    healthcheck:
      test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:8081/health').raise_for_status()"]
      interval: 60s
      timeout: 30s
      retries: 3

  # Circuit breaker service
  circuit-breaker:
    image: dexter/circuit-breaker:${CB_VERSION:-v2.1}
    environment:
      - REDIS_URL=redis://redis:6379
      - PROMETHEUS_URL=http://prometheus:9090
    ports:
      - "8082:8080"
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  # Real-time monitor
  realtime-monitor:
    image: dexter/query-monitor:${MONITOR_VERSION:-v3.1}
    environment:
      - KAFKA_BROKERS=kafka:9092
      - REDIS_URL=redis://redis:6379
    volumes:
      - query-cache:/cache
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

  # Health monitor
  health-monitor:
    image: dexter/health-monitor:${HEALTH_VERSION:-v2.3}
    environment:
      - CHECK_INTERVAL=30s
      - ALERT_WEBHOOK=${ALERT_WEBHOOK}
    deploy:
      mode: global
      resources:
        limits:
          cpus: '0.2'
          memory: 256M

  # Supporting services
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=dexter
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

  jaeger:
    image: jaegertracing/all-in-one:latest
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    ports:
      - "16686:16686"
      - "14268:14268"

  prometheus:
    image: prom/prometheus:latest
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"

volumes:
  redis-data:
  postgres-data:
  prometheus-data:
  query-cache:

networks:
  default:
    driver: overlay
    attachable: true
```

### Policy-Driven CI/CD Integration

```yaml
# .github/workflows/n1-analyzer-check.yml
name: N+1 Query Analysis

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  n1-analysis:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
      with:
        fetch-depth: 0  # Needed for diff analysis
    
    - name: Setup N+1 Analyzer
      uses: dexter/setup-n1-analyzer@v2
      with:
        version: ${{ vars.N1_ANALYZER_VERSION }}
        config: |
          detection:
            confidence_threshold: 0.7
            max_patterns_per_endpoint: 3
          policy:
            block_on_critical: true
            require_fixes: true
          gates:
            max_query_count: 100
            max_latency_impact_ms: 500
    
    - name: Analyze Code Changes
      id: analysis
      run: |
        # Analyze only changed files
        git diff --name-only ${{ github.event.pull_request.base.sha }} ${{ github.sha }} | \
        grep -E '\.(py|js|ts|sql)$' | \
        xargs dexter-n1-analyzer analyze \
          --mode=ci \
          --output=json \
          --policy-file=.dexter/n1-policy.yml
    
    - name: Generate Report
      uses: dexter/n1-report-action@v1
      with:
        analysis-results: ${{ steps.analysis.outputs.results }}
        format: github-check
        
    - name: Policy Gate Check
      run: |
        # Check if analysis meets policy requirements
        dexter-n1-analyzer gate-check \
          --results=${{ steps.analysis.outputs.results }} \
          --policy=.dexter/n1-policy.yml \
          --strict
    
    - name: Comment PR
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          const results = ${{ steps.analysis.outputs.results }};
          const comment = `
          ## N+1 Query Analysis Results
          
          **Patterns Detected:** ${results.summary.patterns_found}
          **Critical Issues:** ${results.summary.critical_issues}
          **Estimated Impact:** ${results.summary.latency_impact_ms}ms
          
          ${results.summary.recommendations.map(r => `- ${r}`).join('\n')}
          
          [View Detailed Report](${results.report_url})
          `;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });
```

### Advanced Canary Deployment

```python
class CanaryDeploymentManager:
    """
    Manages canary deployments for N+1 analyzer updates
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.traffic_splitter = TrafficSplitter()
        self.metrics_monitor = MetricsMonitor()
        self.rollback_manager = RollbackManager()
        
    async def start_canary_deployment(self, new_version: str, canary_percentage: float = 5.0):
        """
        Start canary deployment with specified traffic percentage
        """
        deployment_id = f"canary-{new_version}-{int(time.time())}"
        
        try:
            # Deploy canary version
            await self._deploy_canary_version(new_version, deployment_id)
            
            # Configure traffic splitting
            await self.traffic_splitter.set_canary_traffic(canary_percentage, deployment_id)
            
            # Start monitoring
            monitor_task = asyncio.create_task(
                self._monitor_canary_deployment(deployment_id, new_version)
            )
            
            logger.info(f"Started canary deployment {deployment_id} with {canary_percentage}% traffic")
            
            return deployment_id
            
        except Exception as e:
            logger.error(f"Failed to start canary deployment: {e}")
            await self._cleanup_failed_deployment(deployment_id)
            raise
    
    async def _monitor_canary_deployment(self, deployment_id: str, version: str):
        """
        Monitor canary deployment metrics and decide on promotion/rollback
        """
        start_time = time.time()
        monitoring_duration = self.config.get("canary_monitoring_duration", 3600)  # 1 hour
        
        success_criteria = {
            "error_rate_threshold": 0.01,  # 1% error rate
            "latency_p95_threshold": 2000,  # 2s P95 latency
            "detection_accuracy_threshold": 0.95,  # 95% accuracy
            "min_sample_size": 1000  # Minimum requests to evaluate
        }
        
        while time.time() - start_time < monitoring_duration:
            await asyncio.sleep(60)  # Check every minute
            
            # Collect metrics
            canary_metrics = await self.metrics_monitor.get_canary_metrics(deployment_id)
            stable_metrics = await self.metrics_monitor.get_stable_metrics()
            
            # Evaluate success criteria
            evaluation = await self._evaluate_canary_performance(
                canary_metrics, stable_metrics, success_criteria
            )
            
            if evaluation["should_rollback"]:
                logger.warning(f"Canary deployment {deployment_id} failing criteria, rolling back")
                await self.rollback_canary_deployment(deployment_id)
                return
            
            elif evaluation["ready_for_promotion"]:
                logger.info(f"Canary deployment {deployment_id} ready for promotion")
                await self.promote_canary_deployment(deployment_id)
                return
        
        # Monitoring period expired, auto-promote if stable
        final_evaluation = await self._evaluate_canary_performance(
            canary_metrics, stable_metrics, success_criteria
        )
        
        if final_evaluation["should_rollback"]:
            await self.rollback_canary_deployment(deployment_id)
        else:
            await self.promote_canary_deployment(deployment_id)
    
    async def _evaluate_canary_performance(
        self, 
        canary_metrics: Dict[str, float], 
        stable_metrics: Dict[str, float], 
        criteria: Dict[str, float]
    ) -> Dict[str, bool]:
        """
        Evaluate canary performance against success criteria
        """
        evaluation = {
            "should_rollback": False,
            "ready_for_promotion": False,
            "criteria_met": {}
        }
        
        # Check error rate
        canary_error_rate = canary_metrics.get("error_rate", 0)
        stable_error_rate = stable_metrics.get("error_rate", 0)
        
        if canary_error_rate > criteria["error_rate_threshold"]:
            evaluation["should_rollback"] = True
            evaluation["criteria_met"]["error_rate"] = False
        elif canary_error_rate <= stable_error_rate * 1.1:  # Within 10% of stable
            evaluation["criteria_met"]["error_rate"] = True
        
        # Check latency
        canary_p95 = canary_metrics.get("latency_p95", float('inf'))
        stable_p95 = stable_metrics.get("latency_p95", 0)
        
        if canary_p95 > criteria["latency_p95_threshold"]:
            evaluation["should_rollback"] = True
            evaluation["criteria_met"]["latency"] = False
        elif canary_p95 <= stable_p95 * 1.2:  # Within 20% of stable
            evaluation["criteria_met"]["latency"] = True
        
        # Check detection accuracy
        canary_accuracy = canary_metrics.get("detection_accuracy", 0)
        
        if canary_accuracy < criteria["detection_accuracy_threshold"]:
            evaluation["should_rollback"] = True
            evaluation["criteria_met"]["accuracy"] = False
        else:
            evaluation["criteria_met"]["accuracy"] = True
        
        # Check sample size
        canary_requests = canary_metrics.get("request_count", 0)
        
        if canary_requests < criteria["min_sample_size"]:
            evaluation["criteria_met"]["sample_size"] = False
        else:
            evaluation["criteria_met"]["sample_size"] = True
        
        # Determine if ready for promotion
        all_criteria_met = all(evaluation["criteria_met"].values())
        evaluation["ready_for_promotion"] = all_criteria_met and not evaluation["should_rollback"]
        
        return evaluation
    
    async def promote_canary_deployment(self, deployment_id: str):
        """
        Promote canary deployment to full production
        """
        try:
            # Gradually increase traffic to canary
            for percentage in [20, 50, 80, 100]:
                await self.traffic_splitter.set_canary_traffic(percentage, deployment_id)
                await asyncio.sleep(300)  # Wait 5 minutes between increases
                
                # Quick health check at each step
                metrics = await self.metrics_monitor.get_canary_metrics(deployment_id)
                if metrics.get("error_rate", 0) > 0.05:  # 5% error rate threshold
                    logger.error(f"High error rate during promotion at {percentage}%")
                    await self.rollback_canary_deployment(deployment_id)
                    return
            
            # Mark canary as stable
            await self._mark_deployment_stable(deployment_id)
            
            # Clean up old version
            await self._cleanup_old_version(deployment_id)
            
            logger.info(f"Successfully promoted canary deployment {deployment_id}")
            
        except Exception as e:
            logger.error(f"Failed to promote canary deployment {deployment_id}: {e}")
            await self.rollback_canary_deployment(deployment_id)
    
    async def rollback_canary_deployment(self, deployment_id: str):
        """
        Rollback canary deployment to stable version
        """
        try:
            # Immediately redirect all traffic to stable
            await self.traffic_splitter.set_canary_traffic(0, deployment_id)
            
            # Stop canary instances
            await self._stop_canary_instances(deployment_id)
            
            # Clean up resources
            await self._cleanup_failed_deployment(deployment_id)
            
            logger.info(f"Successfully rolled back canary deployment {deployment_id}")
            
        except Exception as e:
            logger.error(f"Failed to rollback canary deployment {deployment_id}: {e}")

class TrafficSplitter:
    """
    Manages traffic splitting between stable and canary versions
    """
    
    def __init__(self):
        self.current_splits = {}
        self.routing_rules = {}
    
    async def set_canary_traffic(self, percentage: float, deployment_id: str):
        """
        Set traffic percentage for canary deployment
        """
        if not 0 <= percentage <= 100:
            raise ValueError("Percentage must be between 0 and 100")
        
        routing_rule = {
            "canary_percentage": percentage,
            "stable_percentage": 100 - percentage,
            "deployment_id": deployment_id,
            "routing_key": f"canary-{deployment_id}",
            "timestamp": time.time()
        }
        
        # Update routing configuration
        await self._update_load_balancer_config(routing_rule)
        
        # Store current configuration
        self.current_splits[deployment_id] = routing_rule
        
        logger.info(f"Set canary traffic to {percentage}% for deployment {deployment_id}")
    
    async def _update_load_balancer_config(self, routing_rule: Dict[str, Any]):
        """
        Update load balancer configuration for traffic splitting
        """
        # This would integrate with your load balancer (e.g., NGINX, HAProxy, Istio)
        config = {
            "upstream_canary": {
                "weight": routing_rule["canary_percentage"],
                "targets": await self._get_canary_targets(routing_rule["deployment_id"])
            },
            "upstream_stable": {
                "weight": routing_rule["stable_percentage"],
                "targets": await self._get_stable_targets()
            }
        }
        
        # Apply configuration
        await self._apply_load_balancer_config(config)
    
    def get_routing_decision(self, request_context: Dict[str, Any]) -> str:
        """
        Make routing decision for incoming request
        """
        # Hash-based consistent routing
        request_id = request_context.get("request_id", "")
        user_id = request_context.get("user_id", "")
        
        # Use stable hash for consistent routing
        routing_hash = hash(f"{request_id}:{user_id}") % 100
        
        for deployment_id, split_config in self.current_splits.items():
            canary_percentage = split_config["canary_percentage"]
            
            if routing_hash < canary_percentage:
                return f"canary-{deployment_id}"
        
        return "stable"
```

---

## 8. Testing & Quality Assurance

### Comprehensive Testing Strategy

```python
import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any, List

class N1AnalyzerTestSuite:
    """
    Comprehensive test suite for N+1 analyzer
    """
    
    @pytest.fixture
    def sample_query_sequences(self):
        """Sample query sequences for testing"""
        return {
            "classic_n1": [
                {"sql": "SELECT * FROM users", "execution_time": 10},
                {"sql": "SELECT * FROM profiles WHERE user_id = 1", "execution_time": 5},
                {"sql": "SELECT * FROM profiles WHERE user_id = 2", "execution_time": 5},
                {"sql": "SELECT * FROM profiles WHERE user_id = 3", "execution_time": 5},
            ],
            "nested_n1": [
                {"sql": "SELECT * FROM orders", "execution_time": 15},
                {"sql": "SELECT * FROM order_items WHERE order_id = 1", "execution_time": 3},
                {"sql": "SELECT * FROM products WHERE id = 101", "execution_time": 2},
                {"sql": "SELECT * FROM products WHERE id = 102", "execution_time": 2},
            ],
            "false_positive": [
                {"sql": "SELECT * FROM users WHERE active = true", "execution_time": 10},
                {"sql": "SELECT COUNT(*) FROM sessions", "execution_time": 5},
                {"sql": "INSERT INTO logs (message) VALUES ('test')", "execution_time": 2},
            ]
        }
    
    @pytest.fixture
    async def analyzer_instance(self):
        """Create analyzer instance for testing"""
        config = {
            "detection": {
                "confidence_threshold": 0.7,
                "max_analysis_time_ms": 5000
            },
            "ai_enhancements": {
                "enabled": False  # Disable AI for unit tests
            }
        }
        
        analyzer = NPlusOneAnalyzerPlugin()
        await analyzer.initialize(config)
        return analyzer

class TestPatternDetection:
    """Test pattern detection accuracy"""
    
    @pytest.mark.asyncio
    async def test_classic_n1_detection(self, analyzer_instance, sample_query_sequences):
        """Test detection of classic N+1 patterns"""
        query_sequence = sample_query_sequences["classic_n1"]
        context = {"endpoint": "/api/users", "orm_type": "django"}
        
        result = await analyzer_instance.analyze({
            "queries": query_sequence,
            "context": context
        })
        
        assert result["patterns_detected"] == 1
        assert result["patterns"][0]["type"] == "classic_n1"
        assert result["patterns"][0]["confidence"] > 0.8
        assert len(result["patterns"][0]["affected_queries"]) == 3
    
    @pytest.mark.asyncio
    async def test_nested_n1_detection(self, analyzer_instance, sample_query_sequences):
        """Test detection of nested N+1 patterns"""
        query_sequence = sample_query_sequences["nested_n1"]
        context = {"endpoint": "/api/orders", "orm_type": "sqlalchemy"}
        
        result = await analyzer_instance.analyze({
            "queries": query_sequence,
            "context": context
        })
        
        assert result["patterns_detected"] == 1
        assert result["patterns"][0]["type"] == "nested_n1"
        assert result["patterns"][0]["confidence"] > 0.7
    
    @pytest.mark.asyncio
    async def test_false_positive_avoidance(self, analyzer_instance, sample_query_sequences):
        """Test that analyzer avoids false positives"""
        query_sequence = sample_query_sequences["false_positive"]
        context = {"endpoint": "/api/mixed", "orm_type": "generic"}
        
        result = await analyzer_instance.analyze({
            "queries": query_sequence,
            "context": context
        })
        
        assert result["patterns_detected"] == 0
        assert len(result["patterns"]) == 0
    
    @pytest.mark.asyncio
    async def test_confidence_scoring_accuracy(self, analyzer_instance):
        """Test confidence scoring accuracy"""
        # High confidence case
        high_confidence_queries = [
            {"sql": "SELECT * FROM users", "execution_time": 10},
            *[{"sql": f"SELECT * FROM profiles WHERE user_id = {i}", "execution_time": 5} 
              for i in range(1, 21)]  # 20 repetitive queries
        ]
        
        result = await analyzer_instance.analyze({
            "queries": high_confidence_queries,
            "context": {"endpoint": "/api/users"}
        })
        
        assert result["patterns"][0]["confidence"] > 0.9
        
        # Low confidence case
        low_confidence_queries = [
            {"sql": "SELECT * FROM users", "execution_time": 10},
            {"sql": "SELECT * FROM profiles WHERE user_id = 1", "execution_time": 5},
            {"sql": "SELECT * FROM profiles WHERE user_id = 2", "execution_time": 5},
        ]
        
        result = await analyzer_instance.analyze({
            "queries": low_confidence_queries,
            "context": {"endpoint": "/api/users"}
        })
        
        if result["patterns_detected"] > 0:
            assert result["patterns"][0]["confidence"] < 0.8

class TestResilienceFramework:
    """Test resilience framework components"""
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_functionality(self):
        """Test circuit breaker behavior"""
        config = CircuitBreakerConfig(
            failure_threshold=3,
            recovery_timeout_ms=1000
        )
        
        circuit_breaker = CircuitBreaker("test", config)
        
        # Simulate failures to open circuit
        failing_function = AsyncMock(side_effect=Exception("Test failure"))
        
        with pytest.raises(Exception):
            await circuit_breaker.call(failing_function)
        
        with pytest.raises(Exception):
            await circuit_breaker.call(failing_function)
        
        with pytest.raises(Exception):
            await circuit_breaker.call(failing_function)
        
        # Circuit should be open now
        assert circuit_breaker.state == CircuitState.OPEN
        
        # Should fail fast
        with pytest.raises(CircuitBreakerOpenError):
            await circuit_breaker.call(failing_function)
    
    @pytest.mark.asyncio
    async def test_retry_mechanism(self):
        """Test adaptive retry mechanism"""
        config = {
            "max_attempts": 3,
            "base_delay_ms": 100,
            "backoff_factor": 2.0,
            "retryable_errors": ["ConnectionError"]
        }
        
        retry_engine = AdaptiveRetryEngine(config)
        
        # Test successful retry
        call_count = 0
        
        async def flaky_function():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("Temporary failure")
            return "success"
        
        result = await retry_engine.execute(flaky_function)
        assert result == "success"
        assert call_count == 3
    
    @pytest.mark.asyncio
    async def test_graceful_degradation(self):
        """Test graceful degradation when services fail"""
        degradation_manager = GracefulDegradationManager()
        
        # Register fallback
        async def ai_fallback(*args, **kwargs):
            return {"source": "fallback", "recommendations": ["Use select_related()"]}
        
        degradation_manager.register_fallback("ai_service", ai_fallback)
        
        # Test with failing primary service
        async def failing_ai_service(*args, **kwargs):
            raise Exception("AI service down")
        
        result = await degradation_manager.execute_with_fallback(
            "ai_service",
            failing_ai_service,
            {"pattern": "n1"}
        )
        
        assert result["source"] == "fallback"
        assert result["_fallback"] is True

class TestSecurityFramework:
    """Test security and compliance features"""
    
    @pytest.mark.asyncio
    async def test_query_sanitization(self):
        """Test query sanitization functionality"""
        sanitizer = AdvancedQuerySanitizer({})
        
        # Test credential sanitization
        query_with_creds = "SELECT * FROM users WHERE password='secret123'"
        result = await sanitizer.sanitize_query(query_with_creds, "general")
        
        assert "secret123" not in result["sanitized_query"]
        assert "[CREDENTIAL_REDACTED]" in result["sanitized_query"]
        assert result["modified"] is True
        assert result["risk_level"] == "critical"
    
    @pytest.mark.asyncio
    async def test_pii_detection(self):
        """Test PII detection and redaction"""
        sanitizer = AdvancedQuerySanitizer({})
        
        query_with_pii = "SELECT * FROM users WHERE email='user@example.com' AND phone='555-123-4567'"
        result = await sanitizer.sanitize_query(query_with_pii, "gdpr")
        
        assert "user@example.com" not in result["sanitized_query"]
        assert "555-123-4567" not in result["sanitized_query"]
        assert "[EMAIL_REDACTED]" in result["sanitized_query"]
        assert "[PHONE_REDACTED]" in result["sanitized_query"]
    
    @pytest.mark.asyncio
    async def test_rbac_enforcement(self):
        """Test role-based access control"""
        rbac_enforcer = RBACEnforcer(RBAC_CONFIG)
        
        # Test viewer permissions
        can_view = await rbac_enforcer.check_permission(
            "user123", "view", "analysis_results", {"environment": "production"}
        )
        assert can_view is True
        
        # Test restricted action
        can_apply_fixes = await rbac_enforcer.check_permission(
            "user123", "apply", "fixes", {"environment": "production"}
        )
        assert can_apply_fixes is False

class TestPerformanceCharacteristics:
    """Test performance and scalability"""
    
    @pytest.mark.asyncio
    async def test_analysis_performance(self, analyzer_instance):
        """Test analysis performance under load"""
        import time
        
        # Generate large query sequence
        large_query_sequence = []
        for i in range(1000):
            large_query_sequence.append({
                "sql": f"SELECT * FROM table_{i % 10} WHERE id = {i}",
                "execution_time": 5
            })
        
        start_time = time.time()
        result = await analyzer_instance.analyze({
            "queries": large_query_sequence,
            "context": {"endpoint": "/api/bulk"}
        })
        end_time = time.time()
        
        analysis_duration = end_time - start_time
        
        # Should complete within 5 seconds for 1000 queries
        assert analysis_duration < 5.0
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_memory_usage(self, analyzer_instance):
        """Test memory usage during analysis"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Run multiple analyses
        for _ in range(100):
            result = await analyzer_instance.analyze({
                "queries": [
                    {"sql": f"SELECT * FROM test WHERE id = {i}", "execution_time": 1}
                    for i in range(50)
                ],
                "context": {"endpoint": "/test"}
            })
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 100MB)
        assert memory_increase < 100 * 1024 * 1024
    
    @pytest.mark.asyncio
    async def test_concurrent_analysis(self, analyzer_instance):
        """Test concurrent analysis handling"""
        async def run_analysis(query_id: int):
            return await analyzer_instance.analyze({
                "queries": [
                    {"sql": f"SELECT * FROM users WHERE id = {query_id}", "execution_time": 5},
                    {"sql": f"SELECT * FROM profiles WHERE user_id = {query_id}", "execution_time": 3}
                ],
                "context": {"endpoint": f"/api/user/{query_id}"}
            })
        
        # Run 50 concurrent analyses
        tasks = [run_analysis(i) for i in range(50)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # All should complete successfully
        successful_results = [r for r in results if not isinstance(r, Exception)]
        assert len(successful_results) == 50

class TestIntegrationScenarios:
    """Test integration scenarios"""
    
    @pytest.mark.asyncio
    async def test_dexter_plugin_integration(self):
        """Test integration with Dexter plugin system"""
        # Mock Dexter event bus
        mock_event_bus = Mock()
        mock_config_service = Mock()
        
        with patch('dexter.events.QueryEventBus', return_value=mock_event_bus):
            with patch('dexter.config.ConfigService', return_value=mock_config_service):
                plugin = NPlusOneAnalyzerPlugin()
                
                config = {
                    "detection": {"confidence_threshold": 0.7},
                    "ai_enhancements": {"enabled": False}
                }
                
                result = await plugin.initialize(config)
                assert result is True
                assert plugin.status == PluginStatus.HEALTHY
    
    @pytest.mark.asyncio
    async def test_ai_model_integration(self):
        """Test AI model integration and fallback"""
        # Mock AI service
        mock_ai_service = AsyncMock()
        mock_ai_service.analyze.return_value = {
            "confidence": 0.9,
            "patterns": [{"type": "classic_n1", "fix": "Use select_related()"}]
        }
        
        with patch('ai_service.AIService', return_value=mock_ai_service):
            analyzer = NPlusOneAnalyzerPlugin()
            config = {
                "ai_enhancements": {"enabled": True},
                "detection": {"confidence_threshold": 0.7}
            }
            
            await analyzer.initialize(config)
            
            result = await analyzer.analyze({
                "queries": [
                    {"sql": "SELECT * FROM users", "execution_time": 10},
                    {"sql": "SELECT * FROM profiles WHERE user_id = 1", "execution_time": 5}
                ],
                "context": {"endpoint": "/api/users"}
            })
            
            # Should have AI-generated recommendations
            if result["patterns_detected"] > 0:
                assert any(rec.get("source") == "ai" for rec in result["recommendations"])

# Golden query workloads for regression testing
GOLDEN_QUERY_WORKLOADS = {
    "django_classic_n1": {
        "queries": [
            {"sql": "SELECT * FROM auth_user", "execution_time": 15},
            {"sql": "SELECT * FROM myapp_profile WHERE user_id = 1", "execution_time": 5},
            {"sql": "SELECT * FROM myapp_profile WHERE user_id = 2", "execution_time": 5},
            {"sql": "SELECT * FROM myapp_profile WHERE user_id = 3", "execution_time": 5},
        ],
        "expected_patterns": 1,
        "expected_confidence": 0.85,
        "expected_fix_type": "select_related"
    },
    
    "sqlalchemy_lazy_loading": {
        "queries": [
            {"sql": "SELECT users.id FROM users", "execution_time": 10},
            {"sql": "SELECT profiles.* FROM profiles WHERE profiles.user_id = 1", "execution_time": 3},
            {"sql": "SELECT profiles.* FROM profiles WHERE profiles.user_id = 2", "execution_time": 3},
        ],
        "expected_patterns": 1,
        "expected_confidence": 0.8,
        "expected_fix_type": "joinedload"
    }
}

class TestRegressionSuite:
    """Regression test suite using golden query workloads"""
    
    @pytest.mark.asyncio
    @pytest.mark.parametrize("workload_name,workload", GOLDEN_QUERY_WORKLOADS.items())
    async def test_golden_workload(self, analyzer_instance, workload_name, workload):
        """Test analyzer against golden query workloads"""
        result = await analyzer_instance.analyze({
            "queries": workload["queries"],
            "context": {"workload": workload_name}
        })
        
        # Check detection accuracy
        assert result["patterns_detected"] == workload["expected_patterns"]
        
        if workload["expected_patterns"] > 0:
            # Check confidence within tolerance
            actual_confidence = result["patterns"][0]["confidence"]
            expected_confidence = workload["expected_confidence"]
            confidence_tolerance = 0.05  # 5% tolerance
            
            assert abs(actual_confidence - expected_confidence) <= confidence_tolerance
            
            # Check fix type
            fix_type = result["recommendations"][0]["type"]
            assert workload["expected_fix_type"] in fix_type.lower()

# Fuzz testing
class TestFuzzTesting:
    """Fuzz testing for robustness"""
    
    @pytest.mark.asyncio
    async def test_malformed_sql_handling(self, analyzer_instance):
        """Test handling of malformed SQL queries"""
        malformed_queries = [
            {"sql": "SELECT * FROM", "execution_time": 0},  # Incomplete
            {"sql": "SELECT '; DROP TABLE users; --", "execution_time": 0},  # SQL injection
            {"sql": "", "execution_time": 0},  # Empty
            {"sql": "SELECT * FROM users WHERE id = '; DELETE FROM users; --", "execution_time": 0},
            {"sql": "SLECT * FORM users", "execution_time": 0},  # Typos
        ]
        
        for malformed_query in malformed_queries:
            try:
                result = await analyzer_instance.analyze({
                    "queries": [malformed_query],
                    "context": {"endpoint": "/test"}
                })
                
                # Should handle gracefully without crashing
                assert result is not None
                
            except Exception as e:
                # Should be handled exceptions, not crashes
                assert isinstance(e, (ValueError, ValidationError, ParseError))
    
    @pytest.mark.asyncio
    async def test_extreme_input_sizes(self, analyzer_instance):
        """Test handling of extreme input sizes"""
        # Very large query
        large_query = "SELECT * FROM users WHERE id IN (" + ",".join(str(i) for i in range(10000)) + ")"
        
        result = await analyzer_instance.analyze({
            "queries": [{"sql": large_query, "execution_time": 1000}],
            "context": {"endpoint": "/test"}
        })
        
        assert result is not None
        
        # Many small queries
        many_queries = [
            {"sql": f"SELECT * FROM table_{i}", "execution_time": 1}
            for i in range(5000)
        ]
        
        result = await analyzer_instance.analyze({
            "queries": many_queries,
            "context": {"endpoint": "/bulk"}
        })
        
        assert result is not None

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
```

---

## Implementation Roadmap

### Phase 1: MVP Foundation (Weeks 1-2)
1. **Core Plugin Interface** - Dexter integration, configuration management
2. **Basic Pattern Detection** - Rule-based N+1 detection with confidence scoring
3. **Essential Resilience** - Circuit breaker, basic retry logic
4. **Simple Visualization** - Timeline charts and pattern tables

### Phase 2: Enhancement Layer (Weeks 3-4)
1. **AI Integration** - Model management, shadow testing
2. **Advanced Detection** - Cross-ORM correlation, ML-enhanced patterns
3. **Comprehensive Monitoring** - Distributed tracing, metrics collection
4. **Security Framework** - Query sanitization, basic RBAC

### Phase 3: Enterprise Features (Weeks 5-6)
1. **Compliance Framework** - GDPR, HIPAA, PCI handlers
2. **Advanced Deployment** - Canary deployments, traffic splitting
3. **Comprehensive Testing** - Chaos engineering, fuzz testing
4. **Full Observability** - Health monitoring, alerting, SLO tracking

### Success Metrics
- **Detection Accuracy**: >95% true positive rate, <5% false positive rate
- **Performance**: <50ms analysis latency for real-time mode
- **Reliability**: 99.9% uptime with graceful degradation
- **Developer Experience**: <5 minutes setup time, clear error messages

This enhanced design addresses all developer feedback while maintaining enterprise-grade capabilities, ensuring both **technical excellence** and **practical usability**.