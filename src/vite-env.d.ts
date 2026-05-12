/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_SIGNALR_HUB_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_TOKEN_KEY: string
  readonly VITE_REFRESH_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
