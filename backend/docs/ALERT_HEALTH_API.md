# Alert Health Monitor - API Documentation

## Overview

The Alert Health Monitor API provides programmatic access to alert health metrics, recommendations, and optimization capabilities. This RESTful API follows standard HTTP conventions and returns JSON responses.

## Authentication

All API requests require authentication using a Bearer token:

```http
Authorization: Bearer YOUR_API_TOKEN
```

## Base URL

```
https://api.dexter.io/v1/alert-health
```

## Rate Limiting

- 1000 requests per hour per organization
- 100 requests per minute burst limit
- Rate limit headers included in responses

## Endpoints

### 1. Get Alert Health Score

Retrieve the current health score and metrics for a specific alert.

```http
GET /alerts/{alert_id}/health
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| alert_id | string | The unique identifier of the alert |

#### Response

```json
{
  "alert_id": "alert-123",
  "score": 85.5,
  "status": "good",
  "last_calculated": "2024-01-15T10:30:00Z",
  "metrics": {
    "trigger_count": 45,
    "false_positive_rate": 0.12,
    "mean_response_time": 300,
    "signal_to_noise_ratio": 0.88,
    "acknowledgment_rate": 0.92,
    "resolution_rate": 0.78
  },
  "trend": {
    "direction": "improving",
    "change_7d": 5.2,
    "change_30d": 12.8
  },
  "recommendations": [
    {
      "id": "rec-456",
      "type": "threshold_adjustment",
      "priority": "medium",
      "title": "Increase error threshold",
      "description": "Increase threshold from 100 to 150 to reduce false positives",
      "confidence": 0.85
    }
  ]
}
```

#### Error Responses

| Status Code | Description |
|-------------|-------------|
| 404 | Alert not found |
| 403 | Access denied to alert |
| 500 | Internal server error |

### 2. Get Organization Health Summary

Get a summary of health scores for all alerts in an organization.

```http
GET /organizations/{org_id}/summary
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| org_id | string | The organization identifier |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| include_inactive | boolean | false | Include inactive alerts |
| min_score | integer | 0 | Minimum health score filter |
| max_score | integer | 100 | Maximum health score filter |
| sort_by | string | score | Sort field (score, name, volume) |
| order | string | desc | Sort order (asc, desc) |
| page | integer | 1 | Page number |
| limit | integer | 50 | Items per page (max 100) |

#### Response

```json
{
  "organization_id": "org-789",
  "summary": {
    "total_alerts": 45,
    "average_health": 72.3,
    "alerts_needing_attention": 12,
    "alerts_critical": 3,
    "total_recommendations": 28
  },
  "distribution": {
    "excellent": 5,
    "good": 15,
    "fair": 18,
    "poor": 4,
    "critical": 3
  },
  "alerts": [
    {
      "alert_id": "alert-123",
      "name": "API Error Rate",
      "score": 85.5,
      "status": "good",
      "volume_last_24h": 12,
      "recommendations_count": 0
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_pages": 1,
    "total_items": 45
  }
}
```

### 3. Get Alert History

Retrieve historical health scores for an alert.

```http
GET /alerts/{alert_id}/history
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| alert_id | string | The unique identifier of the alert |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| start_date | date | 30 days ago | Start date (ISO 8601) |
| end_date | date | today | End date (ISO 8601) |
| interval | string | daily | Data interval (hourly, daily, weekly) |

#### Response

```json
{
  "alert_id": "alert-123",
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-15T23:59:59Z"
  },
  "data_points": [
    {
      "timestamp": "2024-01-15T00:00:00Z",
      "score": 85.5,
      "metrics": {
        "trigger_count": 3,
        "false_positive_rate": 0.12,
        "mean_response_time": 300
      }
    }
  ],
  "events": [
    {
      "timestamp": "2024-01-10T14:30:00Z",
      "type": "optimization_applied",
      "description": "Threshold adjusted from 100 to 150"
    }
  ]
}
```

### 4. Get Alert Recommendations

Get detailed recommendations for alert optimization.

```http
GET /alerts/{alert_id}/recommendations
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| alert_id | string | The unique identifier of the alert |

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| type | string | all | Filter by recommendation type |
| min_confidence | float | 0.7 | Minimum confidence threshold |
| include_applied | boolean | false | Include previously applied recommendations |

#### Response

