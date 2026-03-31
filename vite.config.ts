import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/llama': {
        target: 'https://api.llama.airforce',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/llama/, ''),
      },
    },
  },
})
