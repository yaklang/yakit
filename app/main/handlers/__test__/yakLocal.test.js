// @vitest-environment node
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const source = readFileSync(path.resolve('app/main/handlers/yakLocal.js'), 'utf8')

function loadYakLocal() {
  const handlers = new Map()
  const setLocalCache = vi.fn()
  const deleteLocalCache = vi.fn()
  const stubs = {
    electron: {
      ipcMain: { handle: (channel, handler) => handlers.set(channel, handler), on: vi.fn() },
      dialog: {},
    },
    '../runtimePaths': { resourcePath: () => 'ps-yak-process-stub' },
    'ps-yak-process-stub': async () => [],
    './upgradeUtil': { getLatestYakLocalEngine: vi.fn() },
    '../localCache': { setLocalCache, deleteLocalCache },
    '../filePath': { getYakitHome: () => '/tmp' },
    '../security': { assertTrustedAppSender: vi.fn(), normalizePid: vi.fn() },
    './utils/engineSessionRuntime': { getEngineSession: () => ({ current: () => null }) },
    './utils/engineProcessDTO': { observedEngine: vi.fn() },
    'sudo-prompt': { exec: vi.fn() },
    child_process: { exec: vi.fn(), spawn: vi.fn() },
    fs: { existsSync: vi.fn(), statSync: vi.fn(), chmodSync: vi.fn() },
    os: { userInfo: () => ({ username: 'test' }) },
    process: { platform: 'linux', env: { PATH: '' } },
  }
  const context = {
    module: { exports: {} },
    exports: {},
    require: (id) => stubs[id] ?? require(id),
    console,
    Promise,
    Error,
    Map,
    Buffer,
    setTimeout,
    clearTimeout,
  }
  vm.runInNewContext(source, context)
  context.module.exports.registerNewIPC({}, vi.fn(), 'EngineLink:')
  return { handlers, setLocalCache, deleteLocalCache }
}

describe('Link edition IPC', () => {
  it('registers the prefixed edition handler and updates the edition cache', () => {
    const { handlers, setLocalCache, deleteLocalCache } = loadYakLocal()

    expect(handlers.has('EngineLink:set-release-edition-raw')).toBe(true)
    expect(handlers.get('EngineLink:set-release-edition-raw')({}, 'yakitEE')).toBe('')
    expect(deleteLocalCache).toHaveBeenCalledWith('REACT_APP_PLATFORM')
    expect(setLocalCache).toHaveBeenCalledWith('YAKIT_EDITION', 'yakitEE')
  })
})
