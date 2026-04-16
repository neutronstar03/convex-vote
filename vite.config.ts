import { execSync } from 'node:child_process'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const LLAMA_PROXY_PREFIX_REGEX = /^\/api\/llama/

function getGitSha(): string | undefined {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim()
  }
  catch {
    return undefined
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __GIT_SHA__: JSON.stringify(getGitSha() ?? ''),
  },
  build: {
    outDir: 'build/client',
  },
  server: {
    proxy: {
      '/api/llama': {
        target: 'https://api.llama.airforce',
        changeOrigin: true,
        rewrite: path => path.replace(LLAMA_PROXY_PREFIX_REGEX, ''),
      },
    },
  },
})
