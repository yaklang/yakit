import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GrpcOutput, StreamOptions } from '@/services/ipc'
const fixture = vi.hoisted(() => ({ open: vi.fn(), invoke: vi.fn() }))
vi.mock('@/services/ipc', () => ({ ipc: { openStream: fixture.open, invoke: fixture.invoke } }))
import { getCodeByPath } from '../readFile'
type Options = StreamOptions<GrpcOutput<'ReadFile'>>
const frame = (Data: Uint8Array, EOF = false) => ({ Data, EOF }) as GrpcOutput<'ReadFile'>
beforeEach(() => {
  fixture.open.mockReset()
  fixture.open.mockResolvedValue({})
  fixture.invoke.mockReset()
})

describe('page-owned file reads', () => {
  it('decodes UTF-8 split across packets and accepts EOF before open resolves', async () => {
    const bytes = new TextEncoder().encode('文件🙂')
    fixture.open.mockImplementation((_namespace, _api, _params, options: Options) => {
      options.onData?.(frame(bytes.slice(0, 2)))
      options.onData?.(frame(bytes.slice(2, 7)))
      options.onData?.(frame(bytes.slice(7), true))
      return Promise.resolve({})
    })
    await expect(getCodeByPath('/engine/file')).resolves.toBe('文件🙂')
    expect(fixture.invoke).not.toHaveBeenCalled()
  })

  it('cancels only the requested read and never falls back after cancellation', async () => {
    const controller = new AbortController()
    const first = getCodeByPath('/first', undefined, controller.signal)
    const second = getCodeByPath('/second')
    const rejected = expect(first).rejects.toMatchObject({ code: 'ABORTED' })
    controller.abort()
    await rejected
    expect(fixture.open.mock.calls[0][3].signal.aborted).toBe(true)
    const next: Options = fixture.open.mock.calls[1][3]
    expect(next.signal?.aborted).toBe(false)
    next.onData?.(frame(new TextEncoder().encode('second'), true))
    await expect(second).resolves.toBe('second')
    expect(fixture.invoke).not.toHaveBeenCalled()
  })

  it('preserves audit filesystem failures without reading a host file of the same name', async () => {
    const failure = new Error('audit file missing')
    fixture.open.mockRejectedValue(failure)
    await expect(getCodeByPath('/project/file', 'audit')).rejects.toBe(failure)
    expect(fixture.invoke).not.toHaveBeenCalled()
  })

  it('passes cancellation through to the local-file fallback', async () => {
    fixture.open.mockRejectedValue(new Error('engine unavailable'))
    const controller = new AbortController()
    fixture.invoke.mockImplementation(
      (_namespace, _api, _path, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { code: 'ABORTED' })), {
            once: true,
          }),
        ),
    )
    const result = getCodeByPath('/host/file', undefined, controller.signal)
    const rejected = expect(result).rejects.toMatchObject({ code: 'ABORTED' })
    await Promise.resolve()
    expect(fixture.invoke).toHaveBeenCalledWith('local', 'read-file-content', '/host/file', {
      signal: controller.signal,
    })
    controller.abort()
    await rejected
  })
})
