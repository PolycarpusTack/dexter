#!/bin/bash

echo "Testing backend endpoints..."

# Test basic health endpoint
echo -e "\n1. Testing /health endpoint:"
curl -X GET http://localhost:8000/health

# Test root endpoint
echo -e "\n\n2. Testing / endpoint:"
curl -X GET http://localhost:8000/

# Test API v1 config endpoint
echo -e "\n\n3. Testing /api/v1/config endpoint:"
curl -X GET http://localhost:8000/api/v1/config -H "Origin: http://localhost:5175"

# Test API v1 status endpoint
echo -e "\n\n4. Testing /api/v1/config/status endpoint:"
curl -X GET http://localhost:8000/api/v1/config/status -H "Origin: http://localhost:5175"

# Test API v1 ai models endpoint
echo -e "\n\n5. Testing /api/v1/ai/models endpoint:"
curl -X GET http://localhost:8000/api/v1/ai/models -H "Origin: http://localhost:5175"

# Test diagnostics endpoint
echo -e "\n\n6. Testing /api/v1/diagnostics/errors endpoint:"
curl -X GET http://localhost:8000/api/v1/diagnostics/errors

echo -e "\n\nDone!"