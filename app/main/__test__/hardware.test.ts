// @vitest-environment node
import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ handlers: new Map<string, (params: unknown, context: unknown) => unknown>() }))
vi.mock('../ipc/index', () => ({
  registerMainMethod: (api: string, handler: (params: unknown, context: unknown) => unknown) =>
    state.handlers.set(api, handler),
  invocationWindow: (context: { win: unknown }) => context.win,
}))
vi.mock('../filePath', () => ({
  getYaklangEngineDir: () => '/unused',
  getRemoteLinkDir: () => '/unused',
  getYakitInstallDir: () => '/unused',
}))
vi.mock('../logFile', () => ({ printLogOutputFile: vi.fn() }))
vi.mock('electron', () => ({ shell: { openPath: vi.fn() } }))
import { registerHardwareServices } from '../services/hardware'
class Contents extends EventEmitter {
  constructor(readonly id: number) {
    super()
  }
}
describe('window CPU sampling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    state.handlers.clear()
    registerHardwareServices()
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })
  it('replaces repeated starts and releases sampling on page navigation', () => {
    const contents = new Contents(1)
    const context = { win: { webContents: contents } }
    state.handlers.get('start-compute-percent')!({}, context)
    state.handlers.get('start-compute-percent')!({}, context)
    expect(vi.getTimerCount()).toBe(2)
    expect(contents.listenerCount('did-start-navigation')).toBe(1)
    contents.emit('did-start-navigation', {}, 'url', false, false)
    expect(vi.getTimerCount()).toBe(2)
    contents.emit('did-start-navigation', {}, 'url', false, true)
    expect(vi.getTimerCount()).toBe(0)
    expect(contents.listenerCount('destroyed')).toBe(0)
  })
  it('stopping one window leaves the other sampling independently', () => {
    const first = new Contents(1),
      second = new Contents(2)
    const one = { win: { webContents: first } },
      two = { win: { webContents: second } }
    state.handlers.get('start-compute-percent')!({}, one)
    state.handlers.get('start-compute-percent')!({}, two)
    state.handlers.get('clear-compute-percent')!({}, one)
    expect(vi.getTimerCount()).toBe(2)
    second.emit('destroyed')
    expect(vi.getTimerCount()).toBe(0)
  })
})
