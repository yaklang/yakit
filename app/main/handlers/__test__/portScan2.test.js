// @vitest-environment node
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const source = readFileSync(path.resolve('app/main/handlers/portScan2.js'), 'utf8')

function loadPortScan2(statImpl = () => ({ size: 42 })) {
  const handlers = new Map()
  const statSync = vi.fn(statImpl)
  const readFile = vi.fn((_file, _encoding, callback) => callback(null, 'a,b\n1,2'))
  const context = {
    module: { exports: {} },
    exports: {},
    require: (id) =>
      ({
        electron: { ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) } },
        fs: { statSync, readFile },
        './portScan': { parseXlsx: vi.fn() },
      })[id] ?? require(id),
    console,
    Promise,
    Error,
    Map,
  }
  vm.runInNewContext(source, context)
  context.module.exports.registerNewIPC({}, vi.fn(), 'EngineLink:')
  return { handlers, statSync, readFile }
}

describe('Link file IPC', () => {
  it('registers prefixed file content and file info handlers', () => {
    const { handlers } = loadPortScan2()

    expect(handlers.has('EngineLink:fetch-file-content')).toBe(true)
    expect(handlers.has('EngineLink:fetch-file-info-by-path')).toBe(true)
  })

  it('reads text content through the prefixed handler', async () => {
    const { handlers } = loadPortScan2()

    await expect(handlers.get('EngineLink:fetch-file-content')({}, '/tmp/targets.txt')).resolves.toBe('a,b\n1,2')
  })

  it('returns only the file size when statSync succeeds', async () => {
    const { handlers } = loadPortScan2(() => ({ size: 42, mtimeMs: 1 }))

    await expect(handlers.get('EngineLink:fetch-file-info-by-path')({}, '/tmp/targets.txt')).resolves.toEqual({
      size: 42,
    })
  })

  it('rejects the prefixed file info handler when statSync fails', async () => {
    const { handlers } = loadPortScan2(() => {
      throw new Error('missing file')
    })

    await expect(handlers.get('EngineLink:fetch-file-info-by-path')({}, '/tmp/missing.txt')).rejects.toThrow(
      'missing file',
    )
  })
})
