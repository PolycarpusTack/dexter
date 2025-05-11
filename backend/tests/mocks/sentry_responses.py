# File: backend/tests/mocks/sentry_responses.py

"""Mock Sentry API responses for testing"""

MOCK_EVENT = {
    "id": "8ef9b64e1f6945a7b17d0dd57f5f7eb1",
    "groupID": "1361572042",
    "eventID": "8ef9b64e1f6945a7b17d0dd57f5f7eb1",
    "projectID": "1234567",
    "size": 6985,
    "errors": [],
    "platform": "javascript",
    "message": "TypeError: Cannot read property 'foo' of undefined",
    "dateCreated": "2024-01-01T12:00:00.000000Z",
    "dateReceived": "2024-01-01T12:00:05.000000Z",
    "type": "error",
    "metadata": {
        "type": "TypeError",
        "value": "Cannot read property 'foo' of undefined"
    },
    "tags": [
        {"key": "environment", "value": "production"},
        {"key": "release", "value": "1.0.0"},
        {"key": "server_name", "value": "app-01"},
        {"key": "level", "value": "error"}
    ],
    "user": {
        "id": "123456",
        "email": "user@example.com",
        "username": "testuser",
        "ip_address": "192.168.1.1"
    },
    "context": {
        "browser": {
            "name": "Chrome",
            "version": "120.0.0",
            "type": "browser"
        },
        "os": {
            "name": "Windows",
            "version": "10",
            "type": "os"
        },
        "device": {
            "family": "PC",
            "model": "Desktop",
            "type": "device"
        }
    },
    "entries": [
        {
            "type": "exception",
            "data": {
                "values": [
                    {
                        "type": "TypeError",
                        "value": "Cannot read property 'foo' of undefined",
                        "stacktrace": {
                            "frames": [
                                {
                                    "filename": "app.js",
                                    "function": "doSomething",
                                    "lineNo": 123,
                                    "colNo": 45,
                                    "inApp": True
                                }
                            ]
                        }
                    }
                ]
            }
        }
    ]
}

MOCK_ISSUE = {
    "id": "1361572042",
    "shareId": "share-id-123",
    "shortId": "DEXTER-123",
    "title": "TypeError: Cannot read property 'foo' of undefined",
    "culprit": "app.js in doSomething",
    "permalink": "https://sentry.io/organizations/test/issues/1361572042/",
    "logger": None,
    "level": "error",
    "status": "unresolved",
    "statusDetails": {},
    "isPublic": False,
    "platform": "javascript",
    "project": {
        "id": "1234567",
        "name": "frontend",
        "slug": "frontend"
    },
    "type": "error",
    "metadata": {
        "type": "TypeError",
        "value": "Cannot read property 'foo' of undefined",
        "filename": "app.js",
        "function": "doSomething"
    },
    "numComments": 0,
    "assignedTo": None,
    "isBookmarked": False,
    "isSubscribed": True,
    "subscriptionDetails": {"reason": "unknown"},
    "hasSeen": False,
    "count": "573",
    "userCount": 387,
    "firstSeen": "2024-01-01T00:00:00.000000Z",
    "lastSeen": "2024-01-02T12:00:00.000000Z",
    "stats": {
        "24h": [
            [1704067200, 12],
            [1704070800, 45],
            [1704074400, 23],
            [1704078000, 67],
            [1704081600, 34],
            [1704085200, 89],
            [1704088800, 56],
            [1704092400, 78]
        ]
    }
}

MOCK_ISSUE_EVENTS = [
    {
        "eventID": "event-1",
        "id": "event-1",
        "message": "Error occurred",
        "timestamp": "2024-01-01T12:00:00Z",
        "type": "error"
    },
    {
        "eventID": "event-2",
        "id": "event-2", 
        "message": "Another error",
        "timestamp": "2024-01-01T12:05:00Z",
        "type": "error"
    }
]

