import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { startYakEngine } from '../yak-engine/yak-engine-fixture.mjs'
import { clearOnlineAIGlobalConfig, syncOnlineAIGlobalConfig } from '@/pages/ai-re-act/hooks/useAIGlobalConfig'
import { defaultAIGlobalConfig } from '@/pages/ai-agent/defaultConstant'

// Only the Electron transport boundary is substituted. The sync code, online
// handlers, engine persistence/routing and outgoing HTTP requests are real.
const transport = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }))
vi.mock('@/pages/ai-agent/aiModelList/utils', () => ({
  grpcGetAIGlobalConfig: (...args) => transport.get(...args),
  grpcSetAIGlobalConfig: (...args) => transport.set(...args),
}))

const onlineURL = process.env.YAKIT_HEADER_QA_URL
const binaryPath = process.env.YAKIT_HEADER_QA_ENGINE
const enabled = !!onlineURL && !!binaryPath

describe.skipIf(!enabled)('enterprise headers through online, client sync and a real engine', () => {
  let engine
  let client
  let artifactsDir
  let localModel
  const evidence = []

  const rpc = (method, params) =>
    new Promise((resolve, reject) => {
      client[method](params, { deadline: Date.now() + 30_000 }, (error, response) => {
        if (error) reject(error)
        else resolve(response)
      })
    })

  const api = async (route, user = 'admin', data) => {
    const response = await fetch(`${onlineURL}${route}`, {
      method: data === undefined ? 'GET' : 'POST',
      headers: { Authorization: `qa-${user}`, 'Content-Type': 'application/json' },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      signal: AbortSignal.timeout(10_000),
    })
    const body = await response.json()
    if (response.status !== 200) throw new Error(JSON.stringify(body))
    return body
  }

  const remoteConfig = (version, dynamic = true) => ({
    Enabled: true,
    IntelligentModels: [
      {
        ProviderId: 'web-provider-id',
        ModelName: `enterprise-${version}`,
        ExtraParams: [],
        Provider: {
          Type: 'custom',
          APIKey: `fixture-${version}`,
          BaseURL: `${onlineURL}/model/${version}/v1/chat/completions`,
          Headers: [
            { Key: 'X-Static', Value: version, ValueSource: 'static' },
            ...(dynamic
              ? [
                  { Key: 'agile-user-id', Value: '', ValueSource: 'user_ad_username' },
                  { Key: 'Agile-User-Id', Value: 'stale', ValueSource: 'static' },
                ]
              : []),
          ],
        },
      },
    ],
  })

  const saveRemote = (config, isOpen = true) =>
    api('/system/config', 'admin', [
      {
        configName: 'AI',
        isOpen,
        content: JSON.stringify(config),
      },
    ])
  const download = (user) =>
    syncOnlineAIGlobalConfig(
      () => api('/system/config?forClient=true', user),
      () => true,
    )
  const assertOnlyLocal = async () => {
    const config = await rpc('GetAIGlobalConfig', {})
    expect(config.IntelligentModels.map((model) => model.ModelName)).toEqual(['local-backup'])
    expect(config.IntelligentModels[0].Provider.Headers.map(({ Key, Value }) => ({ Key, Value }))).toEqual(
      localModel.Provider.Headers,
    )
    expect(config.LightweightModels).toEqual([])
    expect(config.VisionModels).toEqual([])
  }

  const chat = async (scenario) => {
    const before = ((await api('/qa/requests')) || []).length
    const output = await new Promise((resolve, reject) => {
      const chunks = []
      const call = client.Exec(
        {
          NoDividedEngine: true,
          Script:
            'result = ai.IntelligentChat("remote-header-qa", ai.timeout(10))~\nyakit.Info("QA_HEADER_CHAT_OK: " + result)',
        },
        { deadline: Date.now() + 30_000 },
      )
      call.on('data', (chunk) =>
        chunks.push(chunk.Message?.toString() || chunk.Raw?.toString() || chunk.OutputJson || ''),
      )
      call.on('error', reject)
      call.on('end', () => resolve(chunks.join('\n')))
    })
    expect(output).toContain('QA_HEADER_CHAT_OK')
    const requests = (await api('/qa/requests')).slice(before)
    expect(requests).toHaveLength(1)
    evidence.push({ scenario, ...requests[0] })
    return requests[0]
  }

  beforeAll(async () => {
    // This suite mutates only a dedicated opt-in fixture and temporary engine DB.
    expect(new URL(onlineURL).hostname).toBe('127.0.0.1')
    const user = await api('/auth/user', 'admin', {})
    expect(user.token).toBe('qa-admin')
    artifactsDir =
      process.env.YAKIT_HEADER_QA_ARTIFACTS || (await mkdtemp(path.join(tmpdir(), 'enterprise-header-qa-')))
    await mkdir(artifactsDir, { recursive: true })
    const engineHome = await mkdtemp(path.join(tmpdir(), 'enterprise-header-engine-'))
    engine = await startYakEngine({
      repoRoot: process.cwd(),
      build: { binaryPath, sourceDir: process.cwd() },
      yakitHomeDir: engineHome,
      artifactsDir,
    })
    const definition = protoLoader.loadSync(path.resolve('app/protos/grpc.proto'), {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    })
    const { ypb } = grpc.loadPackageDefinition(definition)
    client = new ypb.Yak(engine.address, grpc.credentials.createInsecure())
    transport.get.mockImplementation(() => rpc('GetAIGlobalConfig', {}))
    transport.set.mockImplementation((config) => rpc('SetAIGlobalConfig', config))
    localModel = {
      ProviderId: '0',
      ModelName: 'local-backup',
      ExtraParams: [],
      IsOnline: false,
      Provider: {
        Type: 'custom',
        APIKey: 'fixture-local',
        BaseURL: `${onlineURL}/model/local/v1/chat/completions`,
        Headers: [{ Key: 'X-Static', Value: 'local-keep' }],
      },
    }
    await rpc('SetAIGlobalConfig', {
      ...defaultAIGlobalConfig,
      Enabled: true,
      DisableFallback: true,
      IntelligentModels: [{ ...localModel, ModelName: 'enterprise-v1', IsOnline: true }, localModel],
    })
  }, 120_000)

  afterAll(async () => {
    if (artifactsDir)
      await writeFile(path.join(artifactsDir, 'received-requests.json'), JSON.stringify(evidence, null, 2))
    client?.close()
    await engine?.stop()
  })

  it('resolves Alice, refreshes the same model configuration, then switches to Bob', async () => {
    const first = remoteConfig('v1')
    await saveRemote(first)
    await download('alice')
    let request = await chat('Alice / first download')
    expect(request).toMatchObject({
      method: 'POST',
      host: new URL(onlineURL).host,
      path: '/model/v1/v1/chat/completions',
      model: 'enterprise-v1',
      'agile-user-id': 'alice.zh',
      'agile-user-id-count': '1',
      'X-Static': 'v1',
      Authorization: 'Bearer fixture-v1',
    })

    const updated = remoteConfig('v2')
    // Same model name: prove replacement, not merely adding a new model.
    updated.IntelligentModels[0].ModelName = 'enterprise-v1'
    await saveRemote(updated)
    await download('alice')
    request = await chat('Alice / changed remote endpoint, key and static header')
    expect(request).toMatchObject({
      path: '/model/v2/v1/chat/completions',
      model: 'enterprise-v1',
      'agile-user-id': 'alice.zh',
      'X-Static': 'v2',
      Authorization: 'Bearer fixture-v2',
    })

    await download('bob')
    request = await chat('Bob / account replacement')
    expect(request).toMatchObject({ 'agile-user-id': 'bob.zh', 'agile-user-id-count': '1', 'X-Static': 'v2' })
    const stored = JSON.parse((await api('/system/config')).data[0].content)
    expect(stored).toEqual(updated)
  }, 90_000)

  it('does not inject an identity header unless configured remotely', async () => {
    const config = remoteConfig('static-only', false)
    config.IntelligentModels[0].ModelName = 'enterprise-v1'
    await saveRemote(config)
    await download('alice')
    expect(await chat('Alice / static-only remote configuration')).toMatchObject({
      'agile-user-id': '',
      'agile-user-id-count': '0',
      'X-Static': 'static-only',
    })
  }, 45_000)

  it('clears remote identity on logout, missing AD, and disabled remote configuration', async () => {
    await saveRemote(remoteConfig('v1'))
    await download('alice')
    await clearOnlineAIGlobalConfig()
    await assertOnlyLocal()
    evidence.push({ scenario: 'Logout', result: 'remote models removed; local model preserved' })
    await download('bob')
    await expect(download('missing')).rejects.toThrow(/AD/)
    await assertOnlyLocal()
    evidence.push({ scenario: 'Missing AD', result: 'download rejected; previous remote identity removed' })
    await download('bob')
    await saveRemote(remoteConfig('v1'), false)
    await download('bob')
    await assertOnlyLocal()
    evidence.push({ scenario: 'Remote configuration disabled', result: 'remote models removed; local model preserved' })
  }, 45_000)

  it('rejects the unresolved response returned by the old client download contract', async () => {
    await saveRemote(remoteConfig('v1'))
    const raw = await api('/system/config', 'alice')
    expect(JSON.parse(raw.data[0].content).IntelligentModels[0].Provider.Headers).toContainEqual({
      Key: 'agile-user-id',
      Value: '',
      ValueSource: 'user_ad_username',
    })
    await expect(
      syncOnlineAIGlobalConfig(
        async () => raw,
        () => true,
      ),
    ).rejects.toThrow(/unresolved enterprise AI header/)
    await assertOnlyLocal()
    evidence.push({
      scenario: 'Old client contract without forClient=true',
      result: 'AD binding remains unresolved; client update is required',
    })
  }, 45_000)

  it('can refresh and clear a single-model configuration containing only an enterprise model', async () => {
    await saveRemote(remoteConfig('v1'))
    await download('alice')
    const current = await rpc('GetAIGlobalConfig', {})
    await rpc('SetAIGlobalConfig', {
      ...current,
      SingleModelMode: true,
      IntelligentModels: current.IntelligentModels.filter((model) => model.IsOnline),
    })
    await download('bob')
    expect((await rpc('GetAIGlobalConfig', {})).SingleModelMode).toBe(true)
    expect(await chat('Bob / enterprise-only single-model refresh')).toMatchObject({ 'agile-user-id': 'bob.zh' })
    await clearOnlineAIGlobalConfig()
    const cleared = await rpc('GetAIGlobalConfig', {})
    expect(cleared.IntelligentModels).toEqual([])
    expect(cleared.SingleModelMode).toBe(false)
    evidence.push({
      scenario: 'Enterprise-only single-model logout',
      result: 'last online model removed; invalid single-model mode cleared',
    })
  }, 45_000)
})
