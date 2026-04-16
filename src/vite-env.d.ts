/// <reference types="vite/client" />

declare const __GIT_SHA__: string

interface Window {
  ethereum?: {
    isMetaMask?: boolean
    request?: (...args: unknown[]) => Promise<unknown>
    on?: (...args: unknown[]) => void
    removeListener?: (...args: unknown[]) => void
    [key: string]: unknown
  }
}
