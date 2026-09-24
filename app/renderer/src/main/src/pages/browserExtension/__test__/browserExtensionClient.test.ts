import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Uint8ArrayToString } from '@/utils/str'
import emiter from '@/utils/eventBus/eventBus'
import type { BrowserPairingRequest } from '../browserExtensionClient'

const requestYakURL = vi.fn()
const cancelTask = vi.fn()
const executeTask = vi.fn()
const onData = vi.fn()
const onError = vi.fn()
const onEnd = vi.fn()
const claimYTrayApproval = vi.fn()
const randomString = vi.fn((_length: number) => 'tok-fixed-browser-extension-task-40c')

vi.mock('@/services/electronBridge', () => ({
  yakitBrowserExtension: {
    requestYakURL: (...args: unknown[]) => requestYakURL(...args),
    cancelTask: (...args: unknown[]) => cancelTask(...args),
    executeTask: (...args: unknown[]) => executeTask(...args),
  },
  yakitStream: {
    onData: (...args: unknown[]) => onData(...args),
    onError: (...args: unknown[]) => onError(...args),
    onEnd: (...args: unknown[]) => onEnd(...args),
  },
  yakitManagedBrowser: {
    claimYTrayApproval: (...args: unknown[]) => claimYTrayApproval(...args),
  },
}))

vi.mock('@/utils/randomUtil', () => ({
  randomString: (length: number) => randomString(length),
}))

import {
  approveBrowserExtensionPairing,
  autoApproveYTrayPairings,
  executeBrowserExtensionTask,
  rejectBrowserExtensionPairing,
  requestBrowserExtensionSnapshot,
} from '../browserExtensionClient'

const pairingRequest: BrowserPairingRequest = {
  id: 'pairing-1',
  installationId: 'install-1',
  managedInstance: { manager: 'yakit', instanceId: 'inst-1', badge: 'A' },
  extensionId: 'ext-1',
  client: 'extension',
  clientVersion: '1.0.0',
  origin: 'chrome-extension://ext-1',
  code: '123456',
  createdAt: 1,
  expiresAt: 2,
}

function snapshotResponse(resources: Array<{ ResourceType: string; data: unknown }>) {
  return {
    Resources: resources.map((item) => ({
      ResourceType: item.ResourceType,
      Extra: [{ Key: 'data', Value: JSON.stringify(item.data) }],
    })),
  }
}

