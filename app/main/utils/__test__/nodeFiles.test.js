// @vitest-environment node
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const source = readFileSync(path.resolve('app/main/utils/nodeFiles.js'), 'utf8')

function loadNodeFiles(statImpl = () => ({ size: 42 })) {
  const handlers = new Map()
  const statSync = vi.fn(statImpl)
  const stubs = {
    electron: {
      app: { getPath: vi.fn(() => '/tmp') },
      ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    },
    fs: { statSync },
    path,
    compressing: { zip: { uncompress: vi.fn() } },
    './fileSystemDialog': { handleSaveFileSystem: vi.fn() },
    '../filePath': { getHtmlTemplateDir: vi.fn(() => '/tmp') },
  }
  const context = {
    module: { exports: {} },
    exports: {},
    require: (id) => stubs[id] ?? require(id),
    console,
    Promise,
    Error,
    Map,
  }
  vm.runInNewContext(source, context)
  context.module.exports.register({}, vi.fn())
  return { handlers, statSync }
}

describe('main window file IPC', () => {
  it('returns only the file size instead of the full Stats object', async () => {
    const { handlers } = loadNodeFiles(() => ({ size: 42, mtimeMs: 1, mode: 0o644 }))

    await expect(handlers.get('fetch-file-info-by-path')({}, '/tmp/targets.txt')).resolves.toEqual({ size: 42 })
  })

  it('rejects when statSync fails', async () => {
    const { handlers } = loadNodeFiles(() => {
      throw new Error('missing file')
    })

    await expect(handlers.get('fetch-file-info-by-path')({}, '/tmp/missing.txt')).rejects.toThrow('missing file')
  })
})
