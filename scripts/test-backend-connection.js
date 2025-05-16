#!/usr/bin/env node

/**
 * Test script to verify backend connection and CORS
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api/v1';

async function testConnection() {
  console.log(`Testing connection to backend at: ${API_BASE_URL}`);
  
  try {
    // Test basic connection
    const response = await axios.get(`${API_BASE_URL}/health`, {
      headers: {
        'Origin': 'http://localhost:5175',
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Backend is reachable');
    console.log('Response:', response.data);
    console.log('Headers:', response.headers);
  } catch (error) {
    console.error('❌ Failed to connect to backend');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
  
  // Test CORS preflight
  try {
    const optionsResponse = await axios.options(`${API_BASE_URL}/config`, {
      headers: {
        'Origin': 'http://localhost:5175',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    console.log('\n✅ CORS preflight successful');
    console.log('CORS headers:', {
      'Access-Control-Allow-Origin': optionsResponse.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': optionsResponse.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': optionsResponse.headers['access-control-allow-headers']
    });
  } catch (error) {
    console.error('\n❌ CORS preflight failed');
    console.error('Error:', error.message);
  }
  
  // Test actual API calls
  try {
    const configResponse = await axios.get(`${API_BASE_URL}/config`, {
      headers: {
        'Origin': 'http://localhost:5175'
      }
    });
    console.log('\n✅ Config endpoint accessible');
    console.log('Config:', configResponse.data);
  } catch (error) {
    console.error('\n❌ Config endpoint failed');
    console.error('Error:', error.message);
  }
  
  try {
    const modelsResponse = await axios.get(`${API_BASE_URL}/ai/models`, {
      headers: {
        'Origin': 'http://localhost:5175'
      }
    });
    console.log('\n✅ AI models endpoint accessible');
    console.log('Models:', modelsResponse.data);
  } catch (error) {
    console.error('\n❌ AI models endpoint failed');
    console.error('Error:', error.message);
  }
}

testConnection();