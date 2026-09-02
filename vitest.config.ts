import { defineConfig } from 'vitest/config'
import fs from 'node:fs'
import path from 'path'

const ENGINE_LINK_SRC = path.resolve(__dirname, 'app/renderer/engine-link-startup/src')
const RENDERER_MAIN_SRC = path.resolve(__dirname, 'app/renderer/src/main/src')
const I18N_STUB = path.resolve(__dirname, 'app/renderer/src/main/src/pages/ai-re-act/hooks/__test__/stubs/i18nStub.ts')
const I18NEXT_BACKEND_STUB = path.resolve(
  __dirname,
  'app/renderer/src/main/src/pages/ai-re-act/hooks/__test__/stubs/i18next-resources-to-backend.ts',
)
const ELECTRON_BRIDGE_STUB = path.resolve(
  __dirname,
  'app/renderer/src/main/src/pages/ai-re-act/hooks/__test__/stubs/electronBridgeStub.ts',
)
const STYLE_STUB = path.resolve(
  __dirname,
  'app/renderer/src/main/src/pages/ai-re-act/hooks/__test__/stubs/styleStub.ts',
)

function resolveAtRoot(root: string, id: string) {
  const rel = id.startsWith('@/') ? id.slice(2) : id
  const candidates = ['.ts', '.tsx', '.js', '.jsx', ''].map((ext) => path.join(root, rel + ext))
  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p
    } catch {
      /* ignore */
    }
  }
  try {
    const asDir = path.join(root, rel)
    if (fs.existsSync(asDir) && fs.statSync(asDir).isDirectory()) {
      for (const name of ['index.ts', 'index.tsx', 'index.js', 'index.jsx']) {
        const p = path.join(asDir, name)
        if (fs.existsSync(p) && fs.statSync(p).isFile()) return p
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

/** Vitest 覆盖三个子项目：app/main、app/renderer/src/main、app/renderer/engine-link-startup（与 scripts/ci-select-vitest-tests.js 一致） */
export default defineConfig({
  plugins: [
    {
      name: 'stub-style-modules',
      enforce: 'pre',
      resolveId(id) {
        const clean = id.split('?')[0]
        if (/\.(css|scss|sass|less)$/.test(clean)) {
          return STYLE_STUB
        }
        return null
      },
      load(id) {
        if (id === STYLE_STUB || /\.(css|scss|sass|less)(\?.*)?$/.test(id)) {
          return 'export default {}'
        }
        return null
      },
    },
    {
      name: 'resolve-at-monorepo',
      enforce: 'pre',
      resolveId(id, importer) {
        if (id === 'i18next-resources-to-backend') return I18NEXT_BACKEND_STUB
        if (id === '@/i18n/i18n' || id === 'i18n/i18n') return I18N_STUB
        if (id === '@/services/electronBridge') return ELECTRON_BRIDGE_STUB

        if (!id.startsWith('@/')) return null

        const eng = resolveAtRoot(ENGINE_LINK_SRC, id)
        const main = resolveAtRoot(RENDERER_MAIN_SRC, id)
        const imp = (importer || '').split(path.sep).join('/')
        if (eng && main) {
          return imp.includes('/engine-link-startup/') ? eng : main
        }
        if (eng) return eng
        if (main) return main
        return null
      },
    },
  ],
  resolve: {
    dedupe: ['vitest'],
    alias: {
      '@renderer': path.resolve(__dirname, 'app/renderer/src/main/src'),
      '@engne': path.resolve(__dirname, 'app/renderer/engine-link-startup/src'),
      '@engine': path.resolve(__dirname, 'app/renderer/engine-link-startup/src'),
      '@app': path.resolve(__dirname, 'app'),
      'i18next-resources-to-backend': I18NEXT_BACKEND_STUB,
      '@/i18n/i18n': I18N_STUB,
      '@/services/electronBridge': ELECTRON_BRIDGE_STUB,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: false,
    // run from repo root
    root: path.resolve(__dirname),
    // run renderer setup to register testing-library matchers
    setupFiles: ['app/renderer/src/main/src/setupVitest.ts'],
    // 单测：仅业务旁 __test__/（与 scripts/ci-select-vitest-tests.js 一致）
    include: [
      'app/renderer/src/main/src/**/__test__/**/*.test.{ts,tsx,js,jsx}',
      'app/renderer/src/main/src/**/__test__/**/*.spec.{ts,tsx,js,jsx}',
      'app/renderer/engine-link-startup/src/**/__test__/**/*.test.{ts,tsx,js,jsx}',
      'app/renderer/engine-link-startup/src/**/__test__/**/*.spec.{ts,tsx,js,jsx}',
      'app/main/**/__test__/**/*.test.{ts,tsx,js,jsx}',
      'app/main/**/__test__/**/*.spec.{ts,tsx,js,jsx}',
      'e2e/**/__test__/**/*.test.{ts,js,mjs}',
      'e2e/**/__test__/**/*.spec.{ts,js,mjs}',
    ],
    exclude: [
      'scripts/icon-migration/**',
      'app/renderer/src/main/src/__test__/yakitUiIconsPurePlugin.test.ts',
      'app/renderer/engine-link-startup/src/__test__/yakitUiIconsPurePlugin.test.ts',
      'app/renderer/engine-link-startup/src/__test__/iconMigrationConsumerContract.test.tsx',
    ],
    // keep JUnit reporter and default reporter
    reporters: [['junit', { outputFile: 'reports/junit.xml' }], 'default'],
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text'],
      reportsDirectory: 'coverage',
    },
  },
})
