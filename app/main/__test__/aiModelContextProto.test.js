import path from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const definitions = protoLoader.loadSync(path.resolve(process.cwd(), 'app/protos/grpc.proto'), {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
})
const { ypb } = grpc.loadPackageDefinition(definitions)

describe('model context protocol', () => {
  it.each([undefined, false, true])('preserves optional automatic adjustment (%s)', (disabled) => {
    const method = ypb.Yak.service.SetAIModelContext
    const params = {
      Provider: 'openai',
      Model: 'model',
      ContextKey: 'opaque-key',
      ThresholdTokens: 0,
      ...(disabled === undefined ? {} : { DisableAutoAdjust: disabled }),
    }
    const result = method.requestDeserialize(method.requestSerialize(params))
    expect(result.ThresholdTokens).toBe('0')
    if (disabled === undefined) expect(result).not.toHaveProperty('DisableAutoAdjust')
    else expect(result.DisableAutoAdjust).toBe(disabled)
  })

  it.each([undefined, false, true])('preserves hotpatch identity and switch presence (%s)', (disabled) => {
    const method = ypb.Yak.service.StartAIReAct
    const params = {
      AIService: 'openai',
      AIModelName: 'model',
      ModelContextKey: 'opaque-key',
      RuntimeContextSizeLimit: 600000,
      ...(disabled === undefined ? {} : { DisableContextAutoAdjust: disabled }),
    }
    const result = method.requestDeserialize(
      method.requestSerialize({
        IsConfigHotpatch: true,
        HotpatchType: 'RuntimeContextSizeLimit',
        Params: params,
      }),
    )
    expect(result.Params).toMatchObject({ ...params, RuntimeContextSizeLimit: '600000' })
    if (disabled === undefined) expect(result.Params).not.toHaveProperty('DisableContextAutoAdjust')
  })

  it('round-trips configured ownership and saved values without runtime usage', () => {
    const get = ypb.Yak.service.GetAIModelContext
    const config = { ModelName: 'model', Provider: { Type: 'openai' }, ContextOwnerId: 'stable-owner' }
    expect(get.requestDeserialize(get.requestSerialize({ Config: config })).Config).toMatchObject(config)
    const response = get.responseDeserialize(
      get.responseSerialize({
        Provider: 'openai',
        Model: 'model',
        ContextKey: 'key',
        ThresholdTokens: 500000,
        MinimumThresholdTokens: 100000,
        DisableAutoAdjust: false,
        Source: 'default',
      }),
    )
    expect(response).toMatchObject({ ThresholdTokens: '500000', MinimumThresholdTokens: '100000', ContextKey: 'key' })
    expect(response).not.toHaveProperty('PromptTokens')
  })
})
