// @vitest-environment node
// index.js 是主进程入口，require 会启动 Electron 生命周期；这里用 vm 加载源码，
// 捕获 registerGlobalIPC 注册的 app-exit handler 做纯逻辑验证。
import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const loadIndex = (platform, opts = {}) => {
  const timers = []
  const ipcHandlers = new Map()
  const focusedWindow = opts.focusedWindow ?? null
  const calls = {
    appExit: vi.fn(),
    recoveryStop: vi.fn(),
    diagnosticsStop: vi.fn(),
    closeAllLogHandles: vi.fn(async () => {}),
    asyncKillDynamicControl: vi.fn(async () => {}),
  }
  const fakeProcess = { platform, env: {}, argv: [], execArgv: [], on: vi.fn(), once: vi.fn() }
  const recoveryStub = {
    labels: () => ({ title: '恢复', export: '导出诊断', exportError: '导出失败' }),
    stop: calls.recoveryStop,
    markReady: vi.fn(),
    request: vi.fn(),
    recover: vi.fn(),
    park: vi.fn(),
    isUnhealthy: vi.fn(() => false),
    exportDiagnostics: vi.fn(),
  }
  const diagnosticsStub = { start: vi.fn(async () => {}), stop: calls.diagnosticsStop, record: vi.fn() }
  const electron = {
    app: {
      isPackaged: false,
      whenReady: () => new Promise(() => {}),
      on: vi.fn(),
      once: vi.fn(),
      exit: calls.appExit,
      quit: vi.fn(),
      relaunch: vi.fn(),
      commandLine: { hasSwitch: () => false, getSwitchValue: () => '', removeSwitch: vi.fn() },
      getPath: vi.fn(),
      setPath: vi.fn(),
    },
    BrowserWindow: { getFocusedWindow: () => focusedWindow, getAllWindows: () => [] },
    dialog: { showMessageBox: vi.fn(), showErrorBox: vi.fn() },
    nativeImage: { createFromPath: vi.fn() },
    globalShortcut: { register: vi.fn(), unregister: vi.fn() },
    ipcMain: { handle: (channel, handler) => ipcHandlers.set(channel, handler), on: vi.fn() },
    protocol: { registerFileProtocol: vi.fn() },
    Menu: { buildFromTemplate: vi.fn(() => ({})), setApplicationMenu: vi.fn() },
    crashReporter: {},
  }
  const requireStub = (id) => {
    if (id === 'electron') return electron
    if (id === 'electron-is-dev') return false
    if (id === 'path') return path
    if (id === 'url') return { fileURLToPath: vi.fn() }
    if (id === 'process') return fakeProcess
    if (id === './e2eEnvironment') return { configureE2EEnvironment: vi.fn(() => ({ enabled: false })) }
    if (id === './runtimePaths')
      return {
        appResourcePath: vi.fn((...parts) => path.join('app', ...parts)),
        preloadPath: vi.fn(),
      }
    if (id === './ipc') return { registerIPC: vi.fn(), registerNewIPC: vi.fn() }
    if (id === './localCache')
      return {
        initExtraLocalCache: vi.fn(),
        getExtraLocalCacheValue: vi.fn(),
        initLocalCache: vi.fn(),
        setCloeseExtraLocalCache: vi.fn(),
        setLocalCache: vi.fn(),
      }
    if (id === './handlers/dynamicControlFun') return { asyncKillDynamicControl: calls.asyncKillDynamicControl }
    if (id === './filePath') return { getWindowStatePath: vi.fn(), getConfig: vi.fn(() => ({ softLange: 'zh' })) }
    if (id === './screenshots') return vi.fn()
    if (id === 'electron-window-state') return vi.fn()
    if (id === './menu') return { MenuTemplate: [{ label: 'View', submenu: [] }] }
    if (id === './logFile')
      return {
        getAllLogHandles: vi.fn(async () => ({})),
        closeAllLogHandles: calls.closeAllLogHandles,
        initAllLogFolders: vi.fn(),
        printLogOutputFile: vi.fn(),
        flushAllLogs: vi.fn(async () => {}),
        getCurrentLogFiles: vi.fn(() => ({})),
      }
    if (id === './rendererDiagnostics')
      return {
        createRendererDiagnostics: vi.fn(() => diagnosticsStub),
        settleWithin: async (read) => {
          try {
            await read?.()
          } catch {}
          return {}
        },
      }
    if (id === './rendererRecovery') return { createRendererRecovery: vi.fn(() => recoveryStub), sendToWindow: vi.fn() }
    if (id === './handlers/auxWindowManager/index') return { configureBroadcast: vi.fn() }
    throw new Error(`Unexpected module: ${id}`)
  }
  const sandbox = {
    module: { exports: {} },
    exports: {},
    require: requireStub,
    __dirname: 'app/main',
    console,
    setTimeout: (fn, ms) => {
      timers.push({ fn, ms })
      return timers.length
    },
    clearTimeout: vi.fn(),
  }
  vm.runInNewContext(fs.readFileSync(path.resolve('app/main/index.js'), 'utf8'), sandbox)
  // whenReady 永不 resolve，手动注册全局 IPC 捕获 app-exit handler
  sandbox.registerGlobalIPC()
  return { appExitHandler: ipcHandlers.get('app-exit'), timers, calls, dialog: electron.dialog }
}

// 让确认框返回可控 Promise，返回用于触发用户选择的 resolve 函数
const deferDialog = (dialog) => {
  let resolve
  dialog.showMessageBox.mockReturnValue(new Promise((r) => (resolve = r)))
  return (res) => resolve(res)
}

