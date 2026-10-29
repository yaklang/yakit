import path from 'node:path'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')

const packageDefinition = protoLoader.loadSync(path.resolve(process.cwd(), 'app/protos/grpc.proto'), {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
})
const { ypb } = grpc.loadPackageDefinition(packageDefinition)

describe('single-model gRPC contract', () => {
  it('preserves the session flag in StartAIReAct serialization', () => {
    const method = ypb.Yak.service.StartAIReAct
    const payload = method.requestDeserialize(
      method.requestSerialize({ IsStart: true, Params: { SingleModelMode: true } }),
    )

    expect(payload.Params.SingleModelMode).toBe(true)
  })

  it('preserves the global flag in SetAIGlobalConfig serialization', () => {
    const method = ypb.Yak.service.SetAIGlobalConfig
    const payload = method.requestDeserialize(method.requestSerialize({ SingleModelMode: true }))

    expect(payload.SingleModelMode).toBe(true)
  })
})

describe('script providers and global controls gRPC contract', () => {
  const script = 'chat = func(req, emit) { return "hello" }'

  it.each([false, true])('preserves script health checks (native tools=%s)', (enableNative) => {
    const method = ypb.Yak.service.AIConfigHealthCheck
    const config = { Type: 'yak-script', Script: script, EnableNativeToolCalling: enableNative }
    const payload = method.requestDeserialize(method.requestSerialize({ Config: config, Content: '测试成功' }))

    expect(payload.Config).toMatchObject(config)
    expect(payload.Content).toBe('测试成功')
  })

  it.each([0, 12, 60000])('round-trips saved providers and global controls (RPM=%s)', (rpm) => {
    const config = {
      RetryForever: true,
      NetworkDebug: true,
      ModelRequestsPerMinute: rpm,
      IntelligentModels: [
        {
          ProviderId: '0',
          ModelName: 'my-script',
          Provider: { Type: 'yak-script', Script: script, EnableNativeToolCalling: true },
        },
      ],
    }
    const setMethod = ypb.Yak.service.SetAIGlobalConfig
    const saved = setMethod.requestDeserialize(setMethod.requestSerialize(config))
    const getMethod = ypb.Yak.service.GetAIGlobalConfig
    const loaded = getMethod.responseDeserialize(getMethod.responseSerialize(saved))

    // 与主进程相同的 longs: String 配置：IPC 接收到的 int64 是字符串。
    expect(saved).toMatchObject({ ...config, ModelRequestsPerMinute: String(rpm) })
    expect(loaded).toEqual(saved)
  })
})
