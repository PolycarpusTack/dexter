"""
Discover API router for enhanced Sentry data exploration
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, validator
import logging
from datetime import datetime
import uuid

from app.services.discover_service import get_discover_service, DiscoverService
from app.core.config import settings
from app.models.auth import User
from app.dependencies import get_current_user

router = APIRouter(prefix="/discover", tags=["discover"])
logger = logging.getLogger(__name__)


class DiscoverField(BaseModel):
    field: str
    alias: Optional[str] = None


class DiscoverQuery(BaseModel):
    fields: List[DiscoverField] = Field(..., min_items=1)
    query: Optional[str] = ""
    orderby: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    statsPeriod: Optional[str] = None
    environment: Optional[List[str]] = None
    project: Optional[List[int]] = None
    limit: Optional[int] = Field(default=50, ge=1, le=100)
    
    @validator('fields')
    def validate_fields(cls, v):
        if len(v) > 20:
            raise ValueError("Maximum 20 fields allowed per query")
        return v
    
    @validator('query')
    def validate_query(cls, v):
        # Basic query validation - Sentry will do full validation
        if v and len(v) > 1000:
            raise ValueError("Query too long (max 1000 characters)")
        return v


class SavedQuery(BaseModel):
    name: str
    description: Optional[str] = None
    query: DiscoverQuery
    isPublic: bool = False
    tags: Optional[List[str]] = None


class NaturalLanguageQuery(BaseModel):
    query: str = Field(..., min_length=3, max_length=500)
    context: Optional[Dict[str, Any]] = None


@router.post("/query")
async def execute_discover_query(
    query: DiscoverQuery,
    current_user: User = Depends(get_current_user),
    discover_service: DiscoverService = Depends(get_discover_service)
) -> Dict[str, Any]:
    """
    Execute a Discover query against Sentry's API
    """
    try:
        # Validate query
        discover_service.validate_query(query.dict())
        
        # Convert fields to Sentry format
        field_strings = []
        for field in query.fields:
            if field.alias:
                field_strings.append(f"{field.field} as {field.alias}")
            else:
                field_strings.append(field.field)
        
        # Build query parameters
        params = {
            "field": field_strings,
            "per_page": query.limit
        }
        
        if query.query:
            params["query"] = query.query
        if query.orderby:
            params["sort"] = query.orderby
        if query.start:
            params["start"] = query.start
        if query.end:
            params["end"] = query.end
        if query.statsPeriod:
            params["statsPeriod"] = query.statsPeriod
        if query.environment:
            params["environment"] = query.environment
        if query.project:
            params["project"] = query.project
            
        # Get Sentry organization from settings
        org_slug = settings.SENTRY_ORG or settings.organization_slug
        if not org_slug:
            raise HTTPException(
                status_code=400,
                detail="No Sentry organization configured. Please set SENTRY_ORG environment variable."
            )
            
        # Execute query
        result = await discover_service.execute_query(
            organization_slug=org_slug,
            query_params=params
        )
        
        # Enhance result with metadata
        return {
            "data": result.get("data", []),
            "meta": result.get("meta", {}),
            "query": query.dict(),
            "executedAt": datetime.utcnow().isoformat(),
            "_pagination": result.get("_pagination", None)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing discover query: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute query: {str(e)}"
        )


@router.post("/natural-language")
async def convert_natural_language_query(
    nl_query: NaturalLanguageQuery,
    current_user: User = Depends(get_current_user),
    discover_service: DiscoverService = Depends(get_discover_service)
) -> DiscoverQuery:
    """
    Convert a natural language query to a Discover query
    """
    try:
        # Use LLM service to convert natural language to Discover query
        from app.services.llm_service import get_llm_service
        llm_service = get_llm_service()
        
        prompt = f"""
        Convert the following natural language query to a Sentry Discover query format:
        
        User Query: {nl_query.query}
        
        Context: {nl_query.context or 'No additional context provided'}
        
        Return a JSON object with:
        - fields: array of field objects with 'field' and optional 'alias'
        - query: the filter query string
        - orderby: optional sort field
        - statsPeriod: optional time period (e.g., "24h", "7d")
        
        Example fields:
        - count()
        - count_unique(user)
        - p95(transaction.duration)
        - failure_rate()
        
        Only return valid JSON that matches the DiscoverQuery schema.
        """
        
        response = await llm_service.get_completion(prompt)
        
        # Parse and validate the response
        import json
        query_dict = json.loads(response)
        discover_query = DiscoverQuery(**query_dict)
        
        return discover_query
        
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Failed to parse LLM response as valid query"
        )
    except Exception as e:
        logger.error(f"Error converting natural language query: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to convert query: {str(e)}"
        )


@router.get("/fields")
async def get_available_fields(
    partial: str = "",
    current_user: User = Depends(get_current_user),
    discover_service: DiscoverService = Depends(get_discover_service)
) -> List[Dict[str, Any]]:
    """
    Get list of available fields for Discover queries
    """
    try:
        # Get field suggestions from service
        fields = discover_service.get_field_suggestions(partial)
        return fields
        
    except Exception as e:
        logger.error(f"Error getting available fields: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get fields: {str(e)}"
        )


@router.get("/examples")
async def get_query_examples(
    current_user: User = Depends(get_current_user),
    discover_service: DiscoverService = Depends(get_discover_service)
) -> List[Dict[str, Any]]:
    """
    Get example queries for user guidance
    """
    try:
        return discover_service.get_query_examples()
    except Exception as e:
        logger.error(f"Error getting query examples: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get examples: {str(e)}"
        )


@router.post("/saved-queries")
async def save_query(
    saved_query: SavedQuery,
    current_user: User = Depends(get_current_user),
    discover_service: DiscoverService = Depends(get_discover_service)
) -> Dict[str, Any]:
    """
    Save a Discover query for later use
    """
    try:
        # Validate query
        discover_service.validate_query(saved_query.query.dict())
        
        # In a real implementation, this would save to a database
        # For now, we'll return a mock response
        return {
            "id": "query_" + str(uuid.uuid4()),
            "name": saved_query.name,
            "description": saved_query.description,
            "query": saved_query.query.dict(),
            "isPublic": saved_query.isPublic,
            "tags": saved_query.tags,
            "createdBy": current_user.username,
            "createdAt": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error saving query: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save query: {str(e)}"
        )


@router.get("/saved-queries")
async def get_saved_queries(
    is_public: Optional[bool] = None,
    tags: Optional[List[str]] = Query(None),
    current_user: User = Depends(get_current_user),
    discover_service: DiscoverService = Depends(get_discover_service)
) -> List[Dict[str, Any]]:
    """
    Get saved Discover queries
    """
    try:
        # Get Sentry organization from settings
        org_slug = settings.SENTRY_ORG or settings.organization_slug
        if not org_slug:
            # Just return empty list if no organization is configured
            return []
            
        # In a real implementation, this would query the database
        # For now, get from Sentry if available
        sentry_queries = await discover_service.get_saved_queries(org_slug)
        
        # Also include some mock queries for demo
        mock_queries = [
            {
                "id": "query_1",
                "name": "Slow Transactions",
                "description": "Find transactions slower than 1 second",
                "query": {
                    "fields": [
                        {"field": "transaction", "alias": None},
                        {"field": "p95(transaction.duration)", "alias": "p95_duration"},
                        {"field": "count()", "alias": None}
                    ],
                    "query": "transaction.duration:>1s",
                    "orderby": "-p95_duration",
                    "statsPeriod": "24h"
                },
                "isPublic": True,
                "tags": ["performance", "monitoring"],
                "createdBy": "admin",
                "createdAt": "2024-01-01T00:00:00Z",
                "updatedAt": "2024-01-01T00:00:00Z"
            }
        ]
        
        # Combine Sentry queries with mock queries
        all_queries = sentry_queries + mock_queries
        
        # Filter based on parameters
        filtered_queries = all_queries
        
        if is_public is not None:
            filtered_queries = [q for q in filtered_queries if q.get("isPublic") == is_public]
            
        if tags:
            filtered_queries = [
                q for q in filtered_queries 
                if any(tag in q.get("tags", []) for tag in tags)
            ]
            
        return filtered_queries
        
    except Exception as e:
        logger.error(f"Error getting saved queries: {str(e)}")
        # Return mock queries on error
        return []


@router.get("/syntax-help")
async def get_query_syntax_help() -> Dict[str, Any]:
    """
    Get help documentation for Discover query syntax
    """
    return {
        "operators": {
            "comparison": {
                ":": "equals",
                "!:": "does not equal",
                ":>": "greater than",
                ":<": "less than",
                ":>=": "greater than or equal to",
                ":<=": "less than or equal to"
            },
            "text": {
                ":": "contains",
                "!:": "does not contain",
                ":*": "starts with",
                ":$": "ends with"
            },
            "logical": {
                "AND": "Both conditions must be true",
                "OR": "Either condition must be true",
                "NOT": "Negates the condition"
            }
        },
        "examples": [
            {
                "description": "Find errors in production",
                "query": "environment:production level:error"
            },
            {
                "description": "Find slow transactions",
                "query": "transaction.duration:>1000"
            },
            {
                "description": "Find issues affecting specific user",
                "query": "user.email:user@example.com"
            },
            {
                "description": "Find recent errors",
                "query": "timestamp:>2024-01-01 level:error"
            }
        ],
        "functions": {
            "aggregation": [
                "count()",
                "count_unique(field)",
                "avg(field)",
                "sum(field)",
                "max(field)",
                "min(field)"
            ],
            "percentiles": [
                "p50(field)",
                "p75(field)",
                "p95(field)",
                "p99(field)",
                "p100(field)"
            ],
            "special": [
                "failure_rate()",
                "apdex(threshold)",
                "impact()"
            ]
        },
        "timeRanges": {
            "relative": [
                "1h - Last hour",
                "24h - Last 24 hours",
                "7d - Last 7 days",
                "14d - Last 14 days",
                "30d - Last 30 days",
                "90d - Last 90 days"
            ],
            "absolute": "ISO 8601 format: YYYY-MM-DDTHH:mm:ss"
        }
    }