// 确认框 .then 回调是 fire-and-forget 的异步链，用 setImmediate 等微任务队列清空
const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve))

describe('app-exit scheduling', () => {
  it('defers cleanup to a macrotask with a 100 ms delay on linux', async () => {
    const { appExitHandler, timers, calls } = loadIndex('linux')
    await appExitHandler({}, { showCloseMessageBox: false })
    expect(timers).toHaveLength(1)
    expect(timers[0].ms).toBe(100)
    // 清理被推迟，此刻不应有任何窗口收尾副作用
    expect(calls.recoveryStop).not.toHaveBeenCalled()
    expect(calls.appExit).not.toHaveBeenCalled()
    await timers[0].fn()
    expect(calls.recoveryStop).toHaveBeenCalledTimes(1)
    expect(calls.diagnosticsStop).toHaveBeenCalledTimes(1)
    expect(calls.closeAllLogHandles).toHaveBeenCalledTimes(1)
    expect(calls.appExit).toHaveBeenCalledTimes(1)
  })

  it('uses a zero delay off linux', async () => {
    const { appExitHandler, timers } = loadIndex('win32')
    await appExitHandler({}, {})
    expect(timers).toHaveLength(1)
    expect(timers[0].ms).toBe(0)
  })

  it('ignores repeated app-exit invocations once exit is scheduled', async () => {
    const { appExitHandler, timers, calls } = loadIndex('linux')
    await appExitHandler({}, {})
    await appExitHandler({}, {})
    expect(timers).toHaveLength(1)
    await timers[0].fn()
    await appExitHandler({}, {})
    expect(timers).toHaveLength(1)
    expect(calls.asyncKillDynamicControl).toHaveBeenCalledTimes(1)
    expect(calls.recoveryStop).toHaveBeenCalledTimes(1)
    expect(calls.appExit).toHaveBeenCalledTimes(1)
  })

  it('dialog "直接退出" schedules deferred cleanup exactly once', async () => {
    const focusedWindow = { id: 1, isDestroyed: () => false, minimize: vi.fn() }
    const { appExitHandler, timers, calls, dialog } = loadIndex('linux', { focusedWindow })
    const choose = deferDialog(dialog)
    const preventDefault = vi.fn()
    await appExitHandler({ preventDefault }, { showCloseMessageBox: true, isIRify: false, isMemfit: false })
    // 确认框未决时不应有任何退出调度
    expect(dialog.showMessageBox).toHaveBeenCalledWith(focusedWindow, expect.objectContaining({ cancelId: 3 }))
    expect(timers).toHaveLength(0)
    expect(calls.recoveryStop).not.toHaveBeenCalled()

    choose({ response: 1, checkboxChecked: false })
    await flushMicrotasks()
    expect(timers).toHaveLength(1)
    expect(timers[0].ms).toBe(100)
    expect(calls.asyncKillDynamicControl).toHaveBeenCalledTimes(1)
    expect(calls.recoveryStop).not.toHaveBeenCalled()

    await timers[0].fn()
    expect(calls.recoveryStop).toHaveBeenCalledTimes(1)
    expect(calls.diagnosticsStop).toHaveBeenCalledTimes(1)
    expect(calls.closeAllLogHandles).toHaveBeenCalledTimes(1)
    expect(calls.appExit).toHaveBeenCalledTimes(1)
    expect(preventDefault).not.toHaveBeenCalled()

    // 调度后再次触发 app-exit 不应重复清理
    await appExitHandler({}, {})
    expect(timers).toHaveLength(1)
    expect(calls.appExit).toHaveBeenCalledTimes(1)
  })

  it('dialog "最小化" prevents default without scheduling exit, and exit still works later', async () => {
    const focusedWindow = { id: 1, isDestroyed: () => false, minimize: vi.fn() }
    const { appExitHandler, timers, calls, dialog } = loadIndex('linux', { focusedWindow })
    const choose = deferDialog(dialog)
    const preventDefault = vi.fn()
    await appExitHandler({ preventDefault }, { showCloseMessageBox: true })

    choose({ response: 0, checkboxChecked: false })
    await flushMicrotasks()
    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(timers).toHaveLength(0)
    expect(calls.recoveryStop).not.toHaveBeenCalled()
    expect(calls.appExit).not.toHaveBeenCalled()

    // 未调度退出，随后仍可正常退出
    await appExitHandler({}, { showCloseMessageBox: false })
    expect(timers).toHaveLength(1)
    await timers[0].fn()
    expect(calls.appExit).toHaveBeenCalledTimes(1)
    expect(calls.recoveryStop).toHaveBeenCalledTimes(1)
  })

  it('dialog "取消" prevents default without scheduling exit, and exit still works later', async () => {
    const focusedWindow = { id: 1, isDestroyed: () => false, minimize: vi.fn() }
    const { appExitHandler, timers, calls, dialog } = loadIndex('linux', { focusedWindow })
    const choose = deferDialog(dialog)
    const preventDefault = vi.fn()
    await appExitHandler({ preventDefault }, { showCloseMessageBox: true })

    choose({ response: 3, checkboxChecked: false })
    await flushMicrotasks()
    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(timers).toHaveLength(0)
    expect(calls.recoveryStop).not.toHaveBeenCalled()
    expect(calls.appExit).not.toHaveBeenCalled()

    // 未调度退出，随后仍可正常退出
    await appExitHandler({}, { showCloseMessageBox: false })
    expect(timers).toHaveLength(1)
    await timers[0].fn()
    expect(calls.appExit).toHaveBeenCalledTimes(1)
    expect(calls.recoveryStop).toHaveBeenCalledTimes(1)
  })
})
