from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import random
import uvicorn

app = FastAPI(title="Dexter Mock-up API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock data models
class Issue(BaseModel):
    id: str
    title: str
    culprit: str
    level: str
    platform: str
    count: int
    userCount: int
    firstSeen: datetime
    lastSeen: datetime
    status: str
    project: Dict[str, Any]

class Event(BaseModel):
    id: str
    eventID: str
    title: str
    message: str
    platform: str
    dateReceived: datetime
    tags: List[Dict[str, str]]
    contexts: Dict[str, Any]
    entries: List[Dict[str, Any]]

class AIResponse(BaseModel):
    explanation: str
    model: str
    confidence: float

# Mock data
MOCK_ISSUES = [
    {
        "id": "1",
        "title": "TypeError: Cannot read property 'map' of undefined",
        "culprit": "app/components/UserList.tsx",
        "level": "error",
        "platform": "javascript",
        "count": 234,
        "userCount": 45,
        "firstSeen": "2024-01-15T10:30:00Z",
        "lastSeen": "2024-01-20T15:45:00Z",
        "status": "unresolved",
        "project": {"id": "1", "name": "frontend-app", "slug": "frontend-app"}
    },
    {
        "id": "2",
        "title": "DatabaseError: deadlock detected",
        "culprit": "backend/services/order_service.py",
        "level": "error",
        "platform": "python",
        "count": 89,
        "userCount": 12,
        "firstSeen": "2024-01-18T08:15:00Z",
        "lastSeen": "2024-01-20T14:30:00Z",
        "status": "unresolved",
        "project": {"id": "2", "name": "backend-api", "slug": "backend-api"}
    },
    {
        "id": "3",
        "title": "N+1 Query detected in ProductList",
        "culprit": "backend/views/product_views.py",
        "level": "warning",
        "platform": "python",
        "count": 1567,
        "userCount": 234,
        "firstSeen": "2024-01-10T12:00:00Z",
        "lastSeen": "2024-01-20T16:00:00Z",
        "status": "unresolved",
        "project": {"id": "2", "name": "backend-api", "slug": "backend-api"}
    }
]

MOCK_EVENTS = {
    "1": {
        "id": "1",
        "eventID": "event-123",
        "title": "TypeError: Cannot read property 'map' of undefined",
        "message": "Attempted to map over undefined value",
        "platform": "javascript",
        "dateReceived": "2024-01-20T15:45:00Z",
        "tags": [
            {"key": "browser", "value": "Chrome 120"},
            {"key": "environment", "value": "production"}
        ],
        "contexts": {
            "browser": {"name": "Chrome", "version": "120"},
            "os": {"name": "Windows", "version": "10"}
        },
        "entries": [
            {
                "type": "exception",
                "data": {
                    "values": [{
                        "type": "TypeError",
                        "value": "Cannot read property 'map' of undefined",
                        "stacktrace": {
                            "frames": [
                                {
                                    "filename": "app/components/UserList.tsx",
                                    "function": "UserList",
                                    "lineno": 45,
                                    "colno": 23
                                }
                            ]
                        }
                    }]
                }
            }
        ]
    }
}

# API endpoints
@app.get("/")
async def root():
    return {"message": "Dexter Mock-up API", "version": "1.0.0"}

@app.get("/api/issues", response_model=List[Issue])
async def get_issues(
    project: Optional[str] = None,
    status: Optional[str] = None,
    level: Optional[str] = None
):
    issues = MOCK_ISSUES
    
    if project:
        issues = [i for i in issues if i["project"]["slug"] == project]
    if status:
        issues = [i for i in issues if i["status"] == status]
    if level:
        issues = [i for i in issues if i["level"] == level]
    
    return issues

@app.get("/api/issues/{issue_id}")
async def get_issue(issue_id: str):
    for issue in MOCK_ISSUES:
        if issue["id"] == issue_id:
            return issue
    raise HTTPException(status_code=404, detail="Issue not found")

@app.get("/api/issues/{issue_id}/events")
async def get_issue_events(issue_id: str):
    if issue_id in MOCK_EVENTS:
        return [MOCK_EVENTS[issue_id]]
    return []

@app.post("/api/ai/explain")
async def explain_error(error_data: Dict[str, Any]):
    # Mock AI response
    error_type = error_data.get("type", "Unknown")
    message = error_data.get("message", "No message provided")
    
    explanations = {
        "TypeError": f"This TypeError occurs when trying to access a property on an undefined value. The error '{message}' suggests that you're attempting to use the 'map' method on a variable that is undefined. This commonly happens when: 1) Data hasn't loaded yet from an API, 2) The expected array property doesn't exist, or 3) There's a typo in the property name.",
        "DatabaseError": f"A database deadlock occurs when two or more transactions are waiting for each other to release locks. The error '{message}' indicates concurrent transactions are trying to access the same resources in different orders. Consider: 1) Acquiring locks in a consistent order, 2) Using shorter transactions, or 3) Implementing retry logic.",
        "N+1 Query": f"An N+1 query problem occurs when your code executes 1 query to fetch a list of items, then N additional queries to fetch related data for each item. This causes performance issues as the number of items grows. Use eager loading with 'select_related' or 'prefetch_related' in Django, or similar techniques in your ORM."
    }
    
    error_key = next((k for k in explanations.keys() if k in error_type), "Unknown")
    
    return AIResponse(
        explanation=explanations.get(error_key, f"Error analysis for '{message}': This error requires further investigation. Check the stack trace and recent code changes."),
        model="mock-llm",
        confidence=0.85
    )

@app.get("/api/config")
async def get_config():
    return {
        "sentry": {
            "organization": "mock-org",
            "project": "mock-project"
        },
        "ai": {
            "provider": "mock",
            "model": "mock-llm",
            "available_models": ["mock-llm", "mock-gpt", "mock-claude"]
        }
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "database": "healthy",
            "cache": "healthy",
            "ai": "healthy"
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)