import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/spectrum-api': {
        target: 'https://cpartner.spectrum.com',
        changeOrigin: true,
        secure: false, // Bypass SSL issues if any
        rewrite: (path) => path.replace(/^\/spectrum-api/, '')
      }
    }
  }
})
