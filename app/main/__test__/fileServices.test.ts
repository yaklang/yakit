import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { LocalMethods } from '../../shared/communication/local-methods'

const state = vi.hoisted(() => ({
  handlers: new Map<string, (params: unknown, context: { signal: AbortSignal }) => unknown>(),
  save: vi.fn(),
}))
vi.mock('../ipc/index', () => ({
  registerMainMethod: (api: string, handler: (params: unknown, context: { signal: AbortSignal }) => unknown) =>
    state.handlers.set(api, handler),
}))
vi.mock('electron', () => ({ app: { getPath: () => '' }, dialog: { showSaveDialog: state.save } }))
vi.mock('../filePath', () => ({
  getYakProjects: () => '/unused',
  getYakitHome: () => '/unused',
  getLocalYaklangEngine: () => undefined,
  getLocalYaklangEngineAbsPath: () => '/unused',
}))
vi.mock('../services/fileDialog', () => ({ handleSaveFileSystem: state.save }))
import { registerFileServices } from '../services/files'

function invoke<Api extends keyof LocalMethods>(api: Api, params: LocalMethods[Api]['request']) {
  return Promise.resolve().then(() => state.handlers.get(api)!(params, { signal: new AbortController().signal }))
}

describe('local file operations through the shared dispatcher', () => {
  let directory: string
  beforeEach(async () => {
    directory = await fs.mkdtemp(path.join(os.tmpdir(), 'yakit-files-'))
    state.handlers.clear()
    state.save.mockReset()
    // The window is passed only to the mocked Electron dialog.
    registerFileServices(undefined as never)
  })
  afterEach(async () => {
    await fs.rm(directory, { recursive: true, force: true })
  })

  it('preserves binary data and permits clearing an existing file', async () => {
    const route = path.join(directory, 'packet.bin')
    await invoke('write-file', { route, data: new Uint8Array([0, 255, 128]) })
    expect([...(await fs.readFile(route))]).toEqual([0, 255, 128])
    await invoke('write-file', { route, data: '' })
    expect((await fs.stat(route)).size).toBe(0)
  })

  it('returns a plain metadata object and preserves file-not-found errors', async () => {
    const route = path.join(directory, 'packet.bin')
    await fs.writeFile(route, 'abc')
    const result = await invoke('fetch-file-info-by-path', route)
    expect(result).toMatchObject({ size: 3, isDirectory: false })
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
    await expect(invoke('fetch-file-info-by-path', path.join(directory, 'missing'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(invoke('assert-file-absent', route)).rejects.toMatchObject({ code: 'EEXIST' })
    await expect(invoke('assert-file-absent', path.join(directory, 'missing'))).resolves.toBeUndefined()
  })

  it('settles a canceled save and rejects the original dialog failure', async () => {
    state.save.mockResolvedValueOnce({ canceled: true })
    await expect(invoke('show-save-dialog', 'packet.bin')).resolves.toEqual({ canceled: true, name: '' })
    const failure = new Error('Native dialog unavailable')
    state.save.mockRejectedValueOnce(failure)
    await expect(invoke('show-save-dialog', 'packet.bin')).rejects.toBe(failure)
  })
})
