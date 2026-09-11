// @vitest-environment node
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { EventEmitter } = require('node:events')

function fixture(dispose, options = {}) {
  const handlers = new Map()
  const win = new EventEmitter()
  const lifecycle = new EventEmitter()
  const startup = { dispose, killOnExit: vi.fn() }
  const globalYakSetting = { defaultYakGRPCAddr: options.initialAddress || 'old.example:9000' }
  const callback = options.callback || vi.fn()
  const getClient = options.getClient || vi.fn()
  const newClient = options.newClient || vi.fn()
  const dependencies = {
    electron: { ipcMain: { handle: (name, handler) => handlers.set(name, handler) } },
    child_process: {},
    '../state': { GLOBAL_YAK_SETTING: globalYakSetting },
    '../filePath': {},
    '../logFile': {},
    './utils/engineStartup': options.useRealStartup
      ? require('../utils/engineStartup')
      : { createEngineStartup: () => startup },
  }
  const module = { exports: {} }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../newEngineStatus.js'), 'utf8'), {
    module,
    Buffer,
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`)
      return dependencies[name]
    },
    process: lifecycle,
  })
  module.exports.registerNewIPC(win, callback, getClient, newClient, 'test-')
  return {
    cancel: handlers.get('test-cancel-all-tasks'),
    connect: handlers.get('test-connect-yaklang-engine'),
    win,
    lifecycle,
    startup,
    callback,
    getClient,
    newClient,
    globalYakSetting,
  }
}

function echoClient(reply) {
  return {
    Echo: vi.fn((request, options, callback) => {
      reply({ request, options, callback })
      return { cancel: vi.fn() }
    }),
    close: vi.fn(),
  }
}

describe('startup cleanup IPC', () => {
  it.each([
    { ok: true, canceled: 1, status: 'cancelled' },
    { ok: false, canceled: 0, status: 'process_error', message: 'Engine process did not exit' },
  ])('preserves the cleanup result: $status', async (result) => {
    const { cancel } = fixture(vi.fn().mockResolvedValue(result))
    await expect(cancel()).resolves.toEqual(result)
  })

  it('does not resolve cancellation before cleanup finishes', async () => {
    let finish
    const { cancel } = fixture(vi.fn(() => new Promise((resolve) => (finish = resolve))))
    const settled = vi.fn()
    const pending = cancel().then(settled)
    await Promise.resolve()
    expect(settled).not.toHaveBeenCalled()
    const result = { ok: true, canceled: 1, status: 'cancelled' }
    finish(result)
    await pending
    expect(settled).toHaveBeenCalledWith(result)
  })

  it.each([true, false])('retains the process-exit fallback unless window cleanup succeeds: %s', async (ok) => {
    const { win, lifecycle, startup } = fixture(vi.fn().mockResolvedValue({ ok }))
    win.emit('closed')
    await new Promise(setImmediate)
    expect(lifecycle.listeners('exit')).toEqual(ok ? [] : [startup.killOnExit])
  })

  it('retains the process-exit fallback when window cleanup rejects', async () => {
    const { win, lifecycle, startup } = fixture(vi.fn().mockRejectedValue(new Error('cleanup failed')))
    win.emit('closed')
    await new Promise(setImmediate)
    expect(lifecycle.listeners('exit')).toEqual([startup.killOnExit])
  })
})

describe('engine connection IPC', () => {
  it.each([
    ['IPv4', { Host: '192.0.2.10', Port: 9011 }, '192.0.2.10:9011'],
    ['IPv6', { Host: '2001:db8::1', Port: 9012 }, '[2001:db8::1]:9012'],
    ['Host:Port', { Host: 'engine.example:9013', Port: 1 }, 'engine.example:9013'],
    ['bracketed IPv6 Host:Port', { Host: '[2001:db8::2]:9014', Port: 1 }, '[2001:db8::2]:9014'],
  ])('normalizes %s before probing', async (label, params, expectedAddress) => {
    const client = echoClient(({ request, callback }) => callback(null, { result: request.text }))
    const callback = vi.fn()
    const newClient = vi.fn(() => client)
    const { connect } = fixture(vi.fn(), { useRealStartup: true, callback, newClient })

    await expect(connect(null, { ...params, Mode: 'remote', PemBytes: '', Password: 'secret' })).resolves.toEqual({
      result: 'Hello Yakit!',
    })

    expect(newClient).toHaveBeenCalledWith({
      defaultYakGRPCAddr: expectedAddress,
      caPem: '',
      password: 'secret',
    })
    expect(callback).toHaveBeenCalledWith(expectedAddress, '', 'secret')
  })

  it.each([
    ['zero port', { Host: '127.0.0.1', Port: 0, Mode: 'remote', Password: 'secret' }],
    ['oversized port', { Host: '127.0.0.1', Port: 65536, Mode: 'remote', Password: 'secret' }],
    ['non-numeric port', { Host: '127.0.0.1', Port: 'grpc', Mode: 'remote', Password: 'secret' }],
    ['host containing whitespace', { Host: 'bad host', Port: 9011, Mode: 'remote', Password: 'secret' }],
    ['host containing a path', { Host: '../engine.sock', Port: 9011, Mode: 'remote', Password: 'secret' }],
    ['non-loopback local host', { Host: 'localhost', Port: 9011, Mode: 'local', Password: 'secret' }],
    ['empty local password', { Host: '127.0.0.1', Port: 9011, Mode: 'local', Password: '' }],
    ['masked local password', { Host: '127.0.0.1', Port: 9011, Mode: 'local', Password: '***' }],
    ['local password containing a newline', { Host: '127.0.0.1', Port: 9011, Mode: 'local', Password: 'bad\nsecret' }],
  ])('rejects %s before creating a probe client', async (label, params) => {
    const newClient = vi.fn()
    const callback = vi.fn()
    const { connect } = fixture(vi.fn(), { useRealStartup: true, callback, newClient })

    await expect(connect(null, params)).rejects.toThrow()

    expect(newClient).not.toHaveBeenCalled()
    expect(callback).not.toHaveBeenCalled()
  })

  it('preserves existing credentials and client when authentication fails', async () => {
    const oldClient = { close: vi.fn() }
    const callback = vi.fn(() => oldClient.close())
    const probeClient = echoClient(({ callback }) =>
      callback(Object.assign(new Error('unauthenticated'), { code: 16 })),
    )
    const newClient = vi.fn(() => probeClient)
    const { connect, globalYakSetting } = fixture(vi.fn(), {
      useRealStartup: true,
      initialAddress: 'old.example:9000',
      callback,
      newClient,
    })

    await expect(
      connect(null, { Host: 'new.example', Port: 9011, Mode: 'remote', PemBytes: 'new-ca', Password: 'new-secret' }),
    ).rejects.toThrow()

    expect(callback).not.toHaveBeenCalled()
    expect(oldClient.close).not.toHaveBeenCalled()
    expect(globalYakSetting.defaultYakGRPCAddr).toBe('old.example:9000')
  })

  it('commits local credentials only after authenticated and anonymous probes complete', async () => {
    const oldClient = { close: vi.fn() }
    const callback = vi.fn(() => oldClient.close())
    let probeCount = 0
    const newClient = vi.fn((connection) =>
      echoClient(({ request, callback: finishProbe }) => {
        probeCount++
        expect(callback).not.toHaveBeenCalled()
        expect(oldClient.close).not.toHaveBeenCalled()
        if (connection.password) finishProbe(null, { result: request.text })
        else finishProbe(Object.assign(new Error('unauthenticated'), { code: 16 }))
      }),
    )
    const { connect, globalYakSetting } = fixture(vi.fn(), {
      useRealStartup: true,
      initialAddress: 'old.example:9000',
      callback,
      newClient,
    })

    await expect(
      connect(null, { Host: '127.0.0.1', Port: 9011, Mode: 'local', PemBytes: 'local-ca', Password: 'secret' }),
    ).resolves.toEqual({ result: 'Hello Yakit!' })

    expect(probeCount).toBe(2)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('127.0.0.1:9011', 'local-ca', 'secret')
    expect(oldClient.close).toHaveBeenCalledTimes(1)
    expect(globalYakSetting.defaultYakGRPCAddr).toBe('127.0.0.1:9011')
  })
})