```json
{
  "alert_id": "alert-123",
  "recommendations": [
    {
      "id": "rec-456",
      "type": "threshold_adjustment",
      "priority": "high",
      "confidence": 0.92,
      "title": "Adjust Error Rate Threshold",
      "description": "Increase threshold to reduce false positives",
      "impact": {
        "false_positive_reduction": 0.65,
        "volume_reduction": 0.40,
        "accuracy_improvement": 0.15
      },
      "implementation": {
        "current_value": 100,
        "recommended_value": 150,
        "unit": "errors/minute"
      },
      "analysis": {
        "data_points_analyzed": 1000,
        "confidence_factors": {
          "statistical_significance": 0.95,
          "historical_accuracy": 0.88,
          "pattern_consistency": 0.91
        }
      }
    }
  ]
}
```

### 5. Apply Optimization

Apply a specific optimization recommendation to an alert.

```http
POST /alerts/{alert_id}/optimize
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| alert_id | string | The unique identifier of the alert |

#### Request Body

```json
{
  "recommendation_id": "rec-456",
  "options": {
    "test_mode": false,
    "rollback_enabled": true,
    "notification_channels": ["slack", "email"]
  }
}
```

#### Response

```json
{
  "optimization_id": "opt-789",
  "status": "applied",
  "alert_id": "alert-123",
  "recommendation_id": "rec-456",
  "changes": {
    "threshold": {
      "previous": 100,
      "new": 150
    }
  },
  "rollback_token": "rollback-abc123",
  "applied_at": "2024-01-15T10:45:00Z",
  "applied_by": "user@example.com"
}
```

### 6. Rollback Optimization

Rollback a previously applied optimization.

```http
POST /optimizations/{optimization_id}/rollback
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| optimization_id | string | The optimization identifier |

#### Request Body

```json
{
  "rollback_token": "rollback-abc123",
  "reason": "Increased false negatives"
}
```

#### Response

```json
{
  "rollback_id": "rollback-def456",
  "status": "completed",
  "optimization_id": "opt-789",
  "reverted_changes": {
    "threshold": {
      "was": 150,
      "reverted_to": 100
    }
  },
  "rolled_back_at": "2024-01-15T11:00:00Z",
  "rolled_back_by": "user@example.com"
}
```

### 7. Analyze Alert Patterns

Analyze patterns in alert triggering behavior.

```http
POST /alerts/{alert_id}/analyze
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| alert_id | string | The unique identifier of the alert |

#### Request Body

```json
{
  "analysis_type": "patterns",
  "period": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-15T23:59:59Z"
  },
  "options": {
    "include_seasonality": true,
    "include_anomalies": true,
    "correlation_alerts": ["alert-124", "alert-125"]
  }
}
```

#### Response

```json
{
  "alert_id": "alert-123",
  "analysis": {
    "patterns": {
      "time_distribution": {
        "hourly": {
          "peak_hours": [9, 10, 14, 15],
          "quiet_hours": [2, 3, 4, 5]
        },
        "daily": {
          "peak_days": ["monday", "tuesday"],
          "quiet_days": ["saturday", "sunday"]
        }
      },
      "seasonality": {
        "type": "weekly",
        "pattern": "business_hours",
        "confidence": 0.88
      },
      "bursts": [
        {
          "start": "2024-01-10T09:00:00Z",
          "end": "2024-01-10T10:30:00Z",
          "severity": "high",
          "trigger_count": 45
        }
      ]
    },
    "correlations": [
      {
        "alert_id": "alert-124",
        "correlation_coefficient": 0.82,
        "lag_minutes": 5,
        "relationship": "precedes"
      }
    ],
    "anomalies": [
      {
        "timestamp": "2024-01-12T14:30:00Z",
        "type": "volume_spike",
        "severity": "medium",
        "description": "3x normal volume"
      }
    ]
  }
}
```

### 8. Bulk Operations

Perform operations on multiple alerts simultaneously.

```http
POST /alerts/bulk
```

#### Request Body

```json
{
  "operation": "analyze",
  "alert_ids": ["alert-123", "alert-124", "alert-125"],
  "options": {
    "async": true,
    "notification_email": "admin@example.com"
  }
}
```

#### Response

```json
{
  "job_id": "job-xyz789",
  "status": "queued",
  "operation": "analyze",
  "alert_count": 3,
  "estimated_completion": "2024-01-15T11:00:00Z",
  "progress_url": "/jobs/job-xyz789/progress"
}
```

### 9. WebSocket Connection

Establish real-time connection for health updates.

```
WSS /ws/health-updates
```

#### Connection Message

```json
{
  "type": "authenticate",
  "token": "YOUR_API_TOKEN"
}
```

#### Subscribe to Alerts

```json
{
  "type": "subscribe",
  "alert_ids": ["alert-123", "alert-124"],
  "event_types": ["health_update", "recommendation_available"]
}
```

#### Health Update Event

```json
{
  "type": "health_update",
  "alert_id": "alert-123",
  "data": {
    "score": 87.2,
    "previous_score": 85.5,
    "change": 1.7,
    "timestamp": "2024-01-15T10:45:00Z"
  }
}
```

### 10. Export Data

Export alert health data in various formats.

```http
POST /exports
```

#### Request Body

```json
{
  "format": "csv",
  "data_type": "health_scores",
  "filters": {
    "organization_id": "org-789",
    "date_range": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-15T23:59:59Z"
    }
  },
  "options": {
    "include_recommendations": true,
    "include_metrics": true
  }
}
```

#### Response

```json
{
  "export_id": "export-abc123",
  "status": "processing",
  "format": "csv",
  "size_estimate": "2.5MB",
  "download_url": null,
  "expires_at": "2024-01-16T10:45:00Z"
}
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "ALERT_NOT_FOUND",
    "message": "Alert with ID 'alert-999' not found",
    "details": {
      "alert_id": "alert-999",
      "organization_id": "org-789"
    }
  },
  "request_id": "req-xyz123",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| ALERT_NOT_FOUND | 404 | Alert does not exist |
