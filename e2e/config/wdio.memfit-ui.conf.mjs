import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { access, writeFile } from 'node:fs/promises'
import { capture } from '../fixtures/memfit-ui/capture.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const results = []
if (!process.env.MEMFIT_UI_PROFILE || !process.env.MEMFIT_UI_HTML) throw new Error('Use yarn test:memfit-ui:electron')
export const config = {
  runner: 'local',
  cacheDir: path.join(root, 'node_modules/.cache/memfit-ui-webdriver'),
  specs: [path.join(root, 'e2e/specs/memfit-ui/*.e2e.mjs')],
  maxInstances: 1,
  capabilities: [{ browserName: 'electron', maxInstances: 1 }],
  services: [
    [
      'electron',
      {
        appBinaryPath: createRequire(import.meta.url)('electron'),
        appArgs: [
          `--app=${path.join(root, 'e2e/fixtures/memfit-ui/main.cjs')}`,
          `--user-data-dir=${process.env.MEMFIT_UI_PROFILE}`,
          ...(process.env.CI ? ['--no-sandbox'] : []),
        ],
        captureMainProcessLogs: true,
        captureRendererLogs: true,
      },
    ],
  ],
  framework: 'mocha',
  reporters: ['spec'],
  logLevel: process.env.MEMFIT_UI_LOG_LEVEL || 'warn',
  outputDir: path.join(process.env.MEMFIT_UI_ARTIFACTS, 'logs'),
  waitforTimeout: 10000,
  waitforInterval: 100,
  connectionRetryTimeout: 60000,
  connectionRetryCount: 0,
  mochaOpts: { ui: 'bdd', timeout: 30000 },
  async after() {
    // Wait for detachment itself, not just the scheduled callback. Otherwise
    // Linux can exit its event loop first and wait forever for the debugger.
    const detached = path.join(process.env.MEMFIT_UI_PROFILE, 'inspector-detached')
    await browser.electron.execute((_electron, marker) => {
      const inspector = process.mainModule.require('node:inspector')
      const fs = process.mainModule.require('node:fs')
      setTimeout(() => {
        inspector.close()
        fs.writeFileSync(marker, '')
      }, 50)
    }, detached)
    await browser.waitUntil(
      () =>
        access(detached).then(
          () => true,
          () => false,
        ),
      {
        timeout: 5000,
        timeoutMsg: 'Electron inspector did not detach before teardown',
      },
    )
  },
  async afterTest(test, _context, result) {
    results.push({ title: test.title, passed: result.passed, duration: result.duration, error: result.error?.message })
    await writeFile(path.join(process.env.MEMFIT_UI_ARTIFACTS, 'results.json'), JSON.stringify(results, null, 2))
    if (!result.passed) await capture(`failure-${test.title.replace(/[^a-zA-Z0-9-]/g, '_')}`)
  },
}