describe('browserExtensionClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    randomString.mockReturnValue('tok-fixed-browser-extension-task-40c')
    executeTask.mockResolvedValue(undefined)
    cancelTask.mockResolvedValue(undefined)
    onData.mockImplementation(() => () => {})
    onError.mockImplementation(() => () => {})
    onEnd.mockImplementation(() => () => {})
    claimYTrayApproval.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('approveBrowserExtensionPairing posts expected path and body', async () => {
    requestYakURL.mockResolvedValue(snapshotResponse([]))
    await approveBrowserExtensionPairing(pairingRequest)
    expect(requestYakURL).toHaveBeenCalledTimes(1)
    const arg = requestYakURL.mock.calls[0][0]
    expect(arg.Method).toBe('POST')
    expect(arg.Url.Path).toBe('/pairings/pairing-1/approve')
    expect(JSON.parse(Uint8ArrayToString(arg.Body))).toEqual({ name: '浏览器 A' })
  })

  it('rejectBrowserExtensionPairing deletes with reject message body', async () => {
    requestYakURL.mockResolvedValue(snapshotResponse([]))
    await rejectBrowserExtensionPairing(pairingRequest)
    const arg = requestYakURL.mock.calls[0][0]
    expect(arg.Method).toBe('DELETE')
    expect(arg.Url.Path).toBe('/pairings/pairing-1')
    expect(JSON.parse(Uint8ArrayToString(arg.Body))).toEqual({ message: 'Pairing rejected in Yakit' })
  })

  it('requestBrowserExtensionSnapshot decodes status / pending / devices resources', async () => {
    requestYakURL.mockResolvedValue(
      snapshotResponse([
        {
          ResourceType: 'status',
          data: {
            revision: 1,
            running: true,
            connected: true,
            protocolVersion: 3,
            engineIdentityId: 'identity-1',
            engineInstanceId: 'engine-1',
            connections: [],
          },
        },
        {
          ResourceType: 'pairing-request',
          data: {
            id: 'pairing-a',
            installationId: 'installation-a',
            extensionId: 'extension-a',
            client: 'extension',
            clientVersion: '1',
            origin: 'chrome-extension://extension-a',
            code: '123456',
            createdAt: 1,
            expiresAt: 2,
          },
        },
        {
          ResourceType: 'paired-device',
          data: {
            id: 'device-a',
            installationId: 'installation-a',
            name: 'Browser A',
            client: 'extension',
            clientVersion: '1',
            origin: 'chrome-extension://extension-a',
            publicKey: {},
            createdAt: 1,
            lastSeenAt: 2,
          },
        },
      ]),
    )

    const snapshot = await requestBrowserExtensionSnapshot('GET', '/snapshot')
    expect(snapshot.status?.engineIdentityId).toBe('identity-1')
    expect(snapshot.pending).toHaveLength(1)
    expect(snapshot.pending[0].id).toBe('pairing-a')
    expect(snapshot.devices).toHaveLength(1)
    expect(snapshot.devices[0].name).toBe('Browser A')
  })

  it('auto-approves only a matching launch that YTray validates', async () => {
    const request = {
      ...pairingRequest,
      id: 'pairing-ytray-approved',
      managedInstance: {
        manager: 'ytray' as const,
        instanceId: '00000000-0000-4000-8000-000000000001',
        badge: 'A',
      },
      expiresAt: Date.now() + 60_000,
    }
    claimYTrayApproval.mockResolvedValue({ approved: true, reason: '' })
    requestYakURL.mockResolvedValue(snapshotResponse([]))
    const onAutoApproved = vi.fn()
    emiter.on('onBrowserExtensionAutoApproved', onAutoApproved)

    const result = await autoApproveYTrayPairings({ pending: [request], devices: [] })
    emiter.off('onBrowserExtensionAutoApproved', onAutoApproved)

    expect(claimYTrayApproval).toHaveBeenCalledWith(request.managedInstance.instanceId, request.id)
    expect(requestYakURL.mock.calls[0][0].Url.Path).toBe('/pairings/pairing-ytray-approved/approve')
    expect(result.snapshot.pending).toEqual([])
    expect(result.errors).toEqual({})
    expect(onAutoApproved).toHaveBeenCalledWith('A')
  })

  it('keeps the pairing manual and reports when YTray is unavailable', async () => {
    const request = {
      ...pairingRequest,
      id: 'pairing-ytray-unavailable',
      managedInstance: {
        manager: 'ytray' as const,
        instanceId: '00000000-0000-4000-8000-000000000002',
        badge: 'B',
      },
      expiresAt: Date.now() + 60_000,
    }
    claimYTrayApproval.mockRejectedValue(new Error('YTray exited'))

    const result = await autoApproveYTrayPairings({ pending: [request], devices: [] })

    expect(requestYakURL).not.toHaveBeenCalled()
    expect(result.snapshot.pending).toEqual([request])
    expect(result.errors[request.id]).toEqual({ kind: 'ytray-unavailable', message: 'YTray exited' })
  })

  it('shares an in-flight YTray approval and returns its final snapshot to concurrent refreshes', async () => {
    const request = {
      ...pairingRequest,
      id: 'pairing-ytray-concurrent',
      managedInstance: {
        manager: 'ytray' as const,
        instanceId: '00000000-0000-4000-8000-000000000003',
        badge: 'A',
      },
      expiresAt: Date.now() + 60_000,
    }
    let resolveClaim!: (value: { approved: boolean; reason: string }) => void
    claimYTrayApproval.mockImplementation(() => new Promise((resolve) => (resolveClaim = resolve)))
    requestYakURL.mockResolvedValue(snapshotResponse([]))
    const onAutoApproved = vi.fn()
    emiter.on('onBrowserExtensionAutoApproved', onAutoApproved)

    const first = autoApproveYTrayPairings({ pending: [request], devices: [] })
    const second = autoApproveYTrayPairings({ pending: [request], devices: [] })
    expect(claimYTrayApproval).toHaveBeenCalledTimes(1)

    resolveClaim({ approved: true, reason: '' })
    const [firstResult, secondResult] = await Promise.all([first, second])
    const staleResult = await autoApproveYTrayPairings({ pending: [request], devices: [] })
    emiter.off('onBrowserExtensionAutoApproved', onAutoApproved)

    expect(requestYakURL).toHaveBeenCalledTimes(1)
    expect(claimYTrayApproval).toHaveBeenCalledTimes(1)
    expect(onAutoApproved).toHaveBeenCalledTimes(1)
    expect(firstResult.snapshot.pending).toEqual([])
    expect(secondResult.snapshot.pending).toEqual([])
    expect(staleResult.snapshot.pending).toEqual([])
  })

  it('executeBrowserExtensionTask uses generated token and maps result stream to resolve', async () => {
    let dataHandler: ((input: unknown) => void) | undefined
    onData.mockImplementation((_token: string, handler: (input: unknown) => void) => {
      dataHandler = handler
      return () => {}
    })

    const pending = executeBrowserExtensionTask<{ ok: boolean }>('device-1', 'custom.echo', { value: 1 }, 5_000)
    expect(randomString).toHaveBeenCalledWith(40)
    expect(executeTask).toHaveBeenCalledWith(
      expect.objectContaining({
        TaskId: 'tok-fixed-browser-extension-task-40c',
        DeviceId: 'device-1',
        Schema: 'custom.echo',
        TimeoutMilliseconds: 5_000,
      }),
      'tok-fixed-browser-extension-task-40c',
    )
    expect(onData).toHaveBeenCalledWith('tok-fixed-browser-extension-task-40c', expect.any(Function))

    dataHandler?.({
      Type: 'result',
      // jsdom 下 Node TextEncoder 产物与校验侧 Uint8Array 不同 realm，须再包一层同 realm 构造
      Data: Uint8Array.from(new TextEncoder().encode(JSON.stringify({ ok: true }))),
    })
    await expect(pending).resolves.toEqual({ ok: true })
  })

  it('executeBrowserExtensionTask rejects on cancelled stream event', async () => {
    let dataHandler: ((input: unknown) => void) | undefined
    onData.mockImplementation((_token: string, handler: (input: unknown) => void) => {
      dataHandler = handler
      return () => {}
    })
    const pending = executeBrowserExtensionTask('device-1', 'custom.echo', {})
    dataHandler?.({ Type: 'cancelled', Message: 'user cancelled' })
    await expect(pending).rejects.toThrow('user cancelled')
  })

  it('executeBrowserExtensionTask times out, cancels task, and rejects', async () => {
    vi.useFakeTimers()
    const pending = executeBrowserExtensionTask('device-1', 'custom.slow', {}, 100)
    const expectation = expect(pending).rejects.toThrow('浏览器任务调用超时: custom.slow')
    await vi.advanceTimersByTimeAsync(1_100)
    await expectation
    expect(cancelTask).toHaveBeenCalledWith('tok-fixed-browser-extension-task-40c')
  })
})
