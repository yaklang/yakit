import { describe, expect, it, vi } from 'vitest'

vi.mock('@/services/electronBridge', () => ({
  yakitManagedBrowser: { list: vi.fn(async () => []) },
}))
vi.mock('@/pages/browserExtension/browserExtensionClient', () => ({
  callBrowserExtensionCapability: vi.fn(),
  getBrowserExtensionSnapshot: vi.fn(),
}))

import {
  browserInstanceDisplayName,
  browserInstanceMentionName,
  normalizeBrowserInstances,
  readBrowserThumbnail,
} from '../browserInstanceStore'
import { callBrowserExtensionCapability } from '@/pages/browserExtension/browserExtensionClient'

describe('browser instance presentation', () => {
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
              client: 'chrome-extension',
              clientVersion: '1.0.0',
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

    expect(instance).toMatchObject({ identity: 'A', name: '管理员', online: true, running: false })
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
    expect(browserInstanceMentionName(instances.find((item) => item.id === 'device-c')!)).toBe('@C')
  })

  it('uses the current tab title instead of the generic extension name', () => {
    expect(
      browserInstanceDisplayName({
        id: 'device-a',
        installationId: 'install-a',
        name: 'Chrome Browser',
        client: 'extension',
        clientVersion: '1.0.0',
        origin: 'chrome-extension://a',
        createdAt: 1,
        lastSeenAt: 2,
        online: true,
        running: false,
        identity: 'A',
        tab: { id: 1, title: '哔哩哔哩首页', url: 'https://www.bilibili.com/' },
      }),
    ).toBe('A · 哔哩哔哩首页')
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
})
