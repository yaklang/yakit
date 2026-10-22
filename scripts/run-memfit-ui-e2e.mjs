import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { catalog } from '../app/renderer/src/main/src/pages/ai-re-act/interactive-ui/catalog.mjs'
import { examples } from '../e2e/fixtures/memfit-ui/examples.mjs'
import { terminateProcessTree } from '../e2e/fixtures/process/process-tree.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fixture = path.join(root, 'e2e/fixtures/memfit-ui')
const renderer = path.join(root, 'app/renderer/src/main')
const requireRenderer = createRequire(path.join(renderer, 'package.json'))
const { build } = await import(requireRenderer.resolve('vite'))
const { default: react } = await import(requireRenderer.resolve('@vitejs/plugin-react'))
assert.deepEqual(
  Object.keys(examples).sort(),
  catalog.components.map(({ name }) => name).sort(),
  'Every catalog component needs an Electron example',
)
const temporary = await mkdtemp(path.join(tmpdir(), 'memfit-ui-e2e-'))
const artifacts = path.join(root, 'reports/e2e-electron/memfit-ui', new Date().toISOString().replaceAll(/[:.]/g, '-'))
await mkdir(artifacts, { recursive: true })
console.log(`[Memfit UI] artifacts: ${artifacts}`)

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: 'inherit' })
    const timeout = setTimeout(() => void terminateProcessTree(child.pid), 180000)
    child.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.on('exit', (code, signal) => {
      clearTimeout(timeout)
      code === 0 ? resolve() : reject(new Error(`${command} exited ${code ?? signal}`))
    })
  })
}

try {
  await run(process.execPath, ['app/renderer/src/main/scripts/generate-theme-css.cjs'])
  await build({
    configFile: false,
    root: fixture,
    base: './',
    logLevel: 'warn',
    plugins: [
      {
        name: 'memfit-ui-test-boundaries',
        enforce: 'pre',
        resolveId(id, importer) {
          if (/(?:^|\/)(ChatMultiSessionController|useCurrentDataBySession)$/.test(id))
            return path.join(fixture, 'adapter.ts')
          if (id === '@/i18n/i18n' || (id === './i18n' && importer?.includes('/src/i18n/')))
            return path.join(fixture, 'i18n.ts')
        },
      },
      react(),
    ],
    resolve: {
      alias: [
        {
          find: '@ant-design/v5-patch-for-react-19',
          replacement: requireRenderer.resolve('@ant-design/v5-patch-for-react-19'),
        },
        { find: '@', replacement: path.join(renderer, 'src') },
        ...['react', 'react-dom', 'zustand', 'antd', 'i18next', 'react-i18next'].map((name) => ({
          find: new RegExp(`^${name}(/.*)?$`),
          replacement: `${path.join(renderer, 'node_modules', name)}$1`,
        })),
      ],
    },
    define: { 'process.env.YAKIT_EDITION': JSON.stringify('memfit') },
    build: { outDir: path.join(temporary, 'page'), target: 'chrome118', minify: false, reportCompressedSize: false },
  })
  await run(
    process.execPath,
    ['node_modules/@wdio/cli/bin/wdio.js', 'run', 'e2e/config/wdio.memfit-ui.conf.mjs', ...process.argv.slice(2)],
    {
      ...process.env,
      MEMFIT_UI_HTML: path.join(temporary, 'page/index.html'),
      MEMFIT_UI_PROFILE: path.join(temporary, 'profile'),
      MEMFIT_UI_ARTIFACTS: artifacts,
    },
  )
} finally {
  await rm(temporary, { recursive: true, force: true })
}
