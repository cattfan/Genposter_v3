/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_API_KEY?: string;
  readonly VITE_AI_BASE_URL?: string;
  readonly VITE_AI_MODEL?: string;
  readonly VITE_NC_URL?: string;
  readonly VITE_NC_LAN_URL?: string;
  readonly VITE_NC_TOKEN?: string;
  readonly VITE_NC_BASE_ID?: string;
  readonly VITE_NC_PROVINCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