MOCK_PROJECTS = [
    {
        "id": "1234567",
        "slug": "frontend",
        "name": "Frontend",
        "platform": "javascript",
        "dateCreated": "2023-01-01T00:00:00.000000Z",
        "isBookmarked": False,
        "isMember": True,
        "features": ["releases", "minidump"],
        "firstEvent": "2023-01-01T01:00:00.000000Z",
        "hasAccess": True,
        "organization": {
            "id": "123456",
            "slug": "test-org",
            "name": "Test Organization"
        }
    }
]

MOCK_RELEASES = [
    {
        "version": "1.0.0",
        "ref": "6ba09a7c53235ee8a8fa5ee4c1ca8ca886e7fdbb",
        "url": "https://github.com/test/repo/releases/tag/1.0.0",
        "dateCreated": "2024-01-01T00:00:00.000000Z",
        "dateReleased": "2024-01-01T01:00:00.000000Z",
        "commitCount": 45,
        "data": {},
        "newGroups": 3,
        "owner": None,
        "versionInfo": {
            "package": "frontend",
            "version": {
                "raw": "1.0.0"
            }
        }
    }
]

MOCK_ERROR_RESPONSE = {
    "detail": "The requested resource does not exist"
}

MOCK_RATE_LIMIT_RESPONSE = {
    "detail": "You have exceeded the rate limit"
}

MOCK_BATCH_ISSUES = {
    "issue-1": MOCK_ISSUE,
    "issue-2": {**MOCK_ISSUE, "id": "issue-2", "title": "Another error"},
    "issue-3": {"error": "Not found", "id": "issue-3"}
}

MOCK_PERFORMANCE_METRICS = {
    "totalEvents": 10000,
    "avgResponseTime": 250.5,
    "errorRate": 0.05,
    "throughput": 100,
    "apdex": 0.95,
    "p95": 500,
    "p99": 800
}

MOCK_DISCOVER_RESPONSE = {
    "data": [
        {
            "id": "event-1",
            "project.name": "frontend",
            "title": "Error in production",
            "timestamp": "2024-01-01T12:00:00+00:00",
            "transaction": "/api/user",
            "release": "1.0.0",
            "environment": "production",
            "user.email": "user@example.com",
            "count()": 573,
            "p95()": 450.5
        }
    ],
    "meta": {
        "fields": {
            "id": "string",
            "project.name": "string",
            "title": "string",
            "timestamp": "date",
            "transaction": "string",
            "count()": "integer",
            "p95()": "duration"
        }
    }
}

MOCK_ALERT_RULES = [
    {
        "id": "123",
        "name": "High Error Rate",
        "environment": "production",
        "dataset": "events",
        "query": "",
        "aggregate": "count()",
        "timeWindow": 60,
        "thresholdType": 0,
        "resolveThreshold": 100,
        "triggers": [
            {
                "id": "456",
                "alertRuleId": "123",
                "label": "critical",
                "thresholdType": 0,
                "alertThreshold": 1000,
                "resolveThreshold": 100,
                "dateCreated": "2024-01-01T00:00:00.000000Z"
            }
        ]
    }
]

MOCK_COMMENTS = [
    {
        "id": "comment-1",
        "issue": "issue-1",
        "data": {
            "text": "This looks like a regression from the last release"
        },
        "user": {
            "id": "user-1",
            "name": "John Doe",
            "email": "john@example.com"
        },
        "dateCreated": "2024-01-01T12:00:00.000000Z"
    }
]

def get_mock_event(event_id=None, **kwargs):
    """Get a mock event with optional overrides"""
    event = MOCK_EVENT.copy()
    if event_id:
        event["id"] = event_id
        event["eventID"] = event_id
    event.update(kwargs)
    return event

def get_mock_issue(issue_id=None, **kwargs):
    """Get a mock issue with optional overrides"""
    issue = MOCK_ISSUE.copy()
    if issue_id:
        issue["id"] = issue_id
    issue.update(kwargs)
    return issue

def get_mock_error(status_code=404, message=None):
    """Get a mock error response"""
    if status_code == 429:
        return MOCK_RATE_LIMIT_RESPONSE.copy()
    return {"detail": message or MOCK_ERROR_RESPONSE["detail"]}
