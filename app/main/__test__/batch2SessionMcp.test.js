// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { loadSync } from '@grpc/proto-loader'
const require = createRequire(import.meta.url)
function loadHandler(file, dependencies) {
  const module = { exports: {} }
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../handlers', file), 'utf8'), {
    module,
    require: (name) => dependencies[name] || require(name),
    console,
    setTimeout,
    clearTimeout,
  })
  return module.exports
}
describe('client MCP history wire and guarded IPC', () => {
  it('roundtrips official pagination, detail payloads and delete filters', () => {
    const definitions = loadSync(path.resolve(__dirname, '../../protos/grpc.proto'), { keepCase: true, longs: String })
    const api = definitions['ypb.Yak']
    const query = { Keyword: 'review', Status: 'failed', Pagination: { Page: 2, Limit: 30 } }
    expect(
      api.QueryMCPToolCallHistory.requestDeserialize(api.QueryMCPToolCallHistory.requestSerialize(query)),
    ).toMatchObject({ ...query, Pagination: { Page: '2', Limit: '30' } })
    const detail = {
      ID: '7',
      ToolName: 'review',
      Arguments: '{"x":1}',
      Result: '{}',
      ErrorMessage: 'error',
      ClientName: 'Senso',
      SessionID: 'session',
    }
    expect(
      api.GetMCPToolCallHistoryDetail.responseDeserialize(api.GetMCPToolCallHistoryDetail.responseSerialize(detail)),
    ).toMatchObject(detail)
    const filter = { DeleteFiltered: true, Keyword: 'review', Status: 'failed' }
    expect(
      api.DeleteMCPToolCallHistory.requestDeserialize(api.DeleteMCPToolCallHistory.requestSerialize(filter)),
    ).toMatchObject(filter)
  })
  it('checks the sender and reports unavailable methods without modifying server credentials', async () => {
    const handlers = new Map(),
      guard = vi.fn((event) => {
        if (!event.trusted) throw new Error('untrusted sender')
      })
    const query = vi.fn((params, callback) => callback(null, { Histories: [] }))
    loadHandler('mcpServere.js', {
      electron: { ipcMain: { handle: (name, fn) => handlers.set(name, fn) } },
      '../security': { assertTrustedAppSender: guard },
    })(null, () => ({ QueryMCPToolCallHistory: query }))
    await expect(handlers.get('QueryMCPToolCallHistory')({ trusted: false }, {})).rejects.toThrow('untrusted')
    expect(query).not.toHaveBeenCalled()
    await expect(handlers.get('QueryMCPToolCallHistory')({ trusted: true }, { Keyword: 'a' })).resolves.toEqual({
      Histories: [],
    })
    await expect(handlers.get('GetMCPToolCallHistoryDetail')({ trusted: true }, { ID: 3 })).rejects.toThrow(
      'does not expose',
    )
  })
  it('emits end immediately after cancelling the actual transport token', async () => {
    const handlers = new Map(),
      send = vi.fn(),
      cancel = vi.fn(),
      write = vi.fn(),
      on = vi.fn()
    const stream = { cancel, write, on }
    const win = { isDestroyed: () => false, webContents: { send } }
    const streamHelper = require('../handlers/handleStreamWithContext.js')
    loadHandler('ai-agent.js', {
      electron: { ipcMain: { handle: (name, fn) => handlers.set(name, fn) }, shell: {} },
      './handleStreamWithContext': streamHelper,
      '../filePath': {},
      fs,
      path,
    })(win, () => ({ StartAIReAct: () => stream }))
    await handlers.get('start-ai-re-act')({}, 'transport-token', {
      IsStart: true,
      Params: { TimelineSessionID: 'business-id' },
    })
    await handlers.get('cancel-ai-re-act')({}, 'transport-token')
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith('transport-token-end')
    expect(send).not.toHaveBeenCalledWith('business-id-end')
  })
})
