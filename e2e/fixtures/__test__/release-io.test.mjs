import { afterEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { download, run } from '../../../scripts/release/io.mjs'

vi.mock('node:child_process', () => ({ spawn: vi.fn() }))

const directories = []
afterEach(async () => {
  vi.mocked(spawn).mockReset()
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function destination() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'release-download-'))
  directories.push(directory)
  const file = path.join(directory, 'engine')
  await writeFile(file, 'curl output bytes')
  return file
}

function curlExit(code, httpStatus, signal = null) {
  vi.mocked(spawn).mockImplementation(() => {
    const child = new EventEmitter()
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()
    queueMicrotask(() => {
      child.stdout.emit('data', Buffer.from(httpStatus))
      child.emit('close', code, signal)
    })
    return child
  })
}

describe('engine download curl status handling', () => {
  it('returns false only for an optional curl 22 / HTTP 404 and deletes partial bytes', async () => {
    const file = await destination()
    curlExit(22, '404')
    await expect(download('https://example.invalid/engine', file, { optional: true })).resolves.toBe(false)
    await expect(stat(file)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it.each([
    [true, 22, '401'],
    [true, 22, '403'],
    [true, 22, '500'],
    [true, 28, '000'],
    [true, 28, '404'],
    [true, 7, '404'],
    [false, 22, '404'],
  ])('rejects optional=%s curl=%s HTTP=%s and removes partial bytes', async (optional, code, httpStatus) => {
    const file = await destination()
    curlExit(code, httpStatus)
    await expect(download('https://example.invalid/engine', file, { optional })).rejects.toMatchObject({ code })
    await expect(stat(file)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects a killed curl process even when its last HTTP response was 404', async () => {
    const file = await destination()
    curlExit(null, '404', 'SIGTERM')
    await expect(download('https://example.invalid/engine', file, { optional: true })).rejects.toThrow('SIGTERM')
    await expect(stat(file)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('preserves the downloaded file after success', async () => {
    const file = await destination()
    curlExit(0, '200')
    await expect(download('https://example.invalid/engine', file, { optional: true })).resolves.toBe(true)
    expect(await readFile(file, 'utf8')).toBe('curl output bytes')
    const [command, args, options] = spawn.mock.calls[0]
    expect(command).toBe(process.platform === 'win32' ? 'curl.exe' : 'curl')
    expect(args).toContain('--fail')
    expect(args.slice(args.indexOf('--write-out'))).toEqual([
      '--write-out',
      '%{http_code}',
      'https://example.invalid/engine',
    ])
    expect(options.stdio).toEqual(['ignore', 'pipe', 'pipe'])
  })
})

describe('command failure diagnostics', () => {
  it('includes an explicit safe label and preserves exit metadata', async () => {
    curlExit(128, 'partial output')
    await expect(run('git', ['fetch', 'origin'], { capture: true, label: 'git fetch' })).rejects.toMatchObject({
      message: 'git fetch failed (128): ',
      code: 128,
      stdout: 'partial output',
    })
    expect(spawn.mock.calls[0][2]).not.toHaveProperty('label')
  })

  it('labels spawn errors while preserving their error code', async () => {
    vi.mocked(spawn).mockImplementation(() => {
      const child = new EventEmitter()
      queueMicrotask(() => child.emit('error', Object.assign(new Error('spawn git ENOENT'), { code: 'ENOENT' })))
      return child
    })
    await expect(run('git', ['fetch', 'origin'], { label: 'git fetch' })).rejects.toMatchObject({
      message: 'git fetch: spawn git ENOENT',
      code: 'ENOENT',
    })
  })

  it('does not include potentially sensitive arguments in default diagnostics', async () => {
    curlExit(22, '403')
    const error = await run('curl', ['-H', 'Authorization: secret'], { capture: true }).catch((error) => error)
    expect(error.message).toBe('curl failed (22): ')
    expect(error.message).not.toContain('secret')
  })
})
