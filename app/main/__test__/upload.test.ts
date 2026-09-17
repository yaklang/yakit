// @vitest-environment node
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'
const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  http: vi.fn(),
  send: vi.fn(),
}))
vi.mock('../ipc/index', () => ({
  registerMainMethod: (name: string, callback: (...args: unknown[]) => unknown) => mocks.handlers.set(name, callback),
}))
vi.mock('../filePath', () => ({ getYakitInstallDir: () => '/unused', getYaklangEngineDir: () => '/unused' }))
vi.mock('../httpServer', () => ({ httpApi: mocks.http }))
vi.mock('../paths', () => ({ appPath: (...parts: string[]) => parts.join('/') }))
vi.mock('form-data', () => ({
  default: class {
    fields = new Map<string, unknown>()
    append(name: string, value: unknown) {
      this.fields.set(name, value)
    }
    getHeaders() {
      return {}
    }
  },
}))
import { registerTransferServices } from '../services/transfers'
class Sender extends EventEmitter {
  constructor(readonly id: number) {
    super()
  }
  isDestroyed() {
    return false
  }
}
let directory: string
beforeEach(() => {
  vi.clearAllMocks()
  mocks.handlers.clear()
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'yakit-upload-'))
  registerTransferServices()
})
afterEach(() => {
  fs.rmSync(directory, { recursive: true, force: true })
})
describe('local file uploads', () => {
  it('uploads exact adjacent OSS chunks and reports success after the final response', async () => {
    const file = path.join(directory, 'data.bin')
    const data = Buffer.alloc(20 * 1024 ** 2 + 3, 0x62)
    data[data.length - 3] = 0x01
    data[data.length - 2] = 0xff
    data[data.length - 1] = 0x80
    fs.writeFileSync(file, data)
    const chunks: Buffer[] = []
    mocks.http.mockImplementation(async ({ data: form }) => {
      const parts: Buffer[] = []
      for await (const part of form.fields.get('file')) parts.push(part)
      chunks.push(Buffer.concat(parts))
      expect(form.fields.get('totalChunks')).toBe('2')
      return { code: 200, data: { from: '/uploaded' } }
    })
    await expect(
      mocks.handlers.get('oss-split-upload')!(
        { path: file, type: 'notepad', url: 'fragment/upload' },
        { signal: new AbortController().signal, progress: mocks.send },
      ),
    ).resolves.toMatchObject({ TaskStatus: true })
    expect(chunks.map((chunk) => chunk.length)).toEqual([20 * 1024 ** 2, 3])
    expect(Buffer.concat(chunks).equals(data)).toBe(true)
    expect(mocks.send.mock.calls.at(-1)?.[0]).toMatchObject({ progress: 100, res: { code: 200 } })
  })
  it('cancels only the requesting operation', async () => {
    const signals: AbortSignal[] = []
    const completions: (() => void)[] = []
    mocks.http.mockImplementation(
      ({ signal }) =>
        new Promise((resolve, reject) => {
          signals.push(signal)
          completions.push(() => resolve({ code: 200, data: 'ok' }))
          signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
        }),
    )
    const one = new AbortController()
    const two = new AbortController()
    const params = {
      base64: 'data:image/png;base64,YQ==',
      imgInfo: { filename: 'a.png' },
      token: 'same',
      type: 'image',
      url: 'fragment/upload',
    }
    const first = mocks.handlers.get('split-upload')!(params, { signal: one.signal, progress: mocks.send })
    const second = mocks.handlers.get('split-upload')!(params, { signal: two.signal, progress: mocks.send })
    const firstResult = Promise.allSettled([first])
    await vi.waitFor(() => expect(signals).toHaveLength(2))
    one.abort()
    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)
    completions[1]()
    await expect(second).resolves.toMatchObject({ TaskStatus: true })
    expect((await firstResult)[0].status).toBe('rejected')
  })
})
