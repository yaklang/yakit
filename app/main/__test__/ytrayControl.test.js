import fs from 'fs'
import net from 'net'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  claimYTrayLaunchApproval,
  listYTrayBrowserHistory,
  restoreYTrayBrowserInstance,
} from '../handlers/ytrayControl'

let server
let directory

afterEach(async () => {
  if (server) await new Promise((resolve) => server.close(resolve))
  if (directory) fs.rmSync(directory, { recursive: true, force: true })
  server = undefined
  directory = undefined
})

describe('YTray native history bridge', () => {
  it('lists history and restores the selected instance over the native protocol', async () => {
    const calls = []
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ytray-control-'))
    const socketPath = path.join(directory, 'control.sock')
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
    await new Promise((resolve) => server.listen(socketPath, resolve))

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
  })
})
