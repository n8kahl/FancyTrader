import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { buildLoggerPlugin } from './vite.config.build-logger'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

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
  css: {
    postcss: {
      plugins: [
        tailwindcss('./tailwind.config.cjs'),
        autoprefixer,
      ],
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
    cssCodeSplit: true,
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
