// @vitest-environment node
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  save: vi.fn(),
  open: vi.fn(),
  show: vi.fn(),
  write: vi.fn(),
  close: vi.fn(),
}))
vi.mock('../ipc/events', () => ({
  legacyMethods: {
    handle: (name: string, handler: (...args: unknown[]) => unknown) => mocks.handlers.set(name, handler),
  },
  sendEvent: vi.fn(),
}))
vi.mock('electron', () => ({ shell: { showItemInFolder: mocks.show } }))
vi.mock('node:fs', () => ({ default: { promises: { open: mocks.open } } }))
vi.mock('../services/fileDialog', () => ({ handleSaveFileSystem: mocks.save }))
vi.mock('../toolsFunc', () => ({ Uint8ArrayToString: (data: Uint8Array) => new TextDecoder().decode(data) }))
import { saveHTTPFlowBody } from '../services/httpFlows'
import type { BrowserWindow } from 'electron'
import type { YakClient } from '../../shared/generated/grpc/types'

describe('HTTP body local download', () => {
  let stream: PassThrough & { cancel: ReturnType<typeof vi.fn> }
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.handlers.clear()
    mocks.write.mockResolvedValue(undefined)
    mocks.close.mockResolvedValue(undefined)
    mocks.open.mockResolvedValue({ writeFile: mocks.write, close: mocks.close })
    stream = Object.assign(new PassThrough({ objectMode: true }), { cancel: vi.fn() })
    const win = Object.assign(new EventEmitter(), { isDestroyed: () => false })
  })
  const download = () =>
    saveHTTPFlowBody(
      () => ({ GetHTTPFlowBodyById: () => stream }) as unknown as YakClient,
      { Id: '9223372036854775807' },
      new AbortController().signal,
    )

  it('settles cancellation from the save dialog and cancels the backend', async () => {
    mocks.save.mockResolvedValue({ canceled: true })
    const result = download()
    stream.write({ Filename: 'body.bin', Data: Buffer.from('data'), EOF: true })
    await expect(result).resolves.toBe(false)
    expect(stream.cancel).toHaveBeenCalledOnce()
    expect(mocks.open).not.toHaveBeenCalled()
  })

  it('waits for the last disk write and file close before reporting success', async () => {
    mocks.save.mockResolvedValue({ canceled: false, filePath: '/tmp/body.bin' })
    let release!: () => void
    mocks.write.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        release = resolve
      }),
    )
    const result = download()
    stream.write({ Filename: 'body.bin', Data: Buffer.from('data'), EOF: true })
    await vi.waitFor(() => expect(mocks.write).toHaveBeenCalled())
    expect(mocks.show).not.toHaveBeenCalled()
    release()
    await expect(result).resolves.toBe(true)
    expect(mocks.close).toHaveBeenCalledOnce()
    expect(mocks.show).toHaveBeenCalledWith('/tmp/body.bin')
  })

  it('rejects a truncated stream instead of reporting a completed download', async () => {
    mocks.save.mockResolvedValue({ canceled: false, filePath: '/tmp/body.bin' })
    const result = download()
    stream.end({ Filename: 'body.bin', Data: Buffer.from('partial'), EOF: false })
    await expect(result).rejects.toThrow('before EOF')
    expect(mocks.close).toHaveBeenCalledOnce()
    expect(mocks.show).not.toHaveBeenCalled()
  })
})
