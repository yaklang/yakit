import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/**/__test__/**/*.test.{ts,tsx,js,jsx}', 'src/**/__test__/**/*.spec.{ts,tsx,js,jsx}'],
    exclude: ['src/__test__/yakitUiIconsPurePlugin.test.ts', 'src/__test__/iconMigrationConsumerContract.test.tsx'],
  },
})
