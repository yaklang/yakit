import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/icon-migration/__test__/**/*.{test,spec}.{ts,tsx}'],
  },
})
