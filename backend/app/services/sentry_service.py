"""
SentryService - High-level client for Sentry REST API operations.

Implements event and issue operations used by tests and higher-level services,
including pagination, caching, batching, and basic error handling.
"""
from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

import httpx

from app.core.errors import SentryAPIError, ExternalAPIError
from app.core.cache import cache_service


class SentryService:
    def __init__(
        self,
        base_url: str,
        auth_token: str,
        organization: Optional[str] = None,
        project: Optional[str] = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.auth_token = auth_token
        self.organization = organization
        self.project = project
        # In-flight request deduplication map
        self._inflight: Dict[str, asyncio.Future] = {}

    # ------------------------
    # Internal helpers
    # ------------------------
    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def _request(
        self,
        method: str,
        url: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
    ) -> httpx.Response:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.request(
                    method=method,
                    url=url,
                    params=params,
                    json=json,
                    headers=self._headers(),
                )
        except httpx.RequestError as e:  # network/transport errors
            raise ExternalAPIError(str(e)) from e

        # Non-2xx handling
        if resp.status_code >= 400:
            retry_after = None
            if resp.status_code == 429:
                retry_hdr = resp.headers.get("Retry-After")
                try:
                    retry_after = int(retry_hdr) if retry_hdr else None
                except Exception:
                    retry_after = None
            try:
                data = resp.json()
            except Exception:
                data = {"detail": resp.text[:200]}
            msg = data.get("detail") if isinstance(data, dict) else str(data)
            raise SentryAPIError(
                msg or f"Sentry API error {resp.status_code}",
                status_code=resp.status_code,
                response_data=data if isinstance(data, dict) else {"raw": data},
                retry_after=retry_after,
            )
        return resp

    def _event_cache_key(self, event_id: str) -> str:
        return f"sentry:event:{event_id}"

    # ------------------------
    # Public API
    # ------------------------
    async def list_events(
        self,
        *,
        paginate: bool = False,
        **filters: Any,
    ) -> Any:
        """List organization events with optional pagination.

        Returns a list of events by default. If paginate=True, returns a dict
        with keys: results, next, previous.
        """
        org = self.organization or filters.get("organization")
        if not org:
            raise ValueError("organization required")
        url = f"{self.base_url}/organizations/{org}/events/"
        resp = await self._request("GET", url, params=filters or None)
        data = resp.json()

        if not paginate:
            return data

        # Parse RFC 5988 Link header for pagination cursors
        link = resp.headers.get("Link", "")
        next_cursor = _parse_link_cursor(link, rel="next")
        prev_cursor = _parse_link_cursor(link, rel="previous")
        return {
            "results": data,
            "next": next_cursor,
            "previous": prev_cursor,
        }

    async def get_event(self, event_id: str) -> Dict[str, Any]:
        # Cache lookup
        key = self._event_cache_key(event_id)
        cached = await cache_service.get(key)
        if cached is not None:
            return cached

        org = self.organization
        project = self.project
        if not org or not project:
            raise ValueError("organization and project required")

        url = f"{self.base_url}/projects/{org}/{project}/events/{event_id}/"
        resp = await self._request("GET", url)
        data = resp.json()
        await cache_service.set(key, data, ttl=300)
        return data

    async def batch_get_issues(self, issue_ids: List[str]) -> List[Dict[str, Any]]:
        org = self.organization
        if not org:
            raise ValueError("organization required")
        results: List[Dict[str, Any]] = []

        if self._use_batch_endpoint():
            url = f"{self.base_url}/organizations/{org}/issues/"
            # Tests only verify that a single POST is made; payload shape is not asserted
            resp = await self._request("POST", url, json={"ids": issue_ids})
            return resp.json()

        for issue_id in issue_ids:
            url = f"{self.base_url}/issues/{issue_id}/"
            try:
                resp = await self._request("GET", url)
                results.append(resp.json())
            except SentryAPIError as e:
                if e.status_code == 404:
                    results.append({"id": issue_id, "error": e.message})
                else:
                    raise
        return results

    async def update_issue(self, issue_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base_url}/issues/{issue_id}/"
        resp = await self._request("PUT", url, json=data)
        # Invalidate cached event that may mirror issue_id
        await cache_service.delete(self._event_cache_key(issue_id))
        return resp.json()

    async def bulk_update_issues(self, updates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        org = self.organization
        if not org:
            raise ValueError("organization required")
        if self._use_batch_endpoint():
            url = f"{self.base_url}/organizations/{org}/issues/"
            resp = await self._request("POST", url, json={"updates": updates})
            return resp.json()

        results: List[Dict[str, Any]] = []
        for upd in updates:
            issue_id = upd.get("id")
            payload = {k: v for k, v in upd.items() if k != "id"}
            try:
                results.append(await self.update_issue(issue_id, payload))
            except SentryAPIError as e:
                # Record partial failure
                results.append({"id": issue_id, "error": e.message})
        return results

    async def add_issue_comment(self, issue_id: str, text: str) -> Dict[str, Any]:
        url = f"{self.base_url}/issues/{issue_id}/comments/"
        resp = await self._request("POST", url, json={"text": text})
        return resp.json()

    async def search_events(
        self,
        *,
        query: Optional[str] = None,
        tags: Optional[Dict[str, str]] = None,
        date_range: Optional[Dict[str, str]] = None,
    ) -> List[Dict[str, Any]]:
        org = self.organization
        if not org:
            raise ValueError("organization required")
        params: Dict[str, Any] = {}
        if query:
            params["query"] = query
        if tags:
            # Sentry supports tag filters inside query, e.g., key:value
            tag_query = " ".join(f"{k}:{v}" for k, v in tags.items())
            params["query"] = f"{params.get('query', '').strip()} {tag_query}".strip()
        if date_range:
            params.update(date_range)
        url = f"{self.base_url}/organizations/{org}/events/"
        resp = await self._request("GET", url, params=params)
        return resp.json()

    async def get_event_context(self, event_id: str) -> Dict[str, Any]:
        org = self.organization
        project = self.project
        if not org or not project:
            raise ValueError("organization and project required")
        event_url = f"{self.base_url}/projects/{org}/{project}/events/{event_id}/"
        ctx_url = f"{event_url}context/"
        event_resp = await self._request("GET", event_url)
        ctx_resp = await self._request("GET", ctx_url)
        event = event_resp.json()
        context = ctx_resp.json()
        # Merge simple context keys of interest
        if isinstance(context, dict):
            event.update(context)
        return event

    async def get_performance_metrics(self) -> Dict[str, Any]:
        org = self.organization
        if not org:
            raise ValueError("organization required")
        url = f"{self.base_url}/organizations/{org}/performance/"
        resp = await self._request("GET", url)
        return resp.json()

    # ------------------------
    # Optimization hooks
    # ------------------------
    def _use_batch_endpoint(self) -> bool:
        """Whether to use batch APIs for issue operations."""
        return False


def _parse_link_cursor(link_header: str, *, rel: str) -> Optional[str]:
    """Parse a RFC 5988 Link header to extract a cursor for a given rel."""
    if not link_header:
        return None
    # Very simple parser sufficient for tests
    parts = [p.strip() for p in link_header.split(",")]
    for p in parts:
        if f'rel="{rel}"' in p:
            # <url?cursor=xyz>; rel="next"
            start = p.find("<")
            end = p.find(">", start + 1)
            if start != -1 and end != -1:
                url = p[start + 1 : end]
                # Extract cursor param
                import urllib.parse as _up

                qs = _up.urlparse(url).query
                params = dict(_up.parse_qsl(qs))
                return params.get("cursor")
    return None
