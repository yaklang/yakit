import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  build: {
    target: 'esnext',
    rolldownOptions: {
      output: {
        format: 'es',
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'antd', 'monaco-editor'],
  },
})
