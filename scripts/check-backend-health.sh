#!/bin/bash

echo "Checking backend health..."

# Test health endpoint
echo -e "\n1. Health Check:"
curl -s http://localhost:8000/health | jq .

# Test config endpoint
echo -e "\n2. Config Endpoint:"
curl -s http://localhost:8000/api/v1/config/config -H "Origin: http://localhost:5175" | jq .

# Test AI models endpoint
echo -e "\n3. AI Models Endpoint:"
curl -s http://localhost:8000/api/v1/ai/models -H "Origin: http://localhost:5175" | jq .

# Test status endpoint
echo -e "\n4. Config Status Endpoint:"
curl -s http://localhost:8000/api/v1/config/status -H "Origin: http://localhost:5175" | jq .