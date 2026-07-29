import {
  confirmStartupWorkspace,
  completeShellHandoff,
  findApplicationWindows,
  waitForMainWindow,
  waitForShellWindows,
} from '../../drivers/application.driver.mjs'

describe('Yakit Electron startup', () => {
  it('confirms the workspace and hands off to a visible Main window', async () => {
    const userDataPath = await browser.electron.execute((electron) => electron.app.getPath('userData'))
    expect(userDataPath).toBe(process.env.YAKIT_E2E_USER_DATA)

    const initialWindows = await waitForShellWindows()
    const { linkWindow: initialLinkWindow, mainWindow: initialMainWindow } = findApplicationWindows(initialWindows)

    expect(initialLinkWindow).toBeDefined()
    expect(initialMainWindow).toBeDefined()
    expect(initialLinkWindow.visible).toBe(true)
    expect(initialMainWindow.visible).toBe(false)
    expect(initialLinkWindow.crashed).toBe(false)
    expect(initialMainWindow.crashed).toBe(false)

    await confirmStartupWorkspace()

    // The repository intentionally does not carry a Yak engine binary. This
    // shell Smoke emulates only the engine-ready boundary through the public
    // preload bridge, while still exercising the production IPC window handoff.
    await completeShellHandoff({ Host: '127.0.0.1', Port: 0, IsTLS: false, Password: '' })
    await waitForMainWindow()
  })

  it('can read bounded Electron process metrics', async () => {
    const metrics = await browser.electron.execute((electron) =>
      electron.app.getAppMetrics().map((metric) => ({
        pid: metric.pid,
        type: metric.type,
        cpuPercent: metric.cpu.percentCPUUsage,
        workingSetSizeKB: metric.memory.workingSetSize,
      })),
    )

    expect(metrics.length).toBeGreaterThan(0)
    expect(metrics.every((metric) => metric.pid > 0)).toBe(true)
  })
})
