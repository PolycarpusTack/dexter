import axios, { AxiosResponse } from 'axios';
import { config } from '../config';

// Base API configuration
const BASE_URL = config.API_BASE_URL || 'http://localhost:8000';
const DISCOVER_BASE_URL = `${BASE_URL}/api/v1/discover`;

// Types for Discover queries
export interface DiscoverQueryRequest {
  name?: string;
  projects?: number[];
  environments?: string[];
  fields: string[];
  query?: string;
  orderby?: string;
  yAxis?: string | string[];
  start?: string;
  end?: string;
  statsPeriod?: string;
  interval?: string;
  limit?: number;
  sort?: string;
  topEvents?: number;
}

export interface SavedQuery {
  id?: string;
  name: string;
  query: DiscoverQueryRequest;
  description?: string;
  dateCreated?: string;
  dateUpdated?: string;
  createdBy?: Record<string, any>;
  projects?: number[];
  version?: number;
  queryDataset?: string;
}

export interface DiscoverTableResult {
  data: Array<Record<string, any>>;
  meta: {
    fields: Record<string, string>;
    units?: Record<string, string>;
  };
}

export interface DiscoverTimeseriesResult {
  intervals: string[];
  groups: Array<{
    by: Record<string, any>;
    totals: Record<string, number>;
    series: Record<string, Array<[number, number]>>;
  }>;
}

export interface NaturalLanguageQueryRequest {
  text: string;
  context?: Record<string, any>;
}

export interface FieldDefinition {
  field: string;
  type: string;
  description: string;
}

export interface FunctionDefinition {
  name: string;
  parameters: string[];
  description: string;
}

// Error response interface
interface ErrorResponse {
  detail: string;
}

// API client
class DiscoverApi {
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  }

  async executeQuery(request: DiscoverQueryRequest): Promise<DiscoverTableResult> {
    try {
      const response: AxiosResponse<DiscoverTableResult> = await axios.post(
        `${DISCOVER_BASE_URL}/query`,
        request,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as ErrorResponse;
        throw new Error(errorData.detail || 'Failed to execute query');
      }
      throw error;
    }
  }

  async executeTimeseries(request: DiscoverQueryRequest): Promise<DiscoverTimeseriesResult> {
    try {
      const response: AxiosResponse<DiscoverTimeseriesResult> = await axios.post(
        `${DISCOVER_BASE_URL}/query/timeseries`,
        request,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as ErrorResponse;
        throw new Error(errorData.detail || 'Failed to execute timeseries query');
      }
      throw error;
    }
  }

  async listSavedQueries(): Promise<SavedQuery[]> {
    try {
      const response: AxiosResponse<SavedQuery[]> = await axios.get(
        `${DISCOVER_BASE_URL}/saved`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as ErrorResponse;
        throw new Error(errorData.detail || 'Failed to list saved queries');
      }
      throw error;
    }
  }

  async createSavedQuery(query: SavedQuery): Promise<SavedQuery> {
    try {
      const response: AxiosResponse<SavedQuery> = await axios.post(
        `${DISCOVER_BASE_URL}/saved`,
        query,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as ErrorResponse;
        throw new Error(errorData.detail || 'Failed to create saved query');
      }
      throw error;
    }
  }

  async getSavedQuery(queryId: string): Promise<SavedQuery> {
    try {
      const response: AxiosResponse<SavedQuery> = await axios.get(
        `${DISCOVER_BASE_URL}/saved/${queryId}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as ErrorResponse;
        throw new Error(errorData.detail || 'Failed to get saved query');
      }
      throw error;
    }
  }

  async updateSavedQuery(queryId: string, query: SavedQuery): Promise<SavedQuery> {
    try {
      const response: AxiosResponse<SavedQuery> = await axios.put(
        `${DISCOVER_BASE_URL}/saved/${queryId}`,
        query,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as ErrorResponse;
        throw new Error(errorData.detail || 'Failed to update saved query');
      }
      throw error;
    }
  }

  async deleteSavedQuery(queryId: string): Promise<void> {
    try {
      await axios.delete(
        `${DISCOVER_BASE_URL}/saved/${queryId}`,
        { headers: this.getHeaders() }
      );
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as ErrorResponse;
        throw new Error(errorData.detail || 'Failed to delete saved query');
      }
      throw error;
    }
  }

  async convertNaturalLanguage(request: NaturalLanguageQueryRequest): Promise<DiscoverQueryRequest> {
    try {
      const response: AxiosResponse<DiscoverQueryRequest> = await axios.post(
        `${DISCOVER_BASE_URL}/natural-language`,
        request,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as ErrorResponse;
        throw new Error(errorData.detail || 'Failed to convert natural language query');
      }
      throw error;
    }
  }

  async getAvailableFields(dataset: string = 'discover'): Promise<FieldDefinition[]> {
    try {
      const response: AxiosResponse<FieldDefinition[]> = await axios.get(
        `${DISCOVER_BASE_URL}/fields`,
        {
          params: { dataset },
          headers: this.getHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as ErrorResponse;
        throw new Error(errorData.detail || 'Failed to get available fields');
      }
      throw error;
    }
  }

  async getAvailableFunctions(): Promise<FunctionDefinition[]> {
    try {
      const response: AxiosResponse<FunctionDefinition[]> = await axios.get(
        `${DISCOVER_BASE_URL}/functions`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data as ErrorResponse;
        throw new Error(errorData.detail || 'Failed to get available functions');
      }
      throw error;
    }
  }
}

export const discoverApi = new DiscoverApi();
