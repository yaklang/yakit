// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import vm from 'vm'
import path from 'path'
import { loadSync } from '@grpc/proto-loader'

function harness(client) {
  const handlers = new Map()
  const context = {
    module: { exports: {} },
    require: () => ({
      assertTrustedAppSender: (event) => {
        if (!event.trusted) throw Error('untrusted')
      },
    }),
  }
  vm.runInNewContext(fs.readFileSync(new URL('../handlers/recommendedSkills.js', import.meta.url), 'utf8'), context)
  context.module.exports({ ipcMain: { handle: (name, fn) => handlers.set(name, fn) }, getClient: () => client })
  return handlers
}
describe('recommended skill IPC and real wire format', () => {
  it('rejects untrusted senders and malformed updates before calling the engine', () => {
    const update = vi.fn()
    const handlers = harness({ UpdateAIReActRecommendedSkill: update })
    expect(() => handlers.get('UpdateAIReActRecommendedSkill')({}, { Name: 'x', Content: '' })).toThrow('untrusted')
    expect(() => handlers.get('UpdateAIReActRecommendedSkill')({ trusted: true }, { Name: '', Content: '' })).toThrow(
      'name',
    )
    expect(() => handlers.get('UpdateAIReActRecommendedSkill')({ trusted: true }, { Name: 'x' })).toThrow('content')
    expect(update).not.toHaveBeenCalled()
  })
  it('passes content unchanged and returns errors without inventing success', async () => {
    const update = vi.fn((params, cb) => cb(null, params))
    const reset = vi.fn((_params, cb) => cb(Error('offline')))
    const handlers = harness({ UpdateAIReActRecommendedSkill: update, ResetAIReActRecommendedSkill: reset })
    await expect(
      handlers.get('UpdateAIReActRecommendedSkill')({ trusted: true }, { Name: 'x', Content: '## 文档\n$literal' }),
    ).resolves.toEqual({ Name: 'x', Content: '## 文档\n$literal' })
    await expect(handlers.get('ResetAIReActRecommendedSkill')({ trusted: true }, { Name: 'x' })).rejects.toThrow(
      'offline',
    )
    expect(() => handlers.get('GetAIReActRecommendedSkills')({ trusted: true })).toThrow('not supported')
  })
  it('exposes all three official RPCs and preserves skill metadata on the actual protobuf wire', () => {
    const definitions = loadSync(path.resolve(__dirname, '../../protos/grpc.proto'), { keepCase: true })
    const service = definitions['ypb.Yak']
    expect(service.GetAIReActRecommendedSkills).toBeDefined()
    expect(
      service.ResetAIReActRecommendedSkill.requestDeserialize(
        service.ResetAIReActRecommendedSkill.requestSerialize({ Name: 'audit' }),
      ),
    ).toEqual({ Name: 'audit' })
    const rpc = service.UpdateAIReActRecommendedSkill
    const skill = {
      Name: 'audit',
      Type: 'skill',
      DisplayNameZhCN: '审计',
      Description: 'test',
      Content: '# 审计',
      IsModified: true,
    }
    expect(rpc.responseDeserialize(rpc.responseSerialize(skill))).toEqual(skill)
  })
})
