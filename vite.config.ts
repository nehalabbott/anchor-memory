import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    port: 5173,
    // The local Node server proxies LLM calls without exposing the API key.
    proxy: { '/api': 'http://127.0.0.1:8787' },
  },
})
