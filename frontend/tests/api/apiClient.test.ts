// tests/api/apiClient.test.ts

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { apiClient, EnhancedApiClient, createApiClient } from '../../src/api/apiClient';
import retryManager from '../../src/utils/errorHandling/retryManager';
import ErrorFactory from '../../src/utils/errorHandling/errorFactory';
import { logErrorToService } from '../../src/utils/errorHandling/errorTracking';

// Mock dependencies
vi.mock('axios', () => {
  return {
    default: {
      create: vi.fn(() => ({
        interceptors: {
          request: {
            use: vi.fn()
          },
          response: {
            use: vi.fn()
          }
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn()
      }))
    }
  };
});

vi.mock('../../src/utils/errorHandling/retryManager', () => ({
  default: {
    execute: vi.fn()
  }
}));

vi.mock('../../src/utils/errorHandling/errorFactory', () => ({
  default: {
    create: vi.fn((error) => ({
      ...error,
      enhanced: true
    }))
  }
}));

vi.mock('../../src/utils/errorHandling/errorTracking', () => ({
  logErrorToService: vi.fn()
}));

describe('apiClient module', () => {
  let mockAxiosInstance: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Get the mock axios instance created during apiClient instantiation
    mockAxiosInstance = (axios.create as any).mock.results[0].value;
    
    // Setup retryManager.execute mock
    vi.mocked(retryManager.execute).mockImplementation(async (fn) => {
      return fn();
    });
  });
  
  describe('EnhancedApiClient', () => {
    describe('constructor', () => {
      it('should create an axios instance with default config', () => {
        new EnhancedApiClient();
        
        expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
          baseURL: expect.any(String),
          headers: expect.objectContaining({
            'Accept': 'application/json'
          })
        }));
      });
      
      it('should accept custom baseURL and config', () => {
        const customBaseUrl = 'https://api.example.com';
        const customConfig = {
          timeout: 5000,
          headers: {
            'X-Custom-Header': 'value'
          }
        };
        
        new EnhancedApiClient(customBaseUrl, customConfig);
        
        expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
          baseURL: customBaseUrl,
          timeout: 5000,
          headers: expect.objectContaining({
            'X-Custom-Header': 'value',
            'Accept': 'application/json'
          })
        }));
      });
      
      it('should set up request and response interceptors', () => {
        new EnhancedApiClient();
        
        expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
        expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
      });
    });
    
    describe('HTTP methods', () => {
      let client: EnhancedApiClient;
      
      beforeEach(() => {
        client = new EnhancedApiClient();
        
        // Setup default mock implementations for axios methods
        mockAxiosInstance.get.mockResolvedValue({ data: 'get-response' });
        mockAxiosInstance.post.mockResolvedValue({ data: 'post-response' });
        mockAxiosInstance.put.mockResolvedValue({ data: 'put-response' });
        mockAxiosInstance.patch.mockResolvedValue({ data: 'patch-response' });
        mockAxiosInstance.delete.mockResolvedValue({ data: 'delete-response' });
      });
      
      describe('get', () => {
        it('should call axios.get and return the data', async () => {
          const result = await client.get('/test');
          
          expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined);
          expect(retryManager.execute).toHaveBeenCalled();
          expect(result).toBe('get-response');
        });
        
        it('should pass config to axios.get', async () => {
          const config = { params: { id: 123 } };
          await client.get('/test', config);
          
          expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', config);
        });
        
        it('should pass retry config to retryManager.execute', async () => {
          const retryConfig = { maxRetries: 5 };
          await client.get('/test', undefined, retryConfig);
          
          expect(retryManager.execute).toHaveBeenCalledWith(
            expect.any(Function),
            expect.objectContaining(retryConfig)
          );
        });
      });
      
      describe('post', () => {
        it('should call axios.post and return the data', async () => {
          const data = { name: 'test' };
          const result = await client.post('/test', data);
          
          expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', data, undefined);
          expect(retryManager.execute).toHaveBeenCalled();
          expect(result).toBe('post-response');
        });
        
        it('should pass config to axios.post', async () => {
          const data = { name: 'test' };
          const config = { headers: { 'Content-Type': 'application/json' } };
          await client.post('/test', data, config);
          
          expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', data, config);
        });
      });
      
      describe('put', () => {
        it('should call axios.put and return the data', async () => {
          const data = { name: 'test' };
          const result = await client.put('/test', data);
          
          expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test', data, undefined);
          expect(retryManager.execute).toHaveBeenCalled();
          expect(result).toBe('put-response');
        });
      });
      
      describe('patch', () => {
        it('should call axios.patch and return the data', async () => {
          const data = { name: 'test' };
          const result = await client.patch('/test', data);
          
          expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/test', data, undefined);
          expect(retryManager.execute).toHaveBeenCalled();
          expect(result).toBe('patch-response');
        });
      });
      
      describe('delete', () => {
        it('should call axios.delete and return the data', async () => {
          const result = await client.delete('/test');
          
          expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test', undefined);
          expect(retryManager.execute).toHaveBeenCalled();
          expect(result).toBe('delete-response');
        });
      });
    });
    
    describe('error handling', () => {
      let client: EnhancedApiClient;
      let responseInterceptor: (response: any) => any;
      let errorInterceptor: (error: any) => any;
      
      beforeEach(() => {
        // Reset mocks
        mockAxiosInstance.interceptors.response.use.mockReset();
        
        // Create new client to capture the interceptors
        client = new EnhancedApiClient();
        
        // Capture the interceptors
        responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][0];
        errorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      });
      
      it('should pass through successful responses', () => {
        const response = { data: 'success' };
        const result = responseInterceptor(response);
        
        expect(result).toBe(response);
      });
      
      it('should enhance network errors', () => {
        const error = {
          code: 'ERR_NETWORK',
          message: 'Network error',
          config: { url: '/test', method: 'get' }
        };
        
        try {
          errorInterceptor(error);
        } catch (e) {
          // Expected to throw
        }
        
        expect(ErrorFactory.create).toHaveBeenCalledWith(error);
      });
      
      it('should enhance timeout errors', () => {
        const error = {
          code: 'ECONNABORTED',
          message: 'Timeout',
          config: { url: '/test', method: 'get', timeout: 3000 }
        };
        
        try {
          errorInterceptor(error);
        } catch (e) {
          // Expected to throw
        }
        
        expect(ErrorFactory.create).toHaveBeenCalledWith(error);
      });
      
      it('should enhance API errors with response', () => {
        const error = {
          response: {
            status: 404,
            data: { detail: 'Not found' }
          },
          config: { url: '/test', method: 'get' }
        };
        
        try {
          errorInterceptor(error);
        } catch (e) {
          // Expected to throw
        }
        
        expect(ErrorFactory.create).toHaveBeenCalledWith(error);
      });
      
      it('should log server errors to error tracking service', () => {
        const error = {
          response: {
            status: 500,
            data: { detail: 'Server error' }
          },
          config: { url: '/test', method: 'get' }
        };
        
        try {
          errorInterceptor(error);
        } catch (e) {
          // Expected to throw
        }
        
        expect(logErrorToService).toHaveBeenCalledWith(
          expect.objectContaining({ enhanced: true }),
          expect.objectContaining({
            source: 'apiClient',
            url: '/test',
            method: 'get'
          })
        );
      });
      
      it('should not log client errors to error tracking service', () => {
        const error = {
          response: {
            status: 404,
            data: { detail: 'Not found' }
          },
          config: { url: '/test', method: 'get' }
        };
        
        try {
          errorInterceptor(error);
        } catch (e) {
          // Expected to throw
        }
        
        expect(logErrorToService).not.toHaveBeenCalled();
      });
    });
    
    describe('getAxiosInstance', () => {
      it('should return the axios instance', () => {
        const client = new EnhancedApiClient();
        
        expect(client.getAxiosInstance()).toBe(mockAxiosInstance);
      });
    });
  });
  
  describe('createApiClient', () => {
    it('should create a new EnhancedApiClient instance', () => {
      const baseURL = 'https://api.example.com';
      const config = { timeout: 5000 };
      const retryConfig = { maxRetries: 5 };
      
      const client = createApiClient(baseURL, config, retryConfig);
      
      expect(client).toBeInstanceOf(EnhancedApiClient);
      expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
        baseURL,
        timeout: 5000
      }));
    });
  });
  
  describe('default export', () => {
    it('should export a pre-configured apiClient', () => {
      expect(apiClient).toBeDefined();
      expect(apiClient).toBeInstanceOf(EnhancedApiClient);
    });
  });
});
