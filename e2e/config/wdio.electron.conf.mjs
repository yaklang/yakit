import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const configDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(configDir, '../..')
const artifactsDir = process.env.YAKIT_E2E_ARTIFACTS_DIR || path.join(repoRoot, 'reports/e2e-electron/manual')
const appEntryPoint = path.join(repoRoot, 'app/main/index.js')
const isolatedUserData = process.env.YAKIT_E2E_USER_DATA

if (process.env.YAKIT_E2E !== '1' || !isolatedUserData || !path.isAbsolute(isolatedUserData)) {
  throw new Error('WDIO Electron must be started through scripts/run-electron-e2e.mjs with isolated userData')
}

const safeName = (name) =>
  String(name || 'unknown')
    .replaceAll(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 100)

const collectWindowState = async () =>
  browser.electron.execute((electron) =>
    electron.BrowserWindow.getAllWindows().map((window) => ({
      id: window.id,
      title: window.getTitle(),
      url: window.webContents.getURL(),
      visible: window.isVisible(),
      focused: window.isFocused(),
      destroyed: window.isDestroyed(),
      loading: window.webContents.isLoadingMainFrame(),
      crashed: window.webContents.isCrashed(),
    })),
  )

const collectFailureState = async () =>
  browser.electron.execute((electron) => ({
    capturedAt: new Date().toISOString(),
    application: {
      name: electron.app.getName(),
      version: electron.app.getVersion(),
      packaged: electron.app.isPackaged,
      userData: electron.app.getPath('userData'),
    },
    windows: electron.BrowserWindow.getAllWindows().map((window) => ({
      id: window.id,
      title: window.getTitle(),
      url: window.webContents.getURL(),
      visible: window.isVisible(),
      focused: window.isFocused(),
      destroyed: window.isDestroyed(),
      loading: window.webContents.isLoadingMainFrame(),
      crashed: window.webContents.isCrashed(),
    })),
    processes: electron.app.getAppMetrics().map((metric) => ({
      pid: metric.pid,
      type: metric.type,
      cpuPercent: metric.cpu?.percentCPUUsage ?? null,
      workingSetSizeKB: metric.memory?.workingSetSize ?? null,
      peakWorkingSetSizeKB: metric.memory?.peakWorkingSetSize ?? null,
    })),
  }))

const switchToYakitWindow = async (urlFragment) => {
  const handles = await browser.getWindowHandles()
  for (const handle of handles) {
    await browser.switchToWindow(handle)
    // execute is deliberately excluded from Electron Service's automatic
    // focus switching, so it reports the handle selected directly above.
    const currentUrl = await browser.execute(() => window.location.href)
    if (currentUrl.includes(urlFragment)) return handle
  }

  throw new Error(`No Electron window matched URL fragment: ${urlFragment}`)
}

export const config = {
  runner: 'local',
  specs: [path.join(repoRoot, 'e2e/specs/**/*.e2e.mjs')],
  suites: {
    smoke: [path.join(repoRoot, 'e2e/specs/smoke/**/*.e2e.mjs')],
    'real-engine': [path.join(repoRoot, 'e2e/specs/real-engine/**/*.e2e.mjs')],
    'web-fuzzer-mcp': [path.join(repoRoot, 'e2e/specs/web-fuzzer-mcp/**/*.e2e.mjs')],
    'mitm-performance': [path.join(repoRoot, 'e2e/specs/performance/**/*.e2e.mjs')],
  },
  maxInstances: 1,
  capabilities: [
    {
      browserName: 'electron',
      maxInstances: 1,
    },
  ],
  services: [
    [
      'electron',
      {
        appEntryPoint,
        // ChromeDriver waits for DevToolsActivePort below --user-data-dir.
        // Keep it identical to Electron app.setPath('userData') so the driver
        // and the application cannot accidentally observe different profiles.
        appArgs: [`--user-data-dir=${isolatedUserData}`],
        captureMainProcessLogs: true,
        captureRendererLogs: true,
        mainProcessLogLevel: 'info',
        rendererLogLevel: 'warn',
      },
    ],
  ],
  framework: 'mocha',
  reporters: ['spec'],
  outputDir: path.join(artifactsDir, 'logs'),
  logLevel: process.env.YAKIT_E2E_LOG_LEVEL || 'info',
  bail: 0,
  waitforTimeout: 15_000,
  waitforInterval: 100,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 0,
  specFileRetries: 0,
  mochaOpts: {
    ui: 'bdd',
    timeout: 90_000,
  },
  autoXvfb: process.env.YAKIT_E2E_AUTO_XVFB === '1',

  async before() {
    await mkdir(artifactsDir, { recursive: true })
    browser.addCommand('getYakitWindowState', collectWindowState)
    browser.addCommand('switchToYakitWindow', switchToYakitWindow)
  },

  async afterTest(test, _context, result) {
    if (result.passed) return
    const name = safeName(test.title)
    try {
      await browser.saveScreenshot(path.join(artifactsDir, `${name}.png`))
    } catch (error) {
      console.error(`[electron-e2e] failed to capture screenshot: ${error}`)
    }
    try {
      const applicationState = await collectFailureState()
      applicationState.failure = {
        title: test.title,
        message: result.error?.message || String(result.error || 'unknown failure'),
        stack: result.error?.stack,
      }
      await writeFile(
        path.join(artifactsDir, `${name}.application.json`),
        `${JSON.stringify(applicationState, null, 2)}\n`,
      )
    } catch (error) {
      console.error(`[electron-e2e] failed to capture application state: ${error}`)
    }
  },
}
