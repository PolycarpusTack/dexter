import os
import asyncio
import pytest
from fastapi.testclient import TestClient
from pydantic import BaseModel
from typing import Dict, List, Any, Optional, Union

# Import app and API config service
from app.main import app
from app.services.api_config_service import ApiConfigService

# Create test client
client = TestClient(app)

class EndpointTestResult(BaseModel):
    """Results of an endpoint test"""
    endpoint: str
    method: str
    path_params: Dict[str, str]
    query_params: Dict[str, Any]
    expected_status: int
    actual_status: Optional[int] = None
    response: Optional[Dict[str, Any]] = None
    success: bool = False
    error_message: Optional[str] = None

class ApiTestHarness:
    """Test harness for API endpoint verification"""
    
    def __init__(self):
        self.api_config = ApiConfigService()
        self.results: List[EndpointTestResult] = []
        
    async def test_endpoint(
        self,
        endpoint_key: str,
        method: str = "GET",
        path_params: Dict[str, str] = None,
        query_params: Dict[str, Any] = None,
        expected_status: int = 200,
        request_body: Dict[str, Any] = None
    ) -> EndpointTestResult:
        """Test a specific API endpoint"""
        path_params = path_params or {}
        query_params = query_params or {}
        
        # Resolve the endpoint path
        try:
            endpoint_path = self.api_config.resolve_path(endpoint_key, path_params)
        except Exception as e:
            return EndpointTestResult(
                endpoint=endpoint_key,
                method=method,
                path_params=path_params,
                query_params=query_params,
                expected_status=expected_status,
                success=False,
                error_message=f"Path resolution error: {str(e)}"
            )
        
        # Make the request
        try:
            response = None
            if method.upper() == "GET":
                response = client.get(endpoint_path, params=query_params)
            elif method.upper() == "POST":
                response = client.post(endpoint_path, params=query_params, json=request_body)
            elif method.upper() == "PUT":
                response = client.put(endpoint_path, params=query_params, json=request_body)
            elif method.upper() == "DELETE":
                response = client.delete(endpoint_path, params=query_params)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            # Check response
            result = EndpointTestResult(
                endpoint=endpoint_key,
                method=method,
                path_params=path_params,
                query_params=query_params,
                expected_status=expected_status,
                actual_status=response.status_code,
                response=response.json() if response.status_code < 500 else None,
                success=response.status_code == expected_status
            )
            
            if response.status_code != expected_status:
                result.error_message = f"Expected status {expected_status}, got {response.status_code}"
            
            self.results.append(result)
            return result
            
        except Exception as e:
            result = EndpointTestResult(
                endpoint=endpoint_key,
                method=method,
                path_params=path_params,
                query_params=query_params,
                expected_status=expected_status,
                success=False,
                error_message=f"Request error: {str(e)}"
            )
            self.results.append(result)
            return result
    
    async def test_all_endpoints(self) -> List[EndpointTestResult]:
        """Test all defined endpoints with default parameters"""
        # Get all endpoint configs
        all_endpoints = self.api_config.get_all_endpoints()
        
        for category, endpoints in all_endpoints.items():
            for endpoint_key, config in endpoints.items():
                # Generate test parameters based on path template
                path_params = {}
                for param in self._extract_path_params(config.get("backend_path", "")):
                    # Use placeholder values for testing
                    if param == "org":
                        path_params[param] = "test-org"
                    elif param == "project":
                        path_params[param] = "test-project"
                    elif param == "id":
                        path_params[param] = "1234"
                    else:
                        path_params[param] = f"test-{param}"
                
                # Run the test
                await self.test_endpoint(
                    endpoint_key=f"{category}.{endpoint_key}",
                    path_params=path_params
                )
        
        return self.results
    
    def _extract_path_params(self, path_template: str) -> List[str]:
        """Extract path parameters from a path template"""
        params = []
        parts = path_template.split("/")
        for part in parts:
            if part.startswith("{") and part.endswith("}"):
                param_name = part[1:-1]
                params.append(param_name)
        return params
    
    def generate_report(self) -> str:
        """Generate a report of test results"""
        success_count = sum(1 for r in self.results if r.success)
        total_count = len(self.results)
        
        report = [
            f"API Endpoint Test Report",
            f"=====================",
            f"Success: {success_count}/{total_count} ({success_count/total_count*100:.1f}%)",
            f"",
            f"Failed Endpoints:",
        ]
        
        for result in sorted([r for r in self.results if not r.success], key=lambda x: x.endpoint):
            report.append(f"- {result.method} {result.endpoint}")
            report.append(f"  Path params: {result.path_params}")
            report.append(f"  Status: Expected {result.expected_status}, got {result.actual_status}")
            report.append(f"  Error: {result.error_message}")
            report.append("")
        
        return "\n".join(report)

@pytest.fixture
def test_harness():
    return ApiTestHarness()

@pytest.mark.asyncio
async def test_path_resolution(test_harness):
    """Test that all API paths can be resolved correctly"""
    api_config = test_harness.api_config
    all_endpoints = api_config.get_all_endpoints()
    
    for category, endpoints in all_endpoints.items():
        for endpoint_key, config in endpoints.items():
            # Generate test parameters
            path_params = {}
            for param in test_harness._extract_path_params(config.get("backend_path", "")):
                path_params[param] = f"test-{param}"
            
            # Try to resolve the path
            full_key = f"{category}.{endpoint_key}"
            try:
                path = api_config.resolve_path(full_key, path_params)
                assert path, f"Path resolution failed for {full_key}"
                print(f"✓ {full_key} -> {path}")
            except Exception as e:
                pytest.fail(f"Path resolution failed for {full_key}: {str(e)}")

if __name__ == "__main__":
    # Run the test harness directly
    async def main():
        harness = ApiTestHarness()
        await harness.test_all_endpoints()
        print(harness.generate_report())
    
    asyncio.run(main())
