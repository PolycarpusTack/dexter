/// <reference types="vite/client" />

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
