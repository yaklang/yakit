// @vitest-environment node
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const source = readFileSync(path.resolve('app/main/ipc.js'), 'utf8')

function loadIpc() {
  const handlers = new Map()
  const portScan2 = { registerNewIPC: vi.fn() }
  const yakLocal = { registerNewIPC: vi.fn() }
  const stubs = {
    electron: {
      ipcMain: { handle: (channel, handler) => handlers.set(channel, handler), on: vi.fn() },
      nativeImage: { createEmpty: vi.fn() },
      Notification: class {
        show() {}
      },
      app: { relaunch: vi.fn(), exit: vi.fn() },
    },
    './runtimePaths': { appResourcePath: () => '/tmp/fake.proto' },
    './ipcModules': {
      newUiOperate: { ui: () => ({ registerNewIPC: vi.fn() }) },
      utils: { nodeFiles: () => ({ registerNewIPC: vi.fn() }) },
    },
    './state': { HttpSetting: {} },
    '@grpc/grpc-js': {
      loadPackageDefinition: () => ({ ypb: { Yak: vi.fn() } }),
      status: { OK: 0 },
    },
    './handlers/utils/engineGrpcClient': { createEngineGrpcClient: vi.fn() },
    './handlers/utils/engineSessionRuntime': { getEngineSession: () => ({ current: () => null }) },
    '@grpc/proto-loader': { loadSync: () => ({}) },
    './logFile': { printLogOutputFile: vi.fn() },
    './security': { assertTrustedAppSender: vi.fn(), normalizeHttpBaseUrl: (url) => url },
    './filePath': {
      getConfig: () => ({}),
      setConfig: vi.fn(),
      getYakitHome: () => '/tmp',
      getAppConfigDir: () => '/tmp',
    },
    './localCache': { registerNewIPC: vi.fn() },
    './handlers/newMisc': { registerNewIPC: vi.fn() },
    './newErrorCollection': { registerNewIPC: vi.fn() },
    './handlers/newCommunication': { registerNewIPC: vi.fn() },
    './handlers/upgradeUtil': {
      initial: () => Promise.resolve(),
      registerNewIPC: vi.fn(),
      getLatestYakLocalEngine: vi.fn(),
    },
    './handlers/newEngineStatus': { registerNewIPC: vi.fn() },
    './handlers/yakLocal': yakLocal,
    './handlers/portScan2': portScan2,
  }
  const context = {
    module: { exports: {} },
    exports: {},
    require: (id) => stubs[id] ?? require(id),
    console,
    Promise,
    Date,
    setTimeout,
    clearTimeout,
    setImmediate,
    Buffer,
  }
  vm.runInNewContext(source, context)
  return { registerNewIPC: context.module.exports.registerNewIPC, handlers, portScan2, yakLocal }
}

describe('ipc.js Link registration', () => {
  it('calls portScan2.registerNewIPC instead of invoking the module object', () => {
    const { registerNewIPC, handlers, portScan2, yakLocal } = loadIpc()

    expect(() => registerNewIPC({}, 'EngineLink:')).not.toThrow()
    expect(portScan2.registerNewIPC).toHaveBeenCalledWith({}, expect.any(Function), 'EngineLink:')
    expect(yakLocal.registerNewIPC).toHaveBeenCalledWith({}, expect.any(Function), 'EngineLink:')
    expect(handlers.has('EngineLink:get-yakit-home-config')).toBe(true)
  })
})
