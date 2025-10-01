# File: backend/app/models/__init__.py

"""
Models module for data structures and schemas
"""

# Import analyzer framework
from .analyzers import (
    AnalysisFinding,
    AnalysisRecommendation,
    AnalysisResult,
    AnalyzerCapabilities,
    AnalyzerType,
    BaseAnalyzer,
    BusinessImpact,
    ConfidenceLevel,
    VisualizationData,
)

# Import integration framework
from .integrations import AuthMethod
from .integrations import BusinessImpact as IntegrationBusinessImpact
from .integrations import (
    BusinessMetric,
    ConnectionHealth,
    ConnectorStatus,
    IntegrationCapabilities,
    IntegrationConfig,
    IntegrationCredentials,
    IntegrationEndpoint,
    IntegrationEvent,
    IntegrationType,
    SyncResult,
    SyncStatus,
)

__all__ = [
    # Analyzer framework
    "AnalyzerType",
    "ConfidenceLevel",
    "BusinessImpact",
    "AnalysisFinding",
    "AnalysisRecommendation",
    "VisualizationData",
    "AnalysisResult",
    "AnalyzerCapabilities",
    "BaseAnalyzer",
    # Integration framework
    "IntegrationType",
    "AuthMethod",
    "ConnectorStatus",
    "SyncStatus",
    "IntegrationCredentials",
    "IntegrationEndpoint",
    "IntegrationConfig",
    "ConnectionHealth",
    "IntegrationEvent",
    "BusinessMetric",
    "IntegrationBusinessImpact",
    "SyncResult",
    "IntegrationCapabilities",
]
