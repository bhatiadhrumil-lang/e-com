import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // During development the frontend proxies API calls to the backend,
    // so the browser only ever talks to a single origin (no CORS needed
    // for the dev workflow; CORS is still configured on the backend for
    // split-origin deployments).
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
