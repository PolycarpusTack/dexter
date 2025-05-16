import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/appStore';
import { api } from '../api/unified';

export const useInitialization = () => {
  const navigate = useNavigate();
  const { apiToken, organizationId, projectId } = useAppStore();
  
  useEffect(() => {
    const initialize = async () => {
      // Check if we have required configuration
      if (!apiToken || !organizationId || !projectId || 
          organizationId === 'default' || projectId === 'default') {
        // Don't redirect if already on config page
        if (window.location.pathname !== '/config') {
          navigate('/config');
        }
        return;
      }
      
      try {
        // Validate the configuration with the backend
        await api.config.checkConfig({
          organization_slug: organizationId,
          project_slug: projectId
        });
      } catch (error) {
        console.error('Configuration validation failed:', error);
        // If validation fails, redirect to config (unless already there)
        if (window.location.pathname !== '/config') {
          navigate('/config');
        }
      }
    };
    
    initialize();
  }, [apiToken, organizationId, projectId, navigate]);
  
  return {
    isConfigured: !!apiToken && !!organizationId && organizationId !== 'default' && 
                  !!projectId && projectId !== 'default'
  };
};