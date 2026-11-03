import { describe, expect, it } from 'vitest'
import path from 'path'
import { loadSync } from '@grpc/proto-loader'

describe('official AI runtime context wire format', () => {
  it('preserves the official runtime hotpatch on the real StartAIReAct wire format', () => {
    const definitions = loadSync(path.resolve(__dirname, '../../protos/grpc.proto'), { keepCase: true, longs: String })
    const method = definitions['ypb.Yak'].StartAIReAct
    const decoded = method.requestDeserialize(
      method.requestSerialize({
        IsConfigHotpatch: true,
        HotpatchType: 'RuntimeContextSizeLimit',
        Params: { RuntimeContextSizeLimit: 614400 },
      }),
    )
    expect(decoded).toEqual({
      IsConfigHotpatch: true,
      HotpatchType: 'RuntimeContextSizeLimit',
      Params: { RuntimeContextSizeLimit: '614400' },
    })
    expect(decoded.Params).not.toHaveProperty('TimelineContentSizeLimit')
    expect(decoded).not.toHaveProperty('IsStart')
    expect(decoded).not.toHaveProperty('IsFreeInput')
  })
  it('serializes RuntimeContextSizeLimit with official field number 51, without losing the selected Forge', () => {
    const definitions = loadSync(path.resolve(__dirname, '../../protos/grpc.proto'), {
      keepCase: true,
      longs: String,
    })
    const message = definitions['ypb.AIStartParams']
    expect(message.type.field.find((field) => field.name === 'RuntimeContextSizeLimit').number).toBe(51)
    const method = definitions['ypb.Yak'].StartAIReAct
    const decoded = method.requestDeserialize(
      method.requestSerialize({
        IsStart: true,
        Params: { RuntimeContextSizeLimit: 307200, ForgeName: 'employee-forge', EnablePlan: true },
      }),
    )
    expect(decoded.Params).toMatchObject({
      RuntimeContextSizeLimit: '307200',
      ForgeName: 'employee-forge',
      EnablePlan: true,
    })
    expect(decoded.Params).not.toHaveProperty('TimelineContentSizeLimit')
  })
})
