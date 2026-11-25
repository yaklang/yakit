// @vitest-environment node
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const source = readFileSync(new URL('../handlers/assets.js', import.meta.url), 'utf8')

const register = () => {
  const handlers = new Map()
  const module = { exports: {} }
  runInNewContext(source, {
    module,
    require: (id) => {
      if (id === 'electron') return { ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) } }
      if (id === './handleStreamWithContext') return { cancelHandler: () => vi.fn() }
      return {}
    },
  })
  const client = {
    UploadRiskToOnlineBatch: vi.fn(),
    UploadRiskToOnline: vi.fn(),
    RiskFeedbackToOnline: vi.fn(),
  }
  module.exports({}, () => client)
  return { handlers, client }
}

describe('risk batch upload IPC', () => {
  it('forwards the selected scope without losing large IDs and returns both counts', async () => {
    const { handlers, client } = register()
    const params = {
      ToOnlineWhere: { Token: 'test-token', ProjectName: 'test-project' },
      UploadRisksWhere: { Ids: ['9007199254740993'] },
    }
    const result = { SuccessCount: '1', FailedCount: '0' }
    client.UploadRiskToOnlineBatch.mockImplementation((_, callback) => callback(null, result))
    await expect(handlers.get('UploadRiskToOnlineBatch')({}, params)).resolves.toEqual(result)
    expect(client.UploadRiskToOnlineBatch).toHaveBeenCalledWith(params, expect.any(Function))
    expect(client.UploadRiskToOnline).not.toHaveBeenCalled()
  })

  it('propagates RPC failures without falling back to the old all-risk upload', async () => {
    const { handlers, client } = register()
    const error = new Error('12 UNIMPLEMENTED')
    client.UploadRiskToOnlineBatch.mockImplementation((_, callback) => callback(error))
    await expect(handlers.get('UploadRiskToOnlineBatch')({}, {})).rejects.toBe(error)
    expect(client.UploadRiskToOnline).not.toHaveBeenCalled()
  })

  it('keeps login synchronization and false-positive feedback on their existing RPCs', async () => {
    const { handlers, client } = register()
    for (const [channel, rpc] of [
      ['upload-risk-to-online', client.UploadRiskToOnline],
      ['RiskFeedbackToOnline', client.RiskFeedbackToOnline],
    ]) {
      rpc.mockImplementation((_, callback) => callback(null, {}))
      await expect(handlers.get(channel)({}, { Token: 'test-token' })).resolves.toEqual({})
      expect(rpc).toHaveBeenCalledOnce()
    }
    expect(client.UploadRiskToOnlineBatch).not.toHaveBeenCalled()
  })
})
