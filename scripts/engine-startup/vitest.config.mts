import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    root: fileURLToPath(new URL('../..', import.meta.url)),
    environment: 'node',
    globals: true,
    include: ['app/main/handlers/utils/__test__/engine*.test.js'],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 15000,
    hookTimeout: 15000,
  },
})
