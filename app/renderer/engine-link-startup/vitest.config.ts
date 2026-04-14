import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/**/__test__/**/*.test.{ts,tsx,js,jsx}', 'src/**/__test__/**/*.spec.{ts,tsx,js,jsx}'],
  },
})
