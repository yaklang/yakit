import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: fileURLToPath(new URL('../..', import.meta.url)),
  test: {
    environment: 'node',
    include: [
      'scripts/icon-migration/__test__/**/*.{test,spec}.{ts,tsx}',
      'app/renderer/src/main/src/__test__/yakitUiIconsPurePlugin.test.ts',
      'app/renderer/engine-link-startup/src/__test__/yakitUiIconsPurePlugin.test.ts',
      'app/renderer/engine-link-startup/src/__test__/iconMigrationConsumerContract.test.tsx',
    ],
    exclude: ['scripts/icon-migration/__test__/local-icon-bindings.test.ts'],
  },
})
