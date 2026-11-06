const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { EventEmitter } = require('node:events')

const fixture = () => {
  const handlers = new Map()
  const contents = Object.assign(new EventEmitter(), { id: 1, mainFrame: {} })
  const event = { sender: contents, senderFrame: contents.mainFrame }
  const requests = []
  const client = {
    FetchHTTPPreviewResource: vi.fn((params, options, callback) => {
      const call = { cancel: vi.fn(() => callback({ code: 1 })), callback, params, options }
      requests.push(call)
      return call
    }),
  }
  const module = { exports: {} }
  vm.runInNewContext(fs.readFileSync(path.join(process.cwd(), 'app/main/handlers/httpPreview.js'), 'utf8'), {
    module,
    Map,
    Date,
    Promise,
    Error,
    require: (name) =>
      name === 'electron'
        ? { ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) } }
        : {
            assertTrustedAppSender: vi.fn((e) => {
              if (e.untrusted) throw new Error('untrusted')
            }),
          },
  })
  module.exports({ webContents: contents }, () => client)
  return {
    event,
    contents,
    requests,
    client,
    fetch: (...args) => handlers.get('FetchHTTPPreviewResource')(...args),
    cancel: (...args) => handlers.get('cancel-FetchHTTPPreviewResource')(...args),
  }
}

describe('HTTP preview IPC isolation', () => {
  it('returns an explicit offline fallback for UNIMPLEMENTED, without invoking another engine API', async () => {
    const f = fixture()
    const pending = f.fetch(f.event, { URL: 'https://target/image' }, 'token')
    expect(f.requests[0].options.deadline).toBeGreaterThan(Date.now())
    f.requests[0].callback({ code: 12 })
    await expect(pending).resolves.toEqual({ Unsupported: true })
    expect(Object.keys(f.client)).toEqual(['FetchHTTPPreviewResource'])
  })

  it('rejects iframe and untrusted-window callers and cancellation', () => {
    const f = fixture()
    expect(() => f.fetch({ ...f.event, senderFrame: {} }, {}, 'token')).toThrow()
    expect(() =>
      f.fetch({ ...f.event, untrusted: true, sender: { id: 2, mainFrame: f.event.senderFrame } }, {}, 'token'),
    ).toThrow()
    expect(() => f.cancel({ ...f.event, untrusted: true }, 'token')).toThrow()
    expect(() => f.fetch(f.event, {}, '../token')).toThrow()
    expect(f.client.FetchHTTPPreviewResource).not.toHaveBeenCalled()
  })

  it('keeps independent preview windows and their cancellation tokens separate', async () => {
    const f = fixture()
    const second = Object.assign(new EventEmitter(), { id: 2, mainFrame: {} })
    const event = { sender: second, senderFrame: second.mainFrame }
    const a = f.fetch(f.event, {}, 'same-token').catch((e) => e)
    const b = f.fetch(event, {}, 'same-token').catch((e) => e)
    f.cancel(event, 'same-token')
    await b
    expect(f.requests[0].cancel).not.toHaveBeenCalled()
    expect(f.requests[1].cancel).toHaveBeenCalledOnce()
    f.contents.emit('destroyed')
    await a
    expect(f.requests[0].cancel).toHaveBeenCalledOnce()
  })

  it('cancels the underlying gRPC call when the preview is cancelled', async () => {
    const f = fixture()
    const pending = f.fetch(f.event, {}, 'token').catch((e) => e)
    f.cancel(f.event, 'token')
    await pending
    expect(f.requests[0].cancel).toHaveBeenCalledOnce()
  })

  it.each(['destroyed', 'render-process-gone', 'did-start-navigation'])(
    'cancels pending calls on %s',
    async (event) => {
      const f = fixture()
      const pending = f.fetch(f.event, {}, 'token').catch((e) => e)
      f.contents.emit(event, {}, 'next', false, true)
      await pending
      expect(f.requests[0].cancel).toHaveBeenCalledOnce()
    },
  )
  it.each([
    ['main document navigation', 'main', 'did-start-navigation', false, true, [1, 0]],
    ['main in-place navigation', 'main', 'did-start-navigation', true, true, [0, 0]],
    ['second document navigation', 'second', 'did-start-navigation', false, true, [0, 1]],
    ['second in-place navigation', 'second', 'did-start-navigation', true, true, [0, 0]],
    ['main subframe navigation', 'main', 'did-start-navigation', false, false, [0, 0]],
    ['main destruction', 'main', 'destroyed', false, true, [1, 0]],
    ['main renderer crash', 'main', 'render-process-gone', false, true, [1, 0]],
  ])('isolates cleanup on %s', async (_name, target, eventName, inPlace, mainFrame, expected) => {
    const f = fixture()
    const second = Object.assign(new EventEmitter(), { id: 2, mainFrame: {} })
    const secondEvent = { sender: second, senderFrame: second.mainFrame }
    const a = f.fetch(f.event, {}, 'same-token').catch((e) => e)
    const b = f.fetch(secondEvent, {}, 'same-token').catch((e) => e)
    const owner = target === 'main' ? f.contents : second
    owner.emit(eventName, {}, 'next', inPlace, mainFrame)
    expect(f.requests.map((call) => call.cancel.mock.calls.length)).toEqual(expected)
    for (const call of f.requests) call.callback(null, {})
    await Promise.all([a, b])
  })
})
