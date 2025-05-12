# [API Endpoint Name]

**URL:** `/api/[path]`  
**Method:** `[HTTP Method]`  
**Auth required:** Yes/No  

## Description

[Detailed description of what this endpoint does]

## Parameters

| Name | Type | In | Required | Description |
|------|------|----|----|-------------|
| param1 | string | path | Yes | Description of parameter |
| param2 | integer | query | No | Description of parameter |

## Request Body

```json
{
  "property1": "value1",
  "property2": "value2"
}
```

## Success Response

**Code:** 200 OK  
**Content:**

```json
{
  "id": 1,
  "name": "Example",
  "created_at": "2024-05-12T12:00:00Z"
}
```

## Error Responses

**Code:** 400 BAD REQUEST  
**Content:**

```json
{
  "error": "Invalid parameters",
  "details": "Parameter X must be Y"
}
```

**Code:** 404 NOT FOUND  
**Content:**

```json
{
  "error": "Resource not found"
}
```

## Implementation Status

- [x] Backend implementation complete
- [ ] Frontend integration complete
- [ ] Tests written
- [ ] Documentation complete

## Last Updated

YYYY-MM-DD
