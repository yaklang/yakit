// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'
import type { YakClient } from '../../shared/generated/grpc/types'
const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  execFile: vi.fn(),
  access: vi.fn(),
  log: vi.fn(),
  roles: new Map<string, string[]>(),
}))
vi.mock('../ipc/index', () => ({
  registerMainMethod: (name: string, callback: (...args: unknown[]) => unknown, roles: string[]) => {
    mocks.handlers.set(name, callback)
    mocks.roles.set(name, roles)
  },
}))
vi.mock('electron', () => ({ shell: { showItemInFolder: vi.fn() } }))
vi.mock('node:child_process', () => ({ execFile: mocks.execFile }))
vi.mock('node:fs', () => ({ default: { promises: { access: mocks.access }, constants: { X_OK: 1 } } }))
vi.mock('../filePath', () => ({
  getYakitHome: () => '/tmp/upgrade-test',
  getRemoteLinkDir: vi.fn(),
  getYaklangEngineDir: vi.fn(),
  getBasicDir: vi.fn(),
  getRemoteLinkFile: vi.fn(),
  getCodeDir: vi.fn(),
  loadExtraFilePath: vi.fn(),
  getYakitInstallDir: vi.fn(),
}))
vi.mock('../services/downloadClient', () => ({
  downloadYakitEE: vi.fn(),
  downloadYakitCommunity: vi.fn(),
  downloadIntranetYakit: vi.fn(),
  downloadYakEngine: vi.fn(),
  getDownloadUrl: vi.fn(),
  getSuffix: () => '',
  fetchSpecifiedYakVersionHash: vi.fn(),
}))
vi.mock('../services/downloadTask', () => ({
  engineCancelRequestWithProgress: vi.fn(),
  yakitCancelRequestWithProgress: vi.fn(),
}))
vi.mock('../services/engineVersion', () => ({
  getLocalEngineCacheName: vi.fn(),
  writeEngineBuildType: vi.fn(),
  writeEngineBuildTypeByVersion: vi.fn(),
  fetchEngineBuildType: vi.fn(),
  getLatestYakLocalEnginePath: () => '/tmp/upgrade-test/yak',
  fileSha256: vi.fn(),
  getOssEngineVersion: vi.fn(),
}))
vi.mock('../logFile', () => ({ engineLogOutputFileAndUI: mocks.log }))
import { registerUpdates } from '../services/updates'
const window = { webContents: {} } as BrowserWindow
const client = () => ({}) as YakClient

describe('shared engine upgrade registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.handlers.clear()
    mocks.access.mockResolvedValue(undefined)
  })
  it('registers shared entry points once and preserves role restrictions', () => {
    registerUpdates(window)
    expect(mocks.roles.get('get-current-yak')).toEqual(['main', 'link'])
    expect(mocks.roles.get('install-yak-engine')).toEqual(['main', 'link'])
    expect(mocks.roles.get('generate-chrome-plugin')).toEqual(['main'])
    expect([...mocks.handlers.keys()].some((name) => name.startsWith('EngineLink'))).toBe(false)
  })
  it('shares simultaneous version queries and retries after a failed command', async () => {
    let complete!: (error: Error | null, result?: { stdout: string; stderr: string }) => void
    mocks.execFile.mockImplementation((_file, _args, _options, callback) => {
      complete = callback
    })
    registerUpdates(window)
    const getVersion = () => mocks.handlers.get('get-current-yak')!({}, { signal: new AbortController().signal })
    const a = getVersion()
    const b = getVersion()
    const failures = Promise.allSettled([a, b])
    await vi.waitFor(() => expect(mocks.execFile).toHaveBeenCalledOnce())
    complete(new Error('engine unavailable'))
    expect((await failures).map((entry) => entry.status)).toEqual(['rejected', 'rejected'])
    const retry = getVersion()
    await vi.waitFor(() => expect(mocks.execFile).toHaveBeenCalledTimes(2))
    complete(null, { stdout: 'yak version 1.4.8', stderr: '' })
    await expect(retry).resolves.toBe('1.4.8')
    await expect(getVersion()).resolves.toBe('1.4.8')
    expect(mocks.execFile).toHaveBeenCalledTimes(2)
  })
  it('settles malformed version output instead of leaving callers pending', async () => {
    mocks.execFile.mockImplementation((_file, _args, _options, callback) =>
      callback(null, { stdout: 'unknown output', stderr: '' }),
    )
    registerUpdates(window)
    await expect(mocks.handlers.get('get-current-yak')!({}, { signal: new AbortController().signal })).rejects.toThrow(
      '引擎无法获取',
    )
  })
})
