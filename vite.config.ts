import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const LLAMA_PROXY_PREFIX_REGEX = /^\/api\/llama/

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
