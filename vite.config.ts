import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    port: 5173,
    // Part 3: the Express server proxies Whisper / LLM calls
    proxy: { '/api': 'http://localhost:8787' },
  },
})
