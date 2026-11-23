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

// Wire fixtures generated with protoc from yaklang/yaklang@ccf05f9e1e
// common/yakgrpc/yakgrpc.proto. A client-only round trip cannot detect tag
// collisions with the engine's image fields.
describe('context and image engine wire compatibility', () => {
  it.each([
    ['SetAIGlobalConfig', 'request', '32221a056d6f64656c40014a077061746368333250005a0c737461626c652d6f776e6572'],
    ['GetAIGlobalConfig', 'response', '32221a056d6f64656c40014a077061746368333250005a0c737461626c652d6f776e6572'],
    ['GetAIModelContext', 'request', '1a221a056d6f64656c40014a077061746368333250005a0c737461626c652d6f776e6572'],
  ])('keeps provider ownership and image capabilities separate in %s', (rpc, direction, hex) => {
    const model = {
      ModelName: 'model',
      SupportsImageInput: true,
      ImageTokenEstimator: 'patch32',
      SupportsImageToolCalling: false,
      ContextOwnerId: 'stable-owner',
    }
    const payload = rpc === 'GetAIModelContext' ? { Config: model } : { IntelligentModels: [model] }
    const method = ypb.Yak.service[rpc]
    const wire = Buffer.from(hex, 'hex')
    expect(method[direction + 'Deserialize'](wire)).toMatchObject(payload)
    expect(method[direction + 'Serialize'](payload)).toEqual(wire)
  })

  describe.each(['StartAIReAct', 'StartAITask'])('%s', (rpc) => {
    it.each([
      [undefined, '1b', ''],
      [false, '1e', 'c00300'],
      [true, '1e', 'c00301'],
    ])('keeps automatic adjustment presence independent of image policy (%s)', (disabled, length, flag) => {
      // Params: RuntimeContextSizeLimit=51, ImageInput=54,
      // ModelContextKey=55, DisableContextAutoAdjust=56.
      // 57/58 是 SyntaxFlow 规则开关。
      const wire = Buffer.from(
        `12${length}9803c0cf24b203060a046175746fba030a6f70617175652d6b6579${flag}40014a1752756e74696d65436f6e7465787453697a654c696d6974`,
        'hex',
      )
      const payload = {
        IsConfigHotpatch: true,
        HotpatchType: 'RuntimeContextSizeLimit',
        Params: {
          RuntimeContextSizeLimit: '600000',
          ImageInput: { Mode: 'auto' },
          ModelContextKey: 'opaque-key',
          ...(disabled === undefined ? {} : { DisableContextAutoAdjust: disabled }),
        },
      }
      const method = ypb.Yak.service[rpc]
      const decoded = method.requestDeserialize(wire)
      expect(decoded).toMatchObject(payload)
      if (disabled === undefined) expect(decoded.Params).not.toHaveProperty('DisableContextAutoAdjust')
      expect(method.requestSerialize(payload)).toEqual(wire)
    })
  })
})

describe('SyntaxFlow security rule switches', () => {
  it.each(['StartAIReAct', 'StartAITask'])('%s 使用 57/58 下发会话开关', (rpc) => {
    const method = ypb.Yak.service[rpc]
    const wire = Buffer.from('1206c80301d00301', 'hex')
    const params = { DisableBuiltinSyntaxFlowRules: true, EnableCustomSyntaxFlowRules: true }
    expect(method.requestDeserialize(wire)).toMatchObject({ Params: params })
    expect(method.requestSerialize({ Params: params })).toEqual(wire)
  })

  it('AIGlobalConfig 使用 15/16 持久化全局默认', () => {
    const method = ypb.Yak.service.SetAIGlobalConfig
    const wire = Buffer.from('7801800101', 'hex')
    const config = { DisableBuiltinSyntaxFlowRules: true, EnableCustomSyntaxFlowRules: true }
    expect(method.requestDeserialize(wire)).toMatchObject(config)
    expect(method.requestSerialize(config)).toEqual(wire)
  })
})

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
