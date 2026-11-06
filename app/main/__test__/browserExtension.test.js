// @vitest-environment node
import { EventEmitter } from 'events'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import vm from 'vm'

function harness() {
  const callbacks = new Map()
  const trust = vi.fn((event) => {
    if (!event.trusted) throw new Error('untrusted')
  })
  const stream = new EventEmitter()
  stream.cancel = vi.fn()
  const client = {
    ExecuteBrowserExtensionTask: vi.fn(() => stream),
    RequestYakURL: vi.fn((_params, cb) => cb(null, { Resources: [] })),
  }
  const context = {
    module: { exports: {} },
    require: (name) => {
      if (name === '../security') return { assertTrustedAppSender: trust }
      throw new Error(name)
    },
  }
  vm.runInNewContext(fs.readFileSync(new URL('../handlers/browserExtension.js', import.meta.url), 'utf8'), context)
  context.module.exports({ ipcMain: { handle: (name, fn) => callbacks.set(name, fn) }, getClient: () => client })
  const sender = (id) => Object.assign(new EventEmitter(), { id, send: vi.fn(), isDestroyed: () => false })
  return { callbacks, client, stream, sender }
}
describe('trusted browser bridge IPC', () => {
  it('rejects untrusted callers and non-browser URLs before contacting the engine', () => {
    const h = harness()
    const handler = h.callbacks.get('BrowserExtensionRequest')
    expect(() => handler({ trusted: false }, {})).toThrow('untrusted')
    expect(() => handler({ trusted: true }, { Method: 'GET', Url: { Schema: 'file', Location: 'local' } })).toThrow(
      'Invalid browser bridge URL',
    )
    expect(h.client.RequestYakURL).not.toHaveBeenCalled()
  })
  it('scopes cancellation and stream delivery to the initiating renderer', () => {
    const h = harness()
    const a = h.sender(1),
      b = h.sender(2)
    h.callbacks.get('ExecuteBrowserExtensionTask')({ trusted: true, sender: a }, { TaskId: 'token' }, 'token')
    h.callbacks.get('cancel-ExecuteBrowserExtensionTask')({ trusted: true, sender: b }, 'token')
    expect(h.stream.cancel).not.toHaveBeenCalled()
    h.stream.emit('data', { Type: 'result' })
    expect(a.send).toHaveBeenCalledWith('token-data', { Type: 'result' })
    expect(b.send).not.toHaveBeenCalled()
    a.emit('destroyed')
    expect(h.stream.cancel).toHaveBeenCalledTimes(1)
  })
  it('rejects duplicate tasks and removes ownership after stream end', () => {
    const h = harness()
    const sender = h.sender(1),
      event = { trusted: true, sender }
    const execute = h.callbacks.get('ExecuteBrowserExtensionTask')
    execute(event, { TaskId: 'token' }, 'token')
    expect(() => execute(event, { TaskId: 'token' }, 'token')).toThrow('Duplicate')
    h.stream.emit('end')
    expect(sender.listenerCount('destroyed')).toBe(0)
  })
})
