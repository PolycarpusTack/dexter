import api from '../utils/api';

export interface DiscoverQuery {
  fields: Array<{
    field: string;
    alias?: string;
  }>;
  query?: string;
  orderby?: string;
  start?: string;
  end?: string;
  statsPeriod?: string;
  environment?: string[];
  project?: number[];
  limit?: number;
}

export interface QueryResult {
  data: any[];
  meta: {
    fields: Record<string, string>;
    units: Record<string, string>;
  };
  query: any;
  executedAt: string;
  _pagination?: {
    next?: { cursor: string; url: string };
    previous?: { cursor: string; url: string };
  };
}

export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  query: DiscoverQuery;
  isPublic: boolean;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const discoverApi = {
  // Execute a Discover query
  executeQuery: async (query: DiscoverQuery): Promise<QueryResult> => {
    const response = await api.post('/api/discover/query', query);
    return response.data;
  },

  // Convert natural language to Discover query
  convertNaturalLanguage: async (naturalQuery: {
    query: string;
    context?: any;
  }): Promise<DiscoverQuery> => {
    const response = await api.post('/api/discover/natural-language', naturalQuery);
    return response.data;
  },

  // Get available fields
  getFields: async (partial?: string): Promise<any[]> => {
    const params = partial ? { partial } : {};
    const response = await api.get('/api/discover/fields', { params });
    return response.data;
  },

  // Get query examples
  getExamples: async (): Promise<any[]> => {
    const response = await api.get('/api/discover/examples');
    return response.data;
  },

  // Save a query
  saveQuery: async (savedQuery: Omit<SavedQuery, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<SavedQuery> => {
    const response = await api.post('/api/discover/saved-queries', savedQuery);
    return response.data;
  },

  // Get saved queries
  getSavedQueries: async (filters?: {
    isPublic?: boolean;
    tags?: string[];
  }): Promise<SavedQuery[]> => {
    const response = await api.get('/api/discover/saved-queries', { params: filters });
    return response.data;
  },

  // Get query syntax help
  getSyntaxHelp: async (): Promise<any> => {
    const response = await api.get('/api/discover/syntax-help');
    return response.data;
  },
};

export default discoverApi;
