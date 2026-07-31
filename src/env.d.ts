/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_PUBLIC_SITE_URL?: string
  readonly VITE_APP_PUBLIC_SITE_URL?: string
  readonly VITE_SHOW_DEMO_ACCOUNTS?: string
  readonly VITE_OFFERLAB_ENABLE_LEGACY_TRAINING?: string
  readonly VITE_OFFERLAB_ALLOW_LOCAL_DEMO?: string
  readonly VITE_OFFERLAB_DEMO_FALLBACK?: string
  readonly VITE_OFFERLAB_USE_DEMO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