| ACCESS_DENIED | 403 | No permission to access resource |
| RATE_LIMITED | 429 | Rate limit exceeded |
| INVALID_REQUEST | 400 | Request validation failed |
| OPTIMIZATION_FAILED | 422 | Optimization could not be applied |
| INTERNAL_ERROR | 500 | Server error occurred |

## Pagination

Paginated endpoints return a standard pagination object:

```json
{
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_pages": 10,
    "total_items": 485,
    "has_next": true,
    "has_previous": false
  }
}
```

## Webhooks

Configure webhooks to receive real-time notifications.

### Webhook Configuration

```http
POST /webhooks
```

```json
{
  "url": "https://example.com/webhook",
  "events": ["health_score_changed", "optimization_applied"],
  "secret": "webhook-secret-key"
}
```

### Webhook Event Format

```json
{
  "event_type": "health_score_changed",
  "timestamp": "2024-01-15T10:45:00Z",
  "data": {
    "alert_id": "alert-123",
    "previous_score": 72.5,
    "new_score": 85.5,
    "change": 13.0
  },
  "signature": "sha256=abc123..."
}
```

## SDK Examples

### Python

```python
from dexter import AlertHealthClient

client = AlertHealthClient(api_key="YOUR_API_TOKEN")

# Get alert health
health = client.get_alert_health("alert-123")
print(f"Health Score: {health.score}")

# Apply recommendation
result = client.optimize_alert(
    alert_id="alert-123",
    recommendation_id="rec-456"
)
print(f"Optimization Status: {result.status}")
```

### JavaScript

```javascript
import { AlertHealthClient } from '@dexter/alert-health';

const client = new AlertHealthClient({
  apiKey: 'YOUR_API_TOKEN'
});

// Get alert health
const health = await client.getAlertHealth('alert-123');
console.log(`Health Score: ${health.score}`);

// Subscribe to updates
const ws = client.subscribeToUpdates(['alert-123']);
ws.on('health_update', (data) => {
  console.log(`New score: ${data.score}`);
});
```

### cURL

```bash
# Get alert health
curl -X GET "https://api.dexter.io/v1/alert-health/alerts/alert-123/health" \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Apply optimization
curl -X POST "https://api.dexter.io/v1/alert-health/alerts/alert-123/optimize" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recommendation_id": "rec-456"}'
```

## Best Practices

1. **Use Pagination**: Always paginate when retrieving lists
2. **Handle Rate Limits**: Implement exponential backoff
3. **Cache Responses**: Cache health scores for 1-5 minutes
4. **Error Handling**: Always handle API errors gracefully
5. **Webhook Validation**: Verify webhook signatures
6. **Async Operations**: Use bulk endpoints for multiple alerts
7. **WebSocket Reconnection**: Implement automatic reconnection

## Changelog

### v1.2.0 (2024-01-15)
- Added bulk operations endpoint
- Improved WebSocket stability
- Added export functionality

### v1.1.0 (2023-12-01)
- Added pattern analysis endpoint
- Enhanced recommendation details
- Added webhook support

### v1.0.0 (2023-10-15)
- Initial release
- Core health monitoring endpoints
- Basic optimization capabilities