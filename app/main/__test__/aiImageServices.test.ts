import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
const fixture = vi.hoisted(() => ({ directory: '' }))
vi.mock('../filePath', () => ({ getAiImageTemp: () => fixture.directory, getYakProjects: () => fixture.directory }))
vi.mock('../ipc/index', () => ({ registerMainMethod: vi.fn() }))
import { saveAIImage, deleteAIImages } from '../services/ai'

beforeEach(async () => {
  fixture.directory = await fs.mkdtemp(path.join(os.tmpdir(), 'yakit-ai-image-'))
})
afterEach(async () => {
  await fs.rm(fixture.directory, { recursive: true, force: true })
})
const params = () => ({
  chatDataStoreKey: 'history',
  sessionID: 'session',
  filename: 'file.png',
  buffer: new Uint8Array([0, 255, 128]),
})

describe('AI image local tasks', () => {
  it('preserves bytes and leaves an existing file untouched on a filename collision', async () => {
    const request = params(),
      progress = vi.fn()
    const destination = await saveAIImage(request, new AbortController().signal, progress)
    expect([...(await fs.readFile(destination))]).toEqual([0, 255, 128])
    await expect(
      saveAIImage({ ...request, buffer: new Uint8Array([1]) }, new AbortController().signal, progress),
    ).rejects.toMatchObject({ code: 'EEXIST' })
    expect([...(await fs.readFile(destination))]).toEqual([0, 255, 128])
  })

  it('removes an incomplete file when canceled between chunks', async () => {
    const request = { ...params(), buffer: new Uint8Array(150 * 1024) }
    const controller = new AbortController()
    await expect(saveAIImage(request, controller.signal, () => controller.abort())).rejects.toMatchObject({
      code: 'ABORTED',
    })
    await expect(fs.stat(path.join(fixture.directory, 'history', 'session', 'file.png'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('deletes only the selected session and rejects path traversal', async () => {
    await saveAIImage(params(), new AbortController().signal, () => {})
    const other = await saveAIImage({ ...params(), sessionID: 'other' }, new AbortController().signal, () => {})
    await deleteAIImages(
      { chatDataStoreKey: 'history', sessionID: ['session'] },
      new AbortController().signal,
      () => {},
    )
    expect((await fs.stat(other)).isFile()).toBe(true)
    await expect(deleteAIImages({ chatDataStoreKey: '..' }, new AbortController().signal, () => {})).rejects.toThrow(
      'Invalid AI image path',
    )
  })
})
