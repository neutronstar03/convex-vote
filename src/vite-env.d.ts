/// <reference types="vite/client" />

interface Window {
  ethereum?: {
    isMetaMask?: boolean
    request?: (...args: unknown[]) => Promise<unknown>
    on?: (...args: unknown[]) => void
    removeListener?: (...args: unknown[]) => void
    [key: string]: unknown
  }
}
