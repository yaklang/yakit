import { execFileSync } from 'node:child_process'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { yakitUiIconsPurePlugin } from '../vite-plugins/yakitUiIconsPurePlugin.mjs'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

function generateThemeCssPlugin(): Plugin {
  return {
    name: 'generate-theme-css',
    config() {
      execFileSync(process.execPath, [path.resolve(rootDir, 'scripts/generate-theme-css.cjs')], {
        stdio: 'inherit',
        cwd: rootDir,
      })
    },
  }
}

export default defineConfig({
  base: './',
  envPrefix: ['YAKIT_'],
  plugins: [generateThemeCssPlugin(), yakitUiIconsPurePlugin(), react()],
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
    esbuildOptions: { target: 'esnext' },
    include: ['react', 'react-dom', 'antd', 'monaco-editor'],
  },
})
