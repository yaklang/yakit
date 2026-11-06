import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Packaging tools run with root dependencies only. Do not load renderer DOM matchers
// or their optional peer dependencies on clean native packaging runners.
export default defineConfig({
  test: {
    root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
    environment: 'node',
    include: [
      'e2e/fixtures/__test__/release-pipeline.test.mjs',
      'e2e/fixtures/__test__/release-identity.test.mjs',
      'e2e/fixtures/__test__/release-channels.test.mjs',
      'e2e/fixtures/__test__/release-io.test.mjs',
      'e2e/fixtures/__test__/electron-build.test.mjs',
      'e2e/fixtures/__test__/cli-build.test.mjs',
    ],
    maxWorkers: 1,
  },
})
