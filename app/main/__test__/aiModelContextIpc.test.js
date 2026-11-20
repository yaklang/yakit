import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const registerContextHandlers = (client) => {
  const handlers = new Map()
  const module = { exports: {} }
  vm.runInNewContext(fs.readFileSync(path.resolve('app/main/handlers/ai-agent.js'), 'utf8'), {
    module,
    require: (name) => {
      if (name === 'electron') return { ipcMain: { handle: (name, callback) => handlers.set(name, callback) } }
      if (name === './handleStreamWithContext') return { cancelHandler: () => vi.fn() }
      return {}
    },
    console,
  })
  module.exports({}, () => client)
  return handlers
}

describe('model context IPC', () => {
  it.each(['GetAIModelContext', 'SetAIModelContext'])('%s rejects a gRPC failure', async (method) => {
    const error = Object.assign(new Error('12 UNIMPLEMENTED: unsupported'), { code: 12 })
    const client = { [method]: vi.fn((_params, done) => done(error)) }
    const handlers = registerContextHandlers(client)
    await expect(handlers.get(method)({}, { ContextKey: 'key' })).rejects.toBe(error)
  })

  it('passes the automatic-adjustment false value through unchanged', async () => {
    const params = { ContextKey: 'key', ThresholdTokens: 0, DisableAutoAdjust: false }
    const saved = { ContextKey: 'key', ThresholdTokens: '600000', DisableAutoAdjust: false }
    const client = { SetAIModelContext: vi.fn((_params, done) => done(null, saved)) }
    const handlers = registerContextHandlers(client)
    expect(await handlers.get('SetAIModelContext')({}, params)).toBe(saved)
    expect(client.SetAIModelContext.mock.calls[0][0]).toEqual(params)
  })
})
