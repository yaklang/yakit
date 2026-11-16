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

describe('interactive UI gRPC contract', () => {
  it.each([
    [false, '00'],
    [true, '01'],
  ])('keeps UI capabilities separate from session network debugging (%s)', (networkDebug, flag) => {
    const method = ypb.Yak.service.StartAIReAct
    // Encoded by the backend proto: NetworkDebug is field 52, ClientUI is field 53.
    const wire = Buffer.from(`08011208a003${flag}aa03027b7d`, 'hex')
    const payload = { IsStart: true, Params: { NetworkDebug: networkDebug, ClientUI: '{}' } }

    expect(method.requestDeserialize(wire)).toMatchObject(payload)
    expect(method.requestSerialize(payload)).toEqual(wire)
  })
})

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

describe('experimental coding gRPC contract', () => {
  it('keeps the old boolean wire field separate from the extensible mode', () => {
    const start = ypb.Yak.service.StartAIReAct
    for (const params of [
      { AgentMode: 'security', CodingMode: true },
      { AgentMode: 'coding', CodingMode: false },
      { CodingMode: true },
    ]) {
      expect(start.requestDeserialize(start.requestSerialize({ IsStart: true, Params: params })).Params).toMatchObject(
        params,
      )
    }
  })

  it('round-trips mode and workspace binding in starts and history', () => {
    const binding = {
      AgentMode: 'coding',
      CodingWorkspaceID: 'workspace-one',
      CodingWorkingDirectory: '/source/tree',
      CodingCreateWorktree: true,
      CodingWorktreeBaseRef: 'main',
      CodingWorktreeID: 'tree-id',
      CodingWorkspaceRoots: ['/tree', '/back'],
      CodingSourceRoots: ['/front', '/back'],
    }
    const start = ypb.Yak.service.StartAIReAct
    expect(start.requestDeserialize(start.requestSerialize({ IsStart: true, Params: binding })).Params).toMatchObject(
      binding,
    )
    const history = ypb.Yak.service.QueryAISession
    const result = history.responseDeserialize(
      history.responseSerialize({ Data: [{ SessionID: 'coding', StartParams: binding }] }),
    )
    expect(result.Data[0].StartParams).toMatchObject(binding)
  })
  it('round-trips branch refs and checkout status', () => {
    const method = ypb.Yak.service.ListAICodingBranches
    const payload = {
      Data: [{ Name: 'origin/main', Ref: 'refs/remotes/origin/main', Commit: 'abc', Remote: true }],
      CurrentBranch: 'main',
      CurrentCommit: 'abc',
      DefaultRef: 'refs/remotes/origin/main',
      HasLocalChanges: true,
    }
    expect(method.requestDeserialize(method.requestSerialize({ WorkspaceID: 'one' }))).toEqual({ WorkspaceID: 'one' })
    expect(method.responseDeserialize(method.responseSerialize(payload))).toEqual(payload)
  })
  it('exposes workspace and worktree RPC payloads', () => {
    const method = ypb.Yak.service.CreateAICodingWorkspace
    expect(
      method.requestDeserialize(method.requestSerialize({ Name: 'Project', RootPaths: ['/front', '/back'] })),
    ).toMatchObject({
      Name: 'Project',
      RootPaths: ['/front', '/back'],
    })
    const list = ypb.Yak.service.ListAICodingWorktrees
    expect(
      list.responseDeserialize(
        list.responseSerialize({
          Data: [
            {
              ID: 'tree',
              WorkspaceID: 'workspace',
              OwnerSessionID: 'owner',
              SessionIDs: ['owner', 'linked'],
              Path: '/source/tree',
              WorkingDirectory: '/source/tree/app',
              State: 'ready',
              SourceDirectory: '/source/app',
              Detached: true,
              Locked: true,
            },
          ],
        }),
      ).Data[0],
    ).toMatchObject({
      ID: 'tree',
      WorkspaceID: 'workspace',
      OwnerSessionID: 'owner',
      SessionIDs: ['owner', 'linked'],
      Path: '/source/tree',
      WorkingDirectory: '/source/tree/app',
      State: 'ready',
      SourceDirectory: '/source/app',
      Detached: true,
      Locked: true,
    })
  })
})
