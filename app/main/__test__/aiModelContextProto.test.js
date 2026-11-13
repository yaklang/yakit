import path from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const definition = protoLoader.loadSync(path.resolve(process.cwd(), 'app/protos/grpc.proto'), {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
})
const { ypb } = grpc.loadPackageDefinition(definition)

describe('model context gRPC contract', () => {
  it('preserves explicit false and omitted mode edits across RPC and hotpatch serialization', () => {
    const set = ypb.Yak.service.SetAIModelContext
    const stream = ypb.Yak.service.StartAIReAct
    for (const disabled of [true, false]) {
      const request = { Provider: 'test', Model: 'model', DisableAutoAdjust: disabled }
      expect(set.requestDeserialize(set.requestSerialize(request))).toMatchObject({ DisableAutoAdjust: disabled })
      const patch = {
        IsConfigHotpatch: true,
        HotpatchType: 'RuntimeContextSizeLimit',
        Params: { AIService: 'test', AIModelName: 'model', DisableContextAutoAdjust: disabled },
      }
      expect(stream.requestDeserialize(stream.requestSerialize(patch)).Params).toMatchObject({
        DisableContextAutoAdjust: disabled,
      })
    }
    expect(
      set.requestDeserialize(set.requestSerialize({ Provider: 'test', Model: 'model', ThresholdTokens: 500 * 1000 })),
    ).not.toHaveProperty('DisableAutoAdjust')
  })

  it('preserves model identity and the token budget without a session', () => {
    const get = ypb.Yak.service.GetAIModelContext
    const set = ypb.Yak.service.SetAIModelContext
    const owner = '00000000-0000-4000-8000-000000000001'
    const identity = { Provider: 'openai', Model: 'test-model', ContextKey: `${owner}:${'a'.repeat(64)}` }
    const Config = { ModelName: identity.Model, ContextOwnerId: owner, Provider: { Type: identity.Provider } }
    expect(get.requestDeserialize(get.requestSerialize({ Config }))).toMatchObject({ Config })
    expect(get.requestDeserialize(get.requestSerialize(identity))).toMatchObject(identity)
    expect(set.requestDeserialize(set.requestSerialize({ ...identity, ThresholdTokens: 600 * 1000 }))).toMatchObject({
      ...identity,
      ThresholdTokens: String(600 * 1000),
    })
    const response = {
      ...identity,
      ThresholdTokens: '52224',
      MinimumThresholdTokens: '100000',
      Source: 'learned',
      DisableAutoAdjust: false,
    }
    expect(get.responseDeserialize(get.responseSerialize(response))).toEqual(response)
  })
})
