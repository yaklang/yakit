import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const mainDirectory = path.resolve(__dirname, '..')

const loadCommonJS = (filename, requireModule) => {
  const module = { exports: {} }
  vm.runInNewContext(
    fs.readFileSync(filename, 'utf8'),
    {
      module,
      exports: module.exports,
      require: requireModule,
      __dirname: path.dirname(filename),
    },
    { filename },
  )
  return module.exports
}

describe('engine-link IPC startup', () => {
  it('registers the real port-scan file handler without aborting startup', async () => {
    const handlers = new Map()
    const ipcMain = {
      handle: vi.fn((channel, handler) => {
        if (handlers.has(channel)) throw new Error(`Duplicate handler: ${channel}`)
        handlers.set(channel, handler)
      }),
    }
    const fileHandlers = loadCommonJS(path.join(mainDirectory, 'handlers/portScan2.js'), (id) => {
      if (id === 'electron') return { ipcMain }
      if (id === 'fs') return {}
      if (id === './portScan') return { parseXlsx: vi.fn() }
      if (id === '../security') return { assertExpectedWindowSender: vi.fn() }
      if (id === '../fileAccessPolicy') return { assertFileAccess: vi.fn() }
      throw new Error(`Unexpected file-handler dependency: ${id}`)
    })
    const registrationStub = {
      registerNewIPC: vi.fn(),
      initial: () => Promise.resolve(),
    }
    const ipc = loadCommonJS(path.join(mainDirectory, 'ipc.js'), (id) => {
      if (id === 'electron') return { ipcMain }
      if (id === 'path') return path
      if (id === 'fs') return { readdirSync: () => [] }
      if (id === '@grpc/proto-loader') return { loadSync: () => ({}) }
      if (id === '@grpc/grpc-js') return { loadPackageDefinition: () => ({ ypb: { Yak: vi.fn() } }) }
      if (id === './handlers/portScan2') return fileHandlers
      if (id === './state') return { HttpSetting: {} }
      if (['./logFile', './security', './memfitLicense', './filePath'].includes(id)) return {}
      return registrationStub
    })

    expect(() => ipc.registerNewIPC({}, 'EngineLink:')).not.toThrow()
    await Promise.resolve()
    expect(handlers.get('EngineLink:fetch-file-content')).toBeTypeOf('function')
    expect(handlers.get('EngineLink:fetch-yaklang-engine-addr')()).toEqual({
      addr: '127.0.0.1:8087',
      isTLS: false,
    })
  })
})
