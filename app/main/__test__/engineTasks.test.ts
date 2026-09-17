// @vitest-environment node
import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'
import type { GrpcClient } from '../ipc/grpc'
const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  spawn: vi.fn(),
  log: vi.fn(),
}))
vi.mock('../ipc/index', () => ({
  registerMainMethod: (name: string, callback: (...args: unknown[]) => unknown) => mocks.handlers.set(name, callback),
}))
vi.mock('../ipc/events', () => ({ sendEvent: vi.fn() }))
vi.mock('node:child_process', () => ({ default: { spawn: mocks.spawn, exec: vi.fn() } }))
vi.mock('../filePath', () => ({ getLocalYaklangEngine: () => '/tmp/yak', getYakitHome: () => '/tmp/yakit' }))
vi.mock('../logFile', () => ({ engineLogOutputFileAndUI: mocks.log, engineLogOutputUI: mocks.log }))
import { registerStartupTasks } from '../services/startup'
class Child extends EventEmitter {
  stdout = new EventEmitter()
  stderr = new EventEmitter()
  kill = vi.fn(() => {
    this.emit('close', null)
    return true
  })
  unref = vi.fn()
}
const invoke = (name: string, params?: unknown, signal = new AbortController().signal) =>
  mocks.handlers.get(name)!(params ?? {}, { signal })

describe('engine command lifecycle', () => {
  let children: Child[]
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mocks.handlers.clear()
    children = []
    mocks.spawn.mockImplementation(() => {
      const child = new Child()
      children.push(child)
      return child
    })
    registerStartupTasks(
      { once: vi.fn(), webContents: {} } as unknown as BrowserWindow,
      vi.fn(),
      () => ({}) as GrpcClient,
    )
  })
  afterEach(() => {
    for (const child of children) child.emit('close', 0)
    vi.useRealTimers()
  })
  it.each([
    ['check-allow-secret-local-yaklang-engine', { port: 9011, softwareVersion: 'yakit' }],
    ['fixup-database', { softwareVersion: 'yakit' }],
    ['reclaimDatabaseSpace', { dbPath: ['/tmp/database.db'] }],
    ['start-secret-local-yaklang-engine', { port: 9011, softwareVersion: 'yakit', password: 'test' }],
  ])('settles %s when cancelled', async (name, params) => {
    const result = invoke(name, params)
    expect(invoke('cancel-all-tasks')).toEqual({ ok: true, canceled: 1 })
    await expect(result).resolves.toMatchObject({ ok: false, status: 'cancelled' })
    expect(children[0].kill).toHaveBeenCalledOnce()
    expect(invoke('cancel-all-tasks')).toEqual({ ok: true, canceled: 0 })
  })
  it('settles a replaced check and accepts only the new check result', async () => {
    const params = { port: 9011, softwareVersion: 'yakit' }
    const first = invoke('check-allow-secret-local-yaklang-engine', params)
    const second = invoke('check-allow-secret-local-yaklang-engine', params)
    await expect(first).resolves.toMatchObject({ status: 'cancelled' })
    children[0].stdout.emit('data', Buffer.from('<json-test>{"ok":false}</json-test>'))
    children[1].stdout.emit('data', Buffer.from('<json-test>{"ok":true}</json-test>'))
    children[1].emit('close', 0)
    await expect(second).resolves.toMatchObject({ ok: true, status: 'success' })
  })
  it('returns a structured failure for malformed vacuum statistics', async () => {
    const result = invoke('reclaimDatabaseSpace', { dbPath: ['/tmp/db'] })
    children[0].stdout.emit(
      'data',
      Buffer.from('<52ed804604e783e3b12860e8676f78a1>{"databases":false}<52ed804604e783e3b12860e8676f78a1>'),
    )
    expect(() => children[0].emit('close', 0)).not.toThrow()
    await expect(result).resolves.toMatchObject({ ok: false, status: 'invalid_response' })
  })
  it('an old caller’s abort cannot cancel its replacement', async () => {
    const first = new AbortController()
    const second = new AbortController()
    const params = { port: 9011, softwareVersion: 'yakit' }
    const a = invoke('check-allow-secret-local-yaklang-engine', params, first.signal)
    const b = invoke('check-allow-secret-local-yaklang-engine', params, second.signal)
    await expect(a).resolves.toMatchObject({ status: 'cancelled' })
    first.abort()
    expect(children[1].kill).not.toHaveBeenCalled()
    second.abort()
    await expect(b).resolves.toMatchObject({ status: 'cancelled' })
    expect(children[1].kill).toHaveBeenCalledOnce()
  })
})
