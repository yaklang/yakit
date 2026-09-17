// @vitest-environment node
import { PassThrough } from 'node:stream'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('axios', () => ({ default: { get: mocks.get } }))
vi.mock('../filePath', () => ({ getYaklangEngineDir: () => '/unused-engine' }))
import { cancelRequestProgress, requestWithProgress } from '../services/downloadTask'

describe('independent download tasks', () => {
  let directory: string
  beforeEach(async () => {
    mocks.get.mockReset()
    directory = await mkdtemp(path.join(tmpdir(), 'yakit-download-test-'))
  })
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true })
  })

  it('cancels only the selected download and finishes the other after disk flush', async () => {
    const a = new PassThrough()
    const b = new PassThrough()
    mocks.get.mockResolvedValueOnce({ data: a, headers: {} }).mockResolvedValueOnce({ data: b, headers: {} })
    const errorA = vi.fn()
    const endA = vi.fn()
    const endB = vi.fn()
    const pathA = path.join(directory, 'a')
    const pathB = path.join(directory, 'b')
    requestWithProgress('https://example.test/a', pathA, {}, undefined, endA, errorA)
    requestWithProgress('https://example.test/b', pathB, {}, undefined, endB)
    a.write('partial')
    b.write('first')
    await vi.waitFor(async () => expect((await stat(pathA)).size).toBeGreaterThan(0))
    await cancelRequestProgress(pathA)
    expect(errorA).toHaveBeenCalledOnce()
    expect(endA).not.toHaveBeenCalled()
    await expect(stat(pathA)).rejects.toMatchObject({ code: 'ENOENT' })
    b.end('second')
    await vi.waitFor(() => expect(endB).toHaveBeenCalledOnce())
    expect(await readFile(pathB, 'utf8')).toBe('firstsecond')
  })

  it('cancels a request before HTTP headers arrive without creating a file', async () => {
    const error = vi.fn()
    const end = vi.fn()
    mocks.get.mockImplementation(
      (_url, config) =>
        new Promise((_resolve, reject) => {
          config.signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true })
        }),
    )
    const destination = path.join(directory, 'pending')
    requestWithProgress('https://example.test/a', destination, {}, undefined, end, error)
    await cancelRequestProgress(destination)
    expect(error).toHaveBeenCalledOnce()
    expect(end).not.toHaveBeenCalled()
    await expect(stat(destination)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects a duplicate destination while preserving its active download', async () => {
    const stream = new PassThrough()
    mocks.get.mockResolvedValue({ data: stream, headers: {} })
    const end = vi.fn()
    const error = vi.fn()
    const destination = path.join(directory, 'same')
    requestWithProgress('https://example.test/a', destination, {}, undefined, end)
    requestWithProgress('https://example.test/b', destination, {}, undefined, undefined, error)
    expect(error).toHaveBeenCalledOnce()
    expect(mocks.get).toHaveBeenCalledOnce()
    stream.end('original')
    await vi.waitFor(() => expect(end).toHaveBeenCalledOnce())
    expect(await readFile(destination, 'utf8')).toBe('original')
  })
  it('aborting a rejected duplicate cannot cancel the active owner of the path', async () => {
    const stream = new PassThrough()
    mocks.get.mockResolvedValue({ data: stream, headers: {} })
    const destination = path.join(directory, 'owned')
    const first = new AbortController()
    const duplicate = new AbortController()
    const end = vi.fn()
    const error = vi.fn()
    requestWithProgress('https://example.test/a', destination, { signal: first.signal }, undefined, end)
    requestWithProgress(
      'https://example.test/b',
      destination,
      { signal: duplicate.signal },
      undefined,
      undefined,
      error,
    )
    duplicate.abort()
    expect(error).toHaveBeenCalledOnce()
    stream.end('owner data')
    await vi.waitFor(() => expect(end).toHaveBeenCalledOnce())
    expect(await readFile(destination, 'utf8')).toBe('owner data')
  })

  it('propagates page cancellation before HTTP headers without writing a file', async () => {
    const controller = new AbortController()
    const error = vi.fn()
    mocks.get.mockImplementation(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        }),
    )
    const destination = path.join(directory, 'page')
    requestWithProgress(
      'https://example.test/a',
      destination,
      { signal: controller.signal },
      undefined,
      undefined,
      error,
    )
    controller.abort()
    await vi.waitFor(() => expect(error).toHaveBeenCalledOnce())
    await expect(stat(destination)).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
