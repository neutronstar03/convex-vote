/// <reference types="vite/client" />

declare const __GIT_SHA__: string

interface ImportMetaEnv {
  readonly VITE_UMAMI_WEBSITE_ID?: string
  readonly VITE_LLAMA_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  ethereum?: {
    isMetaMask?: boolean
    request?: (...args: unknown[]) => Promise<unknown>
    on?: (...args: unknown[]) => void
    removeListener?: (...args: unknown[]) => void
    [key: string]: unknown
  }
}
