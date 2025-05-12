/// <reference types="vite/client" />

// Add declarations for JSX modules
declare module "*.jsx" {
  import * as React from "react";
  const Component: React.ComponentType<any>;
  export default Component;
}

// Specifically declare the DashboardPage module
declare module "../pages/DashboardPage" {
  import * as React from "react";
  const DashboardPage: React.ComponentType<any>;
  export default DashboardPage;
}

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_SUPPRESS_SOURCEMAP_WARNINGS: string;
  readonly VITE_RELEASE_VERSION?: string;
  readonly VITE_ENVIRONMENT?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SENTRY_WEB_URL?: string;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
