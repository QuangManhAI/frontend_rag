/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_USE_MOCK?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_MOCK_WORLD?: string;
  readonly VITE_PIPELINE_BASE?: string;
  readonly FPS_LOCK?: string;
  readonly VITE_FPS_LOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
