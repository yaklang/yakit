import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/services/electronBridge', () => ({
  yakitManagedBrowser: {
    list: vi.fn(async () => []),
    listYTrayHistory: vi.fn(async () => []),
    claimYTrayApproval: vi.fn(),
    restoreYTray: vi.fn(),
  },
}))
vi.mock('@/pages/browserExtension/browserExtensionClient', () => ({
  autoApproveYTrayPairings: vi.fn(async (snapshot: unknown) => ({ snapshot, errors: {} })),
  callBrowserExtensionCapability: vi.fn(),
  getBrowserExtensionSnapshot: vi.fn(),
}))

import {
  browserInstanceMentionName,
  formatLastSeen,
  normalizeBrowserInstances,
  readBrowserThumbnail,
  refreshBrowserInstances,
  useBrowserInstances,
} from '../browserInstanceStore'
import {
  callBrowserExtensionCapability,
  getBrowserExtensionSnapshot,
} from '@/pages/browserExtension/browserExtensionClient'

describe('browser instance presentation', () => {
  it('formatLastSeen returns dash for invalid timestamps and formats valid ones', () => {
    expect(formatLastSeen(0)).toBe('-')
    expect(formatLastSeen(Number.NaN)).toBe('-')
    expect(formatLastSeen(1_700_000_000_000)).toMatch(/^\d{4}\/\d{1,2}\/\d{1,2} \d{2}:\d{2}:\d{2}$/)
  })

  it('uses the stable managed-profile identity and does not treat a grant id as a running task', () => {
    const [instance] = normalizeBrowserInstances(
      {
        pending: [],
        devices: [
          {
            id: 'device-a',
            installationId: 'install-a',
            name: 'Chrome Browser',
            client: 'chrome-extension',
            clientVersion: '1.0.0',
            origin: 'chrome-extension://extension-a',
            createdAt: 1,
            lastSeenAt: 2,
          },
        ],
        status: {
          revision: 1,
          running: true,
          connected: true,
          protocolVersion: 3,
          engineIdentityId: 'engine',
          engineInstanceId: 'engine-instance',
          connections: [
            {
              deviceId: 'device-a',
              installationId: 'install-a',
              client: 'Chrome for Testing',
              clientVersion: '152.0.7977.82',
              capabilities: ['browser.tabs'],
              sessionId: 'session',
              connectionId: 'connection',
              grantId: 'legacy-grant',
              connectedAt: 2,
            },
          ],
        },
      },
      {},
      [
        {
          version: 1,
          id: 'profile-a',
          slotHint: 'left',
          name: '管理员',
          status: 'running',
          userDataDir: '/tmp/a',
          extensionPath: '/tmp/extension',
          chromePath: '/tmp/chrome',
          startingUrl: 'https://example.test',
          createdAt: 1,
          updatedAt: 2,
          installationId: 'install-a',
        },
      ],
    )

    expect(instance).toMatchObject({
      identity: 'A',
      name: '管理员',
      client: 'Chrome for Testing',
      clientVersion: '152.0.7977.82',
      online: true,
      running: false,
    })
  })

  it('uses the live ytray badge and never invents a letter for an unmanaged browser', () => {
    const snapshot = {
      pending: [],
      devices: [
        {
          id: 'device-c',
          installationId: 'install-c',
          name: 'Chrome Browser',
          client: 'extension',
          clientVersion: '1.0.0',
          origin: 'chrome-extension://c',
          createdAt: 1,
          lastSeenAt: 2,
        },
        {
          id: 'device-external',
          installationId: 'install-external',
          name: 'External Browser',
          client: 'extension',
          clientVersion: '1.0.0',
          origin: 'chrome-extension://external',
          createdAt: 2,
          lastSeenAt: 3,
        },
      ],
      status: {
        revision: 1,
        running: true,
        connected: true,
        protocolVersion: 3,
        engineIdentityId: 'engine',
        engineInstanceId: 'engine-instance',
        connections: [
          {
            deviceId: 'device-c',
            installationId: 'install-c',
            client: 'extension',
            clientVersion: '1.0.0',
            capabilities: [],
            sessionId: 'session-c',
            connectionId: 'connection-c',
            connectedAt: 3,
            managedInstance: { manager: 'ytray' as const, instanceId: 'ytray-instance-c', badge: 'C' },
          },
        ],
      },
    }
    const instances = normalizeBrowserInstances(snapshot)

    expect(instances.find((item) => item.id === 'device-c')).toMatchObject({ identity: 'C' })
    expect(instances.find((item) => item.id === 'device-external')?.identity).toBeUndefined()
    expect(browserInstanceMentionName(instances.find((item) => item.id === 'device-c')!)).toBe('C')
  })

  it('does not request a thumbnail for a background tab', async () => {
    await expect(
      readBrowserThumbnail({
        id: 'device-a',
        installationId: 'install-a',
        name: 'Browser A',
        client: 'extension',
        clientVersion: '1',
        origin: 'chrome-extension://a',
        createdAt: 1,
        lastSeenAt: 2,
        online: true,
        running: false,
        tab: { id: 1, title: 'Background tab', url: 'https://example.test', active: false },
        connection: {
          deviceId: 'device-a',
          installationId: 'install-a',
          client: 'extension',
          clientVersion: '1',
          capabilities: ['browser.thumbnail'],
          sessionId: 'session-a',
          connectionId: 'connection-a',
          connectedAt: 2,
        },
      }),
    ).resolves.toBeUndefined()
    expect(callBrowserExtensionCapability).not.toHaveBeenCalled()
  })

  it('publishes pairing and fast previews while a slow preview spans polling rounds, and ignores disconnected results', async () => {
    vi.useFakeTimers()
    const devices = ['slow', 'fast'].map((id) => ({
      id,
      installationId: id,
      name: id,
      client: 'extension',
      clientVersion: '1',
      origin: 'chrome-extension://test',
      createdAt: 1,
      lastSeenAt: 2,
    }))
    const connections = devices.map((device) => ({
      deviceId: device.id,
      installationId: device.id,
      client: 'extension',
      clientVersion: '1',
      capabilities: ['browser.tabs'],
      sessionId: device.id,
      connectionId: device.id,
      connectedAt: 2,
    }))
    const snapshot = {
      devices,
      pending: [],
      status: {
        revision: 1,
        running: true,
        connected: true,
        protocolVersion: 3,
        engineIdentityId: 'engine',
        engineInstanceId: 'engine-instance',
        connections,
      },
    }
    vi.mocked(getBrowserExtensionSnapshot).mockResolvedValue(snapshot)
    let resolveSlow!: (value: unknown[]) => void
    vi.mocked(callBrowserExtensionCapability).mockImplementation(async (id) =>
      id === 'slow'
        ? new Promise((resolve) => {
            resolveSlow = resolve
          })
        : [{ id: 1, title: 'Fast', url: 'https://fast.test', active: true }],
    )
    const hook = renderHook(useBrowserInstances)
    try {
      await act(async () => {})
      expect(hook.result.current.loading).toBe(false)
      expect(hook.result.current.instances).toHaveLength(2)
      expect(hook.result.current.instances.find((item) => item.id === 'fast')?.tab?.title).toBe('Fast')
      const pending = [
        {
          id: 'pair-new',
          installationId: 'new-install',
          extensionId: 'extension',
          client: 'extension',
          clientVersion: '1',
          origin: 'chrome-extension://test',
          code: '123456',
          createdAt: 1,
          expiresAt: 60_000,
        },
      ]
      vi.mocked(getBrowserExtensionSnapshot).mockResolvedValue({ ...snapshot, pending })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000)
      })
      expect(hook.result.current.pending).toEqual(pending)
      expect(vi.mocked(callBrowserExtensionCapability).mock.calls.filter(([id]) => id === 'slow')).toHaveLength(1)
      await act(async () => {
        resolveSlow([{ id: 2, title: 'Slow', url: 'https://slow.test' }])
      })
      expect(hook.result.current.instances.find((item) => item.id === 'slow')?.tab?.title).toBe('Slow')
      await act(async () => {
        await refreshBrowserInstances(true)
      })
      vi.mocked(getBrowserExtensionSnapshot).mockResolvedValue({
        ...snapshot,
        status: { ...snapshot.status, connections: [] },
      })
      await act(async () => {
        await refreshBrowserInstances(true)
      })
      await act(async () => {
        resolveSlow([{ id: 3, title: 'Stale', url: 'https://stale.test' }])
      })
      expect(hook.result.current.instances.find((item) => item.id === 'slow')).toMatchObject({
        online: false,
        tab: { title: 'Slow' },
      })
    } finally {
      hook.unmount()
      vi.useRealTimers()
    }
  })
})
