import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  css: {
    postcss: './postcss.config.cjs',
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'build',
    cssCodeSplit: true,
    minify: 'esbuild',
  },
})
