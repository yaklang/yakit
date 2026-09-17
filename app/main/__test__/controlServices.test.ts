import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({ spawn: vi.fn(), processes: vi.fn(), kill: vi.fn() }))
vi.mock('node:child_process', () => ({ spawn: fixture.spawn, default: { spawn: fixture.spawn } }))
vi.mock('../filePath', () => ({ getLocalYaklangEngine: () => '/test/yak' }))
vi.mock('../services/processes', () => ({ psYakList: fixture.processes, killYakGRPC: fixture.kill }))
vi.mock('../ipc/index', () => ({ registerMainMethod: vi.fn() }))
import { asyncKillDynamicControl, startDynamicControl } from '../services/control'

const params = { server: '127.0.0.1:1234', secret: 'test', note: '', gen_tls_crt: false }
const makeChild = () =>
  Object.assign(new EventEmitter(), {
    pid: 123,
    stdout: new EventEmitter(),
    stderr: { resume: vi.fn() },
    kill: vi.fn(),
  })
let child: ReturnType<typeof makeChild>
beforeEach(() => {
  vi.useFakeTimers()
  child = makeChild()
  fixture.spawn.mockReturnValue(child)
  fixture.processes.mockResolvedValue([{ pid: 123, ppid: 123 }])
  fixture.kill.mockResolvedValue(undefined)
})
afterEach(async () => {
  await asyncKillDynamicControl()
  vi.useRealTimers()
})

describe('local control startup cancellation', () => {
  it('cancels and settles a startup during its readiness delay', async () => {
    const controller = new AbortController()
    const result = startDynamicControl(params, controller.signal)
    const rejected = expect(result).rejects.toMatchObject({ code: 'ABORTED' })
    child.stdout.emit('data', Buffer.from('yak grpc ok'))
    controller.abort()
    await rejected
    expect(child.kill).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rejects a process that exits after reporting readiness but before startup completes', async () => {
    const result = startDynamicControl(params, new AbortController().signal)
    const rejected = expect(result).rejects.toThrow('exited before startup')
    child.stdout.emit('data', Buffer.from('yak grpc ok'))
    child.emit('close', 1)
    await rejected
    expect(vi.getTimerCount()).toBe(0)
  })

  it('handles a split readiness message and prevents duplicate startup', async () => {
    const result = startDynamicControl(params, new AbortController().signal)
    await expect(startDynamicControl(params, new AbortController().signal)).rejects.toThrow('already starting')
    child.stdout.emit('data', Buffer.from('yak gr'))
    child.stdout.emit('data', Buffer.from('pc ok'))
    await vi.advanceTimersByTimeAsync(1000)
    await expect(result).resolves.toEqual({ alive: false })
    await expect(startDynamicControl(params, new AbortController().signal)).resolves.toEqual({ alive: true })
    expect(child.kill).not.toHaveBeenCalled()
  })
})
