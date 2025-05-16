#!/bin/bash

echo "Testing backend routes..."

# Test if backend is running
echo -e "\n1. Testing if backend is running:"
curl -s http://localhost:8000/health | jq '.' || echo "Backend not responding"

# Test the debug routes endpoint
echo -e "\n2. Listing all available routes:"
curl -s http://localhost:8000/api/v1/debug/routes | jq '.' || echo "Debug routes not available"

# Test specific endpoints
echo -e "\n3. Testing /api/v1/config:"
curl -s http://localhost:8000/api/v1/config -H "Origin: http://localhost:5175" | jq '.' || echo "Config endpoint not found"

echo -e "\n4. Testing /api/v1/ai/models:"
curl -s http://localhost:8000/api/v1/ai/models -H "Origin: http://localhost:5175" | jq '.' || echo "AI models endpoint not found"

# Test with OPTIONS for CORS
echo -e "\n5. Testing CORS preflight for /api/v1/config:"
curl -X OPTIONS http://localhost:8000/api/v1/config -H "Origin: http://localhost:5175" -H "Access-Control-Request-Method: GET" -v