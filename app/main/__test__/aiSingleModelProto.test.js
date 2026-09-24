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
