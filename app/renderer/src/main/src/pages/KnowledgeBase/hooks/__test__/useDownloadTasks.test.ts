import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StreamOptions, GrpcOutput } from '@/services/ipc'
const fixture = vi.hoisted(() => ({ open: vi.fn() }))
vi.mock('@/services/ipc', () => ({ ipc: { openStream: fixture.open } }))
import { createDownloadTasks } from '../useDownloadTasks'

type Options = StreamOptions<GrpcOutput<'DownloadRAGs'>>
beforeEach(() => {
  fixture.open.mockReset()
  fixture.open.mockResolvedValue({})
})

describe('knowledge base download ownership', () => {
  it('receives data and end before the opening promise resolves', async () => {
    const onData = vi.fn()
    fixture.open.mockImplementation((_namespace, _api, _params, options: Options) => {
      options.onData?.({ Progress: 1 } as GrpcOutput<'DownloadRAGs'>)
      options.onEnd?.()
      return Promise.resolve({})
    })
    const tasks = createDownloadTasks()
    await tasks.run('DownloadRAGs', { All: true }, { key: 'all', onData })
    expect(onData).toHaveBeenCalledOnce()
    tasks.dispose()
  })

  it('settles every pending promise on page disposal and ignores subsequent packets', async () => {
    const tasks = createDownloadTasks()
    const onData = vi.fn()
    const first = tasks.run('DownloadRAGs', { All: true }, { key: 'all', onData })
    const second = tasks.run('InstallThirdPartyBinary', { Name: 'binary' }, { key: 'binary' })
    const options: Options = fixture.open.mock.calls[0][3]
    const results = Promise.allSettled([first, second])
    tasks.dispose()
    options.onData?.({ Progress: 1 } as GrpcOutput<'DownloadRAGs'>)
    expect(onData).not.toHaveBeenCalled()
    expect(options.signal?.aborted).toBe(true)
    expect(await results).toMatchObject([
      { status: 'rejected', reason: { code: 'ABORTED' } },
      { status: 'rejected', reason: { code: 'ABORTED' } },
    ])
  })

  it('does not let completion of an older instance settle the replacement', async () => {
    const tasks = createDownloadTasks()
    const first = tasks.run('DownloadRAGs', {}, { key: 'same' })
    const old: Options = fixture.open.mock.calls[0][3]
    old.onEnd?.()
    await first
    const next = tasks.run('DownloadRAGs', {}, { key: 'same' })
    const finished = vi.fn()
    void next.then(finished)
    old.onEnd?.()
    await Promise.resolve()
    expect(finished).not.toHaveBeenCalled()
    fixture.open.mock.calls[1][3].onEnd()
    await next
  })

  it('keeps identical UI keys in separate pages independent', async () => {
    const firstPage = createDownloadTasks(),
      secondPage = createDownloadTasks()
    const first = firstPage.run('DownloadRAGs', {}, { key: 'same' })
    const second = secondPage.run('DownloadRAGs', {}, { key: 'same' })
    const failed = expect(first).rejects.toMatchObject({ code: 'ABORTED' })
    firstPage.dispose()
    await failed
    const secondOptions: Options = fixture.open.mock.calls[1][3]
    expect(secondOptions.signal?.aborted).toBe(false)
    // The SDK generates transport tokens; a UI key does not become a window-wide stream token.
    expect(secondOptions.token).toBeUndefined()
    secondOptions.onEnd?.()
    await second
  })
})
