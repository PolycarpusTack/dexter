import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { api } from '../api/unified';
import { initializeCSRF } from '../utils/csrf';

export const useInitialization = () => {
  const navigate = useNavigate();
  const { apiToken, organizationId, projectSlug } = useAuthStore();
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initialize CSRF protection on app startup
    initializeCSRF().catch(error => {
      console.warn('CSRF initialization failed:', error);
    });
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  useEffect(() => {
    const initialize = async () => {
      // Check if component is still mounted
      if (!isMountedRef.current) return;
      
      // Check if we have required configuration
      if (!apiToken || !organizationId || !projectSlug || 
          organizationId === 'default' || projectSlug === 'default') {
        // Don't redirect if already on config page or component unmounted
        if (isMountedRef.current && window.location.pathname !== '/config') {
          navigate('/config');
        }
        return;
      }
      
      try {
        // Validate the configuration with the backend
        await api.config.checkConfig({
          organization_slug: organizationId,
          project_slug: projectSlug
        });
      } catch (error) {
        console.error('Configuration validation failed:', error);
        // If validation fails, redirect to config (unless already there or component unmounted)
        if (isMountedRef.current && window.location.pathname !== '/config') {
          navigate('/config');
        }
      }
    };
    
    initialize();
  }, [apiToken, organizationId, projectSlug, navigate]);
  
  return {
    isConfigured: !!apiToken && !!organizationId && organizationId !== 'default' && 
                  !!projectSlug && projectSlug !== 'default'
  };
};