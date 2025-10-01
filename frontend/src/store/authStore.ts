/**
 * Authentication Store
 * Manages authentication state including user info, tokens, and organization/project context
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  // User authentication
  userId: string | null;
  apiToken: string | null;
  
  // Organization and project context
  organizationSlug: string | null;
  projectSlug: string | null;
  organizationId: string | null;
  projectSlugId: string | null;
  
  // Actions
  setUserId: (id: string | null) => void;
  setApiToken: (token: string | null) => void;
  setOrganizationId: (id: string | null) => void;
  setProjectSlugId: (id: string | null) => void;
  setOrgProject: (organizationSlug: string, projectSlug: string) => void;
  setConfig: (config: { organization_slug: string; project_slug: string }) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      userId: null,
      apiToken: null,
      organizationSlug: null,
      projectSlug: null,
      organizationId: null,
      projectSlugId: null,
      
      // Actions
      setUserId: (id) => set({ userId: id }),
      
      setApiToken: (token) => set({ apiToken: token }),
      
      setOrganizationId: (id) => set({ organizationId: id }),
      
      setProjectSlugId: (id) => set({ projectSlugId: id }),
      
      setOrgProject: (organizationSlug, projectSlug) => 
        set({ 
          organizationSlug, 
          projectSlug
        }),
      
      setConfig: ({ organization_slug, project_slug }) => 
        set({ 
          organizationSlug: organization_slug, 
          projectSlug: project_slug 
        }),
      
      clearAuth: () => 
        set({
          userId: null,
          apiToken: null,
          organizationSlug: null,
          projectSlug: null,
          organizationId: null,
          projectSlugId: null,
        }),
      
      isAuthenticated: () => {
        const state = get();
        return !!(state.apiToken && state.organizationSlug);
      }
    }),
    {
      name: 'dexter-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist auth-related data
        userId: state.userId,
        apiToken: state.apiToken,
        organizationSlug: state.organizationSlug,
        projectSlug: state.projectSlug,
        organizationId: state.organizationId,
        projectSlugId: state.projectSlugId,
      })
    }
  )
);

export default useAuthStore;