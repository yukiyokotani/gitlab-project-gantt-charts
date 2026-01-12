/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITLAB_URL: string;
  readonly VITE_GITLAB_TOKEN: string;
  readonly VITE_GITLAB_PROJECT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
