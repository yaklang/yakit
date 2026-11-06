// @vitest-environment node
import fs from 'fs'
import net from 'net'
import os from 'os'
import path from 'path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  claimYTrayLaunchApproval,
  listYTrayBrowserHistory,
  restoreYTrayBrowserInstance,
} from '../handlers/ytrayControl'

let server
let directory
let socketPath

function loadHistoryBridge(endpoint, assertTrustedAppSender = vi.fn()) {
  const handlers = new Map()
  const ipcMain = {
    removeHandler: (channel) => handlers.delete(channel),
    handle: (channel, callback) => handlers.set(channel, callback),
  }
  const require = createRequire(import.meta.url)
  const mainContext = {
    module: { exports: {} },
    process: { platform: 'darwin' },
    Buffer,
    require: (name) => (name === 'net' ? { createConnection: () => net.createConnection(endpoint) } : require(name)),
  }
  vm.runInNewContext(fs.readFileSync(new URL('../handlers/ytrayControl.js', import.meta.url), 'utf8'), mainContext)
  mainContext.module.exports.registerYTrayControlHandlers({ ipcMain, assertTrustedAppSender })

  const invoke = vi.fn((channel) => handlers.get(channel)({}))
  let onLoaded
  const preloadContext = {
    process: {
      argv: [],
      on: (_event, callback) => {
        onLoaded = callback
      },
    },
    window: { addEventListener: vi.fn() },
    require: () => ({ ipcRenderer: { on: vi.fn(), invoke } }),
  }
  vm.runInNewContext(fs.readFileSync(new URL('../preload.js', import.meta.url), 'utf8'), preloadContext)
  onLoaded()
  return { invoke, listHistory: preloadContext.window.yakitBridge.managedBrowser.listYTrayHistory }
}

afterEach(async () => {
  if (server) await new Promise((resolve) => server.close(resolve))
  if (directory) fs.rmSync(directory, { recursive: true, force: true })
  server = undefined
  directory = undefined
  socketPath = undefined
})

/** Windows 上 Temp 目录无法 listen Unix socket（EACCES），改用命名管道 */
function createControlEndpoint() {
  if (process.platform === 'win32') {
    return {
      directory: undefined,
      socketPath: `\\\\.\\pipe\\ytray-test-${process.pid}-${Date.now()}`,
    }
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytray-control-'))
  return { directory: dir, socketPath: path.join(dir, 'control.sock') }
}

describe('YTray native history bridge', () => {
  it('lists history and restores the selected instance over the native protocol', async () => {
    const calls = []
    ;({ directory, socketPath } = createControlEndpoint())
    server = net.createServer((socket) => {
      let request = ''
      socket.setEncoding('utf8')
      socket.on('data', (chunk) => {
        request += chunk
        if (!request.includes('\n')) return
        const message = JSON.parse(request.slice(0, request.indexOf('\n')))
        calls.push(message)
        const response =
          message.action === 'list_history'
            ? {
                ok: true,
                instances: [
                  {
                    id: '00000000-0000-4000-8000-000000000001',
                    name: 'Browser A',
                    status: 'stopped',
                    runtime: 'Chrome',
                    startedAt: 1_795_000_000_000,
                  },
                ],
              }
            : message.action === 'claim_launch_approval'
              ? { ok: true, approved: true, reason: '' }
              : { ok: true }
        socket.end(`${JSON.stringify(response)}\n`)
      })
    })
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(socketPath, resolve)
    })

    await expect(listYTrayBrowserHistory(socketPath)).resolves.toEqual([
      expect.objectContaining({ id: '00000000-0000-4000-8000-000000000001', name: 'Browser A' }),
    ])
    await expect(
      restoreYTrayBrowserInstance('00000000-0000-4000-8000-000000000001', socketPath),
    ).resolves.toBeUndefined()
    await expect(
      claimYTrayLaunchApproval('00000000-0000-4000-8000-000000000001', 'pairing-1', socketPath),
    ).resolves.toEqual({ approved: true, reason: '' })
    expect(calls).toEqual([
      { action: 'list_history' },
      { action: 'restore_history', id: '00000000-0000-4000-8000-000000000001' },
      {
        action: 'claim_launch_approval',
        id: '00000000-0000-4000-8000-000000000001',
        requestId: 'pairing-1',
      },
    ])

    const bridge = loadHistoryBridge(socketPath)
    await expect(bridge.listHistory()).resolves.toEqual([
      expect.objectContaining({ id: '00000000-0000-4000-8000-000000000001', name: 'Browser A' }),
    ])
    await expect(bridge.invoke.mock.results[0].value).resolves.toMatchObject({ ok: true })
  })

  it('resolves the IPC request when YTray is absent but still rejects the renderer call', async () => {
    ;({ directory, socketPath } = createControlEndpoint())
    const bridge = loadHistoryBridge(socketPath)

    await expect(bridge.listHistory()).rejects.toThrow(
      "Error invoking remote method 'ListYTrayBrowserHistory': Error: 无法连接 YTray，请确认 YTray 已启动：",
    )
    await expect(bridge.invoke.mock.results[0].value).resolves.toEqual({
      ok: false,
      error: expect.stringContaining('无法连接 YTray，请确认 YTray 已启动：'),
    })
  })

  it('keeps untrusted sender failures outside the quiet history response', async () => {
    const assertTrustedAppSender = vi.fn(() => {
      throw new Error('Untrusted sender')
    })
    const bridge = loadHistoryBridge(undefined, assertTrustedAppSender)

    await expect(bridge.listHistory()).rejects.toThrow('Untrusted sender')
    await expect(bridge.invoke.mock.results[0].value).rejects.toThrow('Untrusted sender')
    expect(assertTrustedAppSender).toHaveBeenCalledWith({}, 'ListYTrayBrowserHistory')
  })
})
