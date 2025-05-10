# Dexter API Flow Architecture

## Current API Flow Diagram

```mermaid
graph TD
    subgraph Frontend
        A[React Components] --> B[API Client Layer]
        B --> C[issuesApi.ts]
        B --> D[eventsApi.ts]
        B --> E[analyticsApi.ts]
        B --> F[deadlockApi.ts]
    end
    
    subgraph Backend
        G[FastAPI Routes]
        H[issues.py]
        I[events.py]
        J[analytics.py]
        K[analyzers.py]
        L[SentryApiClient]
        
        G --> H
        G --> I
        G --> J
        G --> K
        
        H --> L
        I --> L
        J --> L
        K --> L
    end
    
    subgraph Sentry API
        M[/projects/*/issues/]
        N[/issues/*/]
        O[/issues/*/events/]
        P[/projects/*/events/*/]
        Q[/issues/*/stats/]
    end
    
    C --> |GET /api/v1/issues| H
    D --> |GET /api/v1/events| I
    E --> |GET /api/v1/analytics| J
    F --> |POST /api/v1/deadlock| K
    
    L --> M
    L --> N
    L --> O
    L --> P
    L --> Q
    
    style A fill:#e1f5fe
    style G fill:#fff3e0
    style M fill:#e8f5e9
    style N fill:#e8f5e9
    style O fill:#e8f5e9
    style P fill:#e8f5e9
    style Q fill:#fff9c4
```

## API Data Flow Example: Fetching Issues

```mermaid
sequenceDiagram
    participant UI as React UI
    participant API as API Client
    participant BE as Backend Router
    participant SC as SentryClient
    participant Sentry as Sentry API
    
    UI->>API: fetchIssues({status: 'unresolved'})
    API->>BE: GET /api/v1/issues?status=unresolved
    BE->>SC: list_project_issues(query='is:unresolved')
    SC->>Sentry: GET /projects/{org}/{project}/issues/?query=is:unresolved
    Sentry-->>SC: Issues data + pagination
    SC-->>BE: Formatted response
    BE-->>API: {data: issues, pagination: {...}}
    API-->>UI: Rendered issue list
```

## Current Implementation Status

### ✅ Fully Implemented Flows
- Basic issue listing and filtering
- Event details retrieval
- Issue status updates
- Deadlock analysis

### ⚠️ Partially Implemented Flows
- Bulk operations (backend exists, frontend missing)
- Export functionality (backend exists, frontend missing)
- Issue statistics (works but not in Sentry spec)

### ❌ Not Implemented Flows
- Issue assignment
- Issue comments
- Issue tagging
- Issue merging
- Alert rules
- Release management
- Advanced querying (Discover API)

## Proposed Enhanced Architecture

```mermaid
graph TD
    subgraph Enhanced Frontend
        A1[React Components]
        A2[Redux/Zustand Store]
        A3[API Service Layer]
        A4[WebSocket Manager]
        
        A1 --> A2
        A2 --> A3
        A1 --> A4
    end
    
    subgraph Enhanced Backend
        B1[API Gateway]
        B2[Route Handlers]
        B3[Business Logic]
        B4[Sentry Service]
        B5[Cache Layer]
        B6[WebSocket Handler]
        
        B1 --> B2
        B2 --> B3
        B3 --> B4
        B3 --> B5
        B1 --> B6
    end
    
    subgraph Sentry API
        C1[Core APIs]
        C2[Alert APIs]
        C3[Discover API]
        C4[Release APIs]
        C5[Integration APIs]
    end
    
    A3 --> |HTTP/REST| B1
    A4 --> |WebSocket| B6
    B4 --> C1
    B4 --> C2
    B4 --> C3
    B4 --> C4
    B4 --> C5
    
    style A1 fill:#e3f2fd
    style B1 fill:#fff3e0
    style C1 fill:#e8f5e9
```

## API Integration Patterns

### 1. Standard CRUD Pattern
```typescript
// Frontend
const resource = await api.get('/resource/{id}');
const updated = await api.put('/resource/{id}', data);
const created = await api.post('/resource', data);
await api.delete('/resource/{id}');
```

### 2. Bulk Operations Pattern
```typescript
// Frontend
const results = await api.post('/resources/bulk', {
  operation: 'update',
  ids: [1, 2, 3],
  data: { status: 'resolved' }
});
```

### 3. Streaming Data Pattern
```typescript
// Frontend WebSocket
const ws = new WebSocket('ws://api/events');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateStore(data);
};
```

### 4. Paginated Data Pattern
```typescript
// Frontend
const fetchPage = async (cursor) => {
  const response = await api.get('/resources', { cursor });
  return {
    data: response.data,
    nextCursor: response.pagination.next.cursor
  };
};
```

## Error Handling Flow

```mermaid
graph TD
    A[API Request] --> B{Success?}
    B -->|Yes| C[Process Response]
    B -->|No| D{Error Type}
    
    D -->|Network| E[Retry Logic]
    D -->|Auth| F[Refresh Token]
    D -->|Validation| G[Show Form Errors]
    D -->|Server| H[Show Error Modal]
    
    E --> I{Retry Count}
    I -->|< Max| A
    I -->|>= Max| H
    
    F --> J{Token Valid?}
    J -->|Yes| A
    J -->|No| K[Redirect Login]
```

This comprehensive API flow documentation shows the current state and proposed enhancements for Dexter's integration with the Sentry API.
