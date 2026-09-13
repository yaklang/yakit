import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import {
  confirmStartupWorkspace,
  connectRemoteEngineThroughUI,
  findApplicationWindows,
  waitForMainWindow,
  waitForShellWindows,
  LINK_WINDOW_URL,
  MAIN_WINDOW_URL,
} from '../../drivers/application.driver.mjs'

const require = createRequire(import.meta.url)
const directory = path.join(process.env.YAKIT_E2E_USER_DATA, 'renderer-diagnostics')
const bundle = path.join(process.env.YAKIT_E2E_ARTIFACTS_DIR, 'renderer-diagnostics.zip')
const report = { nativeCrashes: [], recoveries: [], scenarios: [] }
// ChromeDriver retains stale execution contexts after a native renderer crash.
// Use the surviving main-process bridge to query the actual replacement renderer.
const inRenderer = (url, script) =>
  browser.electron.execute(
    async (electron, url, script) => {
      const window = electron.BrowserWindow.getAllWindows().find((entry) => entry.webContents.getURL().includes(url))
      return window.webContents.executeJavaScript(script)
    },
    url,
    script,
  )
const echoFromRecoveredMain = async () => {
  const token = `renderer-recovery-${randomUUID()}`
  const response = await inRenderer(MAIN_WINDOW_URL, `window.yakitBridge.engine.echo({text: ${JSON.stringify(token)}})`)
  expect(response?.result).toBe(token)
}
const captureRenderer = async (url, name) => {
  const encoded = await browser.electron.execute(async (electron, url) => {
    const window = electron.BrowserWindow.getAllWindows().find((entry) => entry.webContents.getURL().includes(url))
    const screenshot = await window.webContents.capturePage()
    return screenshot.toPNG().toString('base64')
  }, url)
  await fs.writeFile(path.join(process.env.YAKIT_E2E_ARTIFACTS_DIR, name), Buffer.from(encoded, 'base64'))
}
const readIncidents = async () => {
  const files = await fs.readdir(directory)
  return Promise.all(
    files
      .filter((name) => /^incident-.*\.json$/.test(name))
      .map(async (name) => JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'))),
  )
}
const probe = () =>
  browser.electron.execute(() => ({
    dialogs: globalThis.__recoveryProbe.dialogs,
    readyCount: globalThis.__recoveryProbe.readyCount,
    linkReadyCount: globalThis.__recoveryProbe.linkReadyCount,
  }))
const requestFromMenu = () =>
  browser.electron.execute((electron) => {
    const item = electron.Menu.getApplicationMenu()
      .items.find((entry) => entry.label === 'View')
      .submenu.items.find((entry) => ['界面恢复', '介面復原', 'Recover interface'].includes(entry.label))
    if (!item) throw new Error('Native recovery menu missing')
    item.click()
  })
const queueChoices = (choices) =>
  browser.electron.execute((_electron, values) => {
    globalThis.__recoveryProbe.choices.push(...values)
  }, choices)

async function injectCrash(action = 'recover', target = 'main') {
  if (action) await queueChoices([action])
  return browser.electron.execute((electron, target) => {
    const match = target === 'main' ? '/renderer/pages/main/' : '/engine-link-startup/'
    const window = electron.BrowserWindow.getAllWindows().find((entry) => entry.webContents.getURL().includes(match))
    const pid = window.webContents.getOSProcessId()
    if (!pid || pid === process.pid) throw new Error('Refusing to signal an invalid renderer PID')
    if (!window.webContents.debugger.isAttached()) window.webContents.debugger.attach('1.3')
    window.webContents.once('render-process-gone', () => {
      if (window.webContents.debugger.isAttached()) window.webContents.debugger.detach()
    })
    void window.webContents.debugger.sendCommand('Page.crash').catch(() => {})
    return {
      target,
      rendererPid: pid,
      mainPid: process.pid,
      expectedReason: 'crashed',
    }
  }, target)
}

async function waitForRecovery(previousReadyCount, previousPid) {
  await browser.waitUntil(async () => (await probe()).readyCount > previousReadyCount, {
    timeout: 25_000,
    interval: 200,
    timeoutMsg: 'Reloaded renderer did not send its real application-ready IPC',
  })
  await browser.waitUntil(
    async () => {
      const { mainWindow, linkWindow } = findApplicationWindows(await browser.getYakitWindowState())
      return mainWindow?.visible && !mainWindow.loading && !mainWindow.crashed && !linkWindow?.visible
    },
    { timeout: 15_000 },
  )
  await browser.waitUntil(
    async () => inRenderer(MAIN_WINDOW_URL, "document.querySelector('#root')?.childElementCount > 0"),
    {
      timeout: 15_000,
    },
  )
  const state = await browser.electron.execute((electron) => {
    const window = electron.BrowserWindow.getAllWindows().find((entry) =>
      entry.webContents.getURL().includes('/renderer/pages/main/'),
    )
    return { rendererPid: window.webContents.getOSProcessId(), mainPid: process.pid }
  })
  expect(state.rendererPid).not.toBe(previousPid)
  await echoFromRecoveredMain()
  await browser.waitUntil(
    async () =>
      inRenderer(
        MAIN_WINDOW_URL,
        `(() => {
            const entry = Array.from(document.querySelectorAll('[data-testid="project-open"]')).find((item) => item.getAttribute('data-project-name') === '[default]')
            if (!entry) return false
            const rect = entry.getBoundingClientRect()
            return rect.height > 0 && entry.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
          })()`,
      ),
    {
      timeout: 25_000,
      timeoutMsg: 'Main recovered its shell but did not render the real project list',
    },
  )
  report.recoveries.push({ ...state, echoPassed: true })
}

describe('Renderer crash recovery with a real Yak engine', function () {
  this.bail(true)
  before(async () => {
    if (process.env.YAKIT_E2E_ENGINE_FIXTURE !== 'external') throw new Error('Run this suite with --with-yak-engine')
    await waitForShellWindows()
    await browser.electron.execute((electron, destination) => {
      const state = (globalThis.__recoveryProbe = {
        dialogs: [],
        choices: [],
        readyCount: 0,
        linkReadyCount: 0,
        originalMessageBox: electron.dialog.showMessageBox,
        originalSaveDialog: electron.dialog.showSaveDialog,
      })
      // Only native dialog choices are automated. All windows, crashes, IPC, files and gRPC are real.
      electron.dialog.showMessageBox = async (...args) => {
        const options = args[args.length - 1]
        if (!['界面恢复', '介面復原', 'Recover interface'].includes(options.title))
          return state.originalMessageBox(...args)
        state.dialogs.push({ message: options.message, buttons: options.buttons })
        const choice = state.choices.shift() || 'wait'
        const labels = {
          recover: ['恢复界面', '復原介面', 'Recover interface'],
          connection: ['回到连接页', '回到連線頁', 'Connection page'],
          export: ['导出诊断', '匯出診斷', 'Export diagnostics'],
          wait: ['稍后处理', '稍後處理', 'Later'],
        }
        const response = options.buttons.findIndex((label) => labels[choice].includes(label))
        return { response: response < 0 ? options.cancelId : response }
      }
      electron.dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination })
      electron.ipcMain.on('main-win-uilayout-render-ok', () => state.readyCount++)
      electron.ipcMain.on('engine-win-render-ok', () => state.linkReadyCount++)
    }, bundle)
    await confirmStartupWorkspace()
    await connectRemoteEngineThroughUI({
      Host: '127.0.0.1',
      Port: Number(process.env.YAKIT_E2E_ENGINE_PORT),
      Mode: 'remote',
      IsTLS: false,
      Password: '',
    })
    await waitForMainWindow()
  })

  after(async () => {
    report.incidents = await readIncidents()
    report.probe = await probe().catch((error) => ({ error: String(error) }))
    await fs.writeFile(
      path.join(process.env.YAKIT_E2E_ARTIFACTS_DIR, 'renderer-recovery-report.json'),
      JSON.stringify(report, null, 2),
    )
    await browser.electron
      .execute((electron) => {
        electron.dialog.showMessageBox = globalThis.__recoveryProbe.originalMessageBox
        electron.dialog.showSaveDialog = globalThis.__recoveryProbe.originalSaveDialog
      })
      .catch(() => {})
  })

  it('records a real native crash, reloads Main and preserves the engine connection and saved data', async () => {
    const before = await probe()
    await browser.execute(() => {
      localStorage.setItem('recovery-test-saved', 'persisted')
      window.__recoveryTestVolatile = 'not persisted'
    })
    const crashed = await injectCrash()
    report.nativeCrashes.push(crashed)
    await waitForRecovery(before.readyCount, crashed.rendererPid)
    expect(report.recoveries.at(-1).mainPid).toBe(crashed.mainPid)
    expect(await inRenderer(MAIN_WINDOW_URL, "localStorage.getItem('recovery-test-saved')")).toBe('persisted')
    expect(await inRenderer(MAIN_WINDOW_URL, 'typeof window.__recoveryTestVolatile')).toBe('undefined')
    await captureRenderer(MAIN_WINDOW_URL, 'main-recovered.png')
    const incident = (await readIncidents()).find((entry) => entry.event === 'render-process-gone')
    expect(incident.window.rendererPid).toBe(crashed.rendererPid)
    expect(incident.details.reason).toBe(crashed.expectedReason)
    expect(incident.details.exitCode).not.toBe(0)
    expect(Array.isArray(incident.snapshot.current.processes)).toBe(true)
    expect(Object.keys(incident.snapshot.gpu.gpuInfoBasic).length).toBeGreaterThan(0)
    report.scenarios.push('native crash -> new renderer PID -> real ready IPC -> same main process -> gRPC Echo passed')
  })

  it('replaces a renderer with a blocked JavaScript event loop', async () => {
    const before = await probe()
    await queueChoices(['recover'])
    const pid = await browser.electron.execute((electron) => {
      const window = electron.BrowserWindow.getAllWindows().find((entry) =>
        entry.webContents.getURL().includes('/renderer/pages/main/'),
      )
      const pid = window.webContents.getOSProcessId()
      void window.webContents.executeJavaScript('while (true) {}').catch(() => {})
      // ChromeDriver disables Chromium's hang monitor. Trigger its native event after actually blocking JS.
      setTimeout(() => window.emit('unresponsive'), 500)
      return pid
    })
    await waitForRecovery(before.readyCount, pid)
    const incidents = await readIncidents()
    expect(incidents.some((entry) => entry.event === 'unresponsive')).toBe(true)
    expect(incidents.some((entry) => entry.event === 'recovery-forced-termination')).toBe(true)
    report.scenarios.push(
      'blocked renderer JS + injected unresponsive event -> forced process replacement -> gRPC Echo passed',
    )
  })

  it('keeps Main usable when the hidden Link renderer crashes', async () => {
    const before = await probe()
    const crashed = await injectCrash(null, 'link')
    report.nativeCrashes.push(crashed)
    await browser.waitUntil(
      async () =>
        (await readIncidents()).some(
          (entry) =>
            entry.event === 'render-process-gone' &&
            entry.window.name === 'engineLinkWin' &&
            entry.window.rendererPid === crashed.rendererPid,
        ),
      {
        timeout: 10_000,
      },
    )
    expect((await probe()).dialogs).toHaveLength(before.dialogs.length)
    await echoFromRecoveredMain()
    report.scenarios.push('hidden Link native crash -> no disruptive dialog -> Main gRPC Echo still passed')
  })

  it('stops repeated reloads, exports an actual dump, and returns to the connection page', async () => {
    let limited = false
    for (let attempt = 0; attempt < 3; attempt++) {
      const before = await probe()
      const crashed = await injectCrash('wait')
      report.nativeCrashes.push(crashed)
      await browser.waitUntil(async () => (await probe()).dialogs.length > before.dialogs.length, { timeout: 10_000 })
      const latest = (await probe()).dialogs.at(-1)
      limited = !latest.buttons.some((label) => ['恢复界面', '復原介面', 'Recover interface'].includes(label))
      if (limited) break
      await queueChoices(['recover'])
      await requestFromMenu()
      await waitForRecovery(before.readyCount, crashed.rendererPid)
    }
    expect(limited).toBe(true)
    if (process.platform === 'darwin') {
      await browser.waitUntil(
        async () => {
          try {
            const entries = await Promise.all(
              ['reports', 'pending', 'completed'].map((subdir) =>
                fs.readdir(path.join(directory, 'Crashpad', subdir)).catch(() => []),
              ),
            )
            return entries.flat().some((name) => name.endsWith('.dmp'))
          } catch {
            return false
          }
        },
        { timeout: 10_000, timeoutMsg: 'Crashpad did not produce a native dump' },
      )
    }
    await queueChoices(['export', 'connection'])
    await requestFromMenu()
    await browser.waitUntil(
      async () => {
        const { linkWindow, mainWindow } = findApplicationWindows(await browser.getYakitWindowState())
        return linkWindow?.visible && !linkWindow.loading && !mainWindow.visible
      },
      { timeout: 25_000 },
    )
    const unpacked = path.join(process.env.YAKIT_E2E_ARTIFACTS_DIR, 'diagnostics-unpacked')
    await require('compressing').zip.uncompress(bundle, unpacked)
    const manifest = JSON.parse(await fs.readFile(path.join(unpacked, 'manifest.json'), 'utf8'))
    expect(manifest.files.filter((entry) => entry.name.endsWith('-log.txt'))).toHaveLength(3)
    expect(manifest.files.some((entry) => entry.name.startsWith('incident-'))).toBe(true)
    if (process.platform === 'darwin')
      expect(manifest.files.some((entry) => entry.name.endsWith('.dmp') && entry.includedBytes > 0)).toBe(true)
    // The recovery/connection flow must not kill the independently running engine.
    expect(() => process.kill(Number(process.env.YAKIT_E2E_ENGINE_PID), 0)).not.toThrow()
    report.scenarios.push(
      'failure limit -> native menu -> diagnostic ZIP with actual dump and three logs -> connection page; engine still alive',
    )
    report.export = manifest.files
  })

  it('recovers a visible Link renderer after a real native crash', async () => {
    const before = await probe()
    const crashed = await injectCrash('recover', 'link')
    report.nativeCrashes.push(crashed)
    await browser.waitUntil(async () => (await probe()).linkReadyCount > before.linkReadyCount, {
      timeout: 25_000,
      timeoutMsg: 'Link did not send its real ready IPC after recovery',
    })
    await browser.waitUntil(
      async () =>
        inRenderer(
          LINK_WINDOW_URL,
          'document.querySelector(\'[data-testid="startup-page"]\')?.getBoundingClientRect().height > 0 && document.querySelector(\'[data-testid="startup-confirm"]\')?.disabled === false',
        ),
      { timeout: 15_000 },
    )
    await captureRenderer(LINK_WINDOW_URL, 'link-recovered.png')
    const state = await browser.electron.execute((electron) => {
      const window = electron.BrowserWindow.getAllWindows().find((entry) =>
        entry.webContents.getURL().includes('/engine-link-startup/'),
      )
      return { rendererPid: window.webContents.getOSProcessId(), mainPid: process.pid }
    })
    expect(state.rendererPid).not.toBe(crashed.rendererPid)
    expect(state.mainPid).toBe(crashed.mainPid)
    expect(
      (await readIncidents()).some(
        (entry) =>
          entry.event === 'render-process-gone' &&
          entry.window.name === 'engineLinkWin' &&
          entry.window.rendererPid === crashed.rendererPid,
      ),
    ).toBe(true)
    report.scenarios.push('visible Link native crash -> new renderer PID -> real Link ready IPC -> startup page usable')
  })
})
