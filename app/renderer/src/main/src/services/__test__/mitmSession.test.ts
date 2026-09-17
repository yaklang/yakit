import { beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({ invoke: vi.fn(), openStream: vi.fn() }))
vi.mock('@/services/ipc', () => ({ ipc: sdk }))
beforeEach(() => {
  vi.resetModules()
  sdk.invoke.mockReset()
  sdk.openStream.mockReset()
})
const task = () => ({
  token: 'token',
  instanceId: 'instance',
  write: vi.fn().mockResolvedValue(undefined),
  cancel: vi.fn().mockResolvedValue(undefined),
})

describe('renderer MITM session ownership', () => {
  it('waits for opening before writing to the same instance', async () => {
    const active = task()
    let finish!: (value: typeof active) => void
    sdk.openStream.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const { mitmV2Session } = await import('../../pages/mitm/mitmSession')
    const opening = mitmV2Session.open({})
    const writing = mitmV2Session.write({ RecoverContext: true })
    expect(active.write).not.toHaveBeenCalled()
    finish(active)
    await opening
    await writing
    expect(active.write).toHaveBeenCalledWith({ RecoverContext: true })
  })

  it('does not resurrect a stopped session from a late status reply', async () => {
    let finish!: (value: { haveStream: boolean }) => void
    sdk.invoke.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    const { mitmSession } = await import('../../pages/mitm/mitmSession')
    const checking = mitmSession.status()
    await mitmSession.stop()
    finish({ haveStream: true })
    await checking
    expect(sdk.openStream).not.toHaveBeenCalled()
  })

  it('reattaches an existing backend and binds upload to its new identity', async () => {
    sdk.invoke.mockResolvedValue({ haveStream: true })
    sdk.openStream.mockResolvedValue(task())
    const { mitmV2Session } = await import('../../pages/mitm/mitmSession')
    await mitmV2Session.status()
    expect(sdk.openStream).toHaveBeenCalledWith('grpc', 'MITMV2', {}, expect.objectContaining({ resume: true }))
    await mitmV2Session.upload({ TaskID: 'job', FilePath: '/tmp/upload' })
    expect(sdk.invoke).toHaveBeenLastCalledWith(
      'local',
      'ReplaceMITMRequestFile',
      { TaskID: 'job', FilePath: '/tmp/upload', token: 'token', instanceId: 'instance' },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('unsubscribes one consumer without removing other consumers', async () => {
    sdk.openStream.mockResolvedValue(task())
    const { mitmV2Session } = await import('../../pages/mitm/mitmSession')
    const first = vi.fn(),
      second = vi.fn()
    const off = mitmV2Session.on('loading', first)
    mitmV2Session.on('loading', second)
    await mitmV2Session.open({})
    off()
    sdk.openStream.mock.calls[0][3].onData({ HaveLoadingSetter: true, LoadingFlag: true, Replacers: [] })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith(true)
  })
})
