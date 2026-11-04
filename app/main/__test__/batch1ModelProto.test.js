import { describe, expect, it } from 'vitest'
import path from 'path'
import { loadSync } from '@grpc/proto-loader'
const defs = loadSync(path.resolve(__dirname, '../../protos/grpc.proto'), { keepCase: true, longs: String })
describe('official model configuration wire format', () => {
  it('uses official script and native-tool fields without credentials', () => {
    const method = defs['ypb.Yak'].AIConfigHealthCheck
    const decoded = method.requestDeserialize(
      method.requestSerialize({ Config: { Type: 'yak-script', Script: 'func(){}', EnableNativeToolCalling: true } }),
    )
    expect(decoded.Config).toMatchObject({ Type: 'yak-script', Script: 'func(){}', EnableNativeToolCalling: true })
    expect(defs['ypb.ThirdPartyApplicationConfig'].type.field.find((x) => x.name === 'Script').number).toBe(25)
  })
  it('roundtrips global and session single-model flags at official numbers', () => {
    expect(defs['ypb.AIStartParams'].type.field.find((x) => x.name === 'SingleModelMode').number).toBe(50)
    const method = defs['ypb.Yak'].StartAIReAct
    expect(
      method.requestDeserialize(
        method.requestSerialize({ IsStart: true, Params: { ForgeName: 'role-forge', SingleModelMode: false } }),
      ).Params,
    ).toMatchObject({ ForgeName: 'role-forge', SingleModelMode: false })
    expect(defs['ypb.AIGlobalConfig'].type.field.find((x) => x.name === 'SingleModelMode').number).toBe(11)
  })
  it('persists probe capabilities through the actual global-config wire format', () => {
    const method = defs['ypb.Yak'].SetAIGlobalConfig
    const config = {
      IntelligentModels: [
        {
          ModelName: 'configured-model',
          EffortProbed: true,
          ProbedExtendedEfforts: ['xhigh', 'max'],
          Provider: { Type: 'custom', ReasoningEffort: 'max' },
        },
      ],
    }
    expect(method.requestDeserialize(method.requestSerialize(config))).toMatchObject(config)
    expect(defs['ypb.AIModelConfig'].type.field.find((x) => x.name === 'ProbedExtendedEfforts').number).toBe(6)
    expect(defs['ypb.AIModelConfig'].type.field.find((x) => x.name === 'EffortProbed').number).toBe(7)
  })
  it('preserves probe config and response flags', () => {
    const method = defs['ypb.Yak'].ProbeReasoningEffort
    expect(
      method.requestDeserialize(
        method.requestSerialize({
          Model: 'model-a',
          Config: { Type: 'custom', APIKey: 'test', ReasoningEffort: 'high' },
        }),
      ),
    ).toMatchObject({ Model: 'model-a', Config: { APIKey: 'test', ReasoningEffort: 'high' } })
    expect(
      method.responseDeserialize(method.responseSerialize({ XhighSupported: true, MaxErrorMessage: 'unsupported' })),
    ).toMatchObject({ XhighSupported: true, MaxErrorMessage: 'unsupported' })
  })
})
