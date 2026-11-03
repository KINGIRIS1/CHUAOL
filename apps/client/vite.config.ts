import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' để bản build chạy được ở bất kỳ thư mục con nào (GitHub Pages, Artifact, CDN).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
  },
})
