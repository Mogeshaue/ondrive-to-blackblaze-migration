import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://app:3000',
        changeOrigin: true,
        secure: false,
      },
      '/auth/microsoft/callback': {
        target: 'http://app:3000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://app:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
