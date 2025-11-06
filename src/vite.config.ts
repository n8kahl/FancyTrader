import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { buildLoggerPlugin } from './vite.config.build-logger'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    buildLoggerPlugin(), // Add detailed build logging
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react', 'recharts'],
        },
      },
    },
  },
})
