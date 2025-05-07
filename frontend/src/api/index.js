// File: frontend/src/api/index.js (Review - Ensure errors are thrown)

import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const apiClient = axios.create({ baseURL: API_BASE_URL /* ... headers/timeout */ });

// Ensure functions throw on error or let axios handle it
export const getStatus = async () => {
    try {
        const response = await apiClient.get('/status');
        return response.data;
    } catch (error) {
        console.error("API Error (getStatus):", error.response?.data || error.message);
        throw new Error(error.response?.data?.detail || 'Failed to fetch backend status');
    }
};

export const getConfig = async () => {
    try {
        const response = await apiClient.get('/config');
        return response.data;
    } catch (error) {
        console.error("API Error (getConfig):", error.response?.data || error.message);
        throw new Error(error.response?.data?.detail || 'Failed to fetch configuration');
    }
};

export const updateConfig = async (newConfig) => {
     try {
        const response = await apiClient.put('/config', newConfig);
        return response.data;
    } catch (error) {
        console.error("API Error (updateConfig):", error.response?.data || error.message);
        throw new Error(error.response?.data?.detail || 'Failed to update configuration');
    }
};

export const getIssues = async ({ queryKey }) => {
    // queryKey is standard practice for passing params to queryFn
    // eslint-disable-next-line no-unused-vars
    const [_key, { organizationSlug, projectSlug, query, cursor }] = queryKey;
    if (!organizationSlug || !projectSlug) {
        throw new Error('Organization or Project slug not configured.');
    }
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (cursor) params.append('cursor', cursor);
     try {
        const response = await apiClient.get(
            `/organizations/${organizationSlug}/projects/${projectSlug}/issues`, { params }
        );
        // Backend now returns { data: [], pagination: {} }
        return response.data;
    } catch (error) {
         console.error("API Error (getIssues):", error.response?.data || error.message);
         throw new Error(error.response?.data?.detail || 'Failed to fetch issues');
    }
};

export const getEventDetails = async ({ queryKey }) => {
     // eslint-disable-next-line no-unused-vars
    const [_key, { organizationSlug, projectSlug, eventId }] = queryKey;
    if (!eventId || !organizationSlug || !projectSlug) {
        // Don't throw error if eventId is null/undefined, let useQuery handle enabled flag
        return null;
    }
    try {
        const response = await apiClient.get(
            `/organizations/${organizationSlug}/projects/${projectSlug}/events/${eventId}`
        );
        return response.data;
    } catch (error) {
         console.error("API Error (getEventDetails):", error.response?.data || error.message);
         throw new Error(error.response?.data?.detail || `Failed to fetch event ${eventId}`);
    }
};

// Mutations often don't need queryKey destructuring
export const postExplainEvent = async (eventData) => {
    if (!eventData) throw new Error("Event data is required for explanation.");
    try {
        const response = await apiClient.post('/explain', { event_data: eventData });
        return response.data; // Expects { explanation, model_used, error? }
    } catch (error) {
        console.error("API Error (postExplainEvent):", error.response?.data || error.message);
        throw new Error(error.response?.data?.detail || 'Failed to get AI explanation');
    }
};

export const updateIssueStatus = async ({ issueId, statusUpdatePayload }) => {
     if (!issueId || !statusUpdatePayload?.status) throw new Error("Issue ID and status payload required.");
     try {
        const response = await apiClient.put(`/issues/${issueId}/status`, statusUpdatePayload);
        return response.data; // Updated issue summary
    } catch (error) {
        console.error("API Error (updateIssueStatus):", error.response?.data || error.message);
        throw new Error(error.response?.data?.detail || `Failed to update status for issue ${issueId}`);
    }
};

// Export function likely remains triggering window.location.href, TanStack Query not used for direct downloads.