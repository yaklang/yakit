import { describe, expect, it } from 'vitest'
import {
  BrowserProtocolValidationError,
  browserSnapshotResources,
  decodeBrowserSnapshotResource,
  decodeBrowserTaskResult,
  encodeBrowserTaskPayload,
  validateBrowserTaskEvent,
} from '../browserProtocolValidation'

describe('browser protocol runtime validation', () => {
  it('normalizes absent YakURL resources and nullable status collections', () => {
    expect(browserSnapshotResources({ Resources: null })).toEqual([])
    const status = decodeBrowserSnapshotResource(
      'status',
      JSON.stringify({
        revision: 1,
        running: true,
        connected: false,
        protocolVersion: 3,
        engineIdentityId: 'identity-1',
        engineInstanceId: 'engine-1',
        connections: null,
      }),
    ) as { connections: Array<{ managedInstance?: { manager: string; instanceId: string; badge: string } }> }
    expect(status.connections).toEqual([])
  })

  it('keeps the authenticated managed-browser identity in the connection snapshot', () => {
    const status = decodeBrowserSnapshotResource(
      'status',
      JSON.stringify({
        revision: 1,
        running: true,
        connected: true,
        protocolVersion: 3,
        engineIdentityId: 'identity-1',
        engineInstanceId: 'engine-1',
        connections: [
          {
            deviceId: 'device-a',
            installationId: 'installation-a',
            client: 'extension',
            clientVersion: '1',
            capabilities: [],
            sessionId: 'session-a',
            connectionId: 'connection-a',
            connectedAt: 1,
            managedInstance: { manager: 'ytray', instanceId: 'instance-a', badge: 'A' },
            capabilityCatalog: {
              version: 1,
              schemaDialect: 'http://json-schema.org/draft-07/schema#',
              hash: '0'.repeat(64),
              capabilities: [
                {
                  method: 'browser.thumbnail',
                  domain: 'page',
                  access: 'read',
                  agentVisible: false,
                  summary: 'UI preview',
                  scopes: ['browser.tabs.read'],
                  targetMode: 'tab',
                  defaultTimeoutMs: 20_000,
                  paramsSchema: {},
                },
              ],
            },
          },
        ],
      }),
    ) as {
      connections: Array<{
        managedInstance?: { manager: string; instanceId: string; badge: string }
        capabilityCatalog?: { capabilities: Array<{ agentVisible?: boolean }> }
      }>
    }
    expect(status.connections[0].managedInstance).toEqual({ manager: 'ytray', instanceId: 'instance-a', badge: 'A' })
    expect(status.connections[0].capabilityCatalog?.capabilities[0].agentVisible).toBe(false)
  })

  it('keeps the managed-browser identity on a pending pairing request', () => {
    const request = decodeBrowserSnapshotResource(
      'pairing-request',
      JSON.stringify({
        id: 'pairing-a',
        installationId: 'installation-a',
        managedInstance: { manager: 'ytray', instanceId: 'instance-a', badge: 'A' },
        extensionId: 'extension-a',
        client: 'extension',
        clientVersion: '1',
        origin: 'chrome-extension://extension-a',
        code: '123456',
        createdAt: 1,
        expiresAt: 2,
      }),
    ) as { managedInstance?: { badge: string } }
    expect(request.managedInstance?.badge).toBe('A')
  })

  it('rejects old protocols, invalid catalog hashes, and extra top-level fields with paths', () => {
    expect(() =>
      decodeBrowserSnapshotResource(
        'status',
        JSON.stringify({
          revision: 1,
          running: true,
          connected: false,
          protocolVersion: 2,
          engineIdentityId: 'identity-1',
          engineInstanceId: 'engine-1',
          connections: [],
        }),
      ),
    ).toThrow('$.protocolVersion')

    expect(() =>
      decodeBrowserSnapshotResource(
        'status',
        JSON.stringify({
          revision: 1,
          running: true,
          connected: true,
          protocolVersion: 3,
          engineIdentityId: 'identity-1',
          engineInstanceId: 'engine-1',
          connections: [
            {
              deviceId: 'device-1',
              installationId: 'installation-1',
              client: 'extension',
              clientVersion: '1',
              capabilities: [],
              sessionId: 'session-1',
              connectionId: 'connection-1',
              managedInstance: { manager: 'ytray', instanceId: 'instance-a', badge: 'A' },
              connectedAt: 1,
              capabilityCatalog: {
                version: 1,
                schemaDialect: 'http://json-schema.org/draft-07/schema#',
                hash: 'old-schema-hash',
                capabilities: [],
              },
            },
          ],
        }),
      ),
    ).toThrow('capabilityCatalog.hash')

    expect(() =>
      decodeBrowserSnapshotResource(
        'status',
        JSON.stringify({
          revision: 1,
          running: true,
          connected: false,
          protocolVersion: 3,
          engineIdentityId: 'identity-1',
          engineInstanceId: 'engine-1',
          connections: [],
          legacyField: true,
        }),
      ),
    ).toThrow('$.legacyField')
  })

  it('normalizes capability list null and rejects a non-array list response', () => {
    expect(decodeBrowserTaskResult('capability.call', { method: 'browser.transform.profile.list' }, 'null')).toEqual([])
    expect(() =>
      decodeBrowserTaskResult('capability.call', { method: 'browser.transform.profile.list' }, '{}'),
    ).toThrow('数组或空值')
  })

  it('rejects malformed typed capability records before component callbacks run', () => {
    expect(() =>
      decodeBrowserTaskResult(
        'capability.call',
        { method: 'browser.recording.get' },
        JSON.stringify({ events: [null], traces: [], links: [], callables: [], profileCandidates: [] }),
      ),
    ).toThrow('$.events[0]')
    expect(() =>
      decodeBrowserTaskResult(
        'capability.call',
        { method: 'browser.profile.validation.latest' },
        JSON.stringify({ contractVersion: 1, id: 'draft-1' }),
      ),
    ).toThrow('$.profile')
  })

  it('rejects prototype-pollution keys', () => {
    expect(() =>
      decodeBrowserTaskResult(
        'capability.call',
        { method: 'custom.echo' },
        '{"safe":true,"__proto__":{"polluted":true}}',
      ),
    ).toThrow('$.__proto__')
  })

  it('enforces the outbound payload budget with a structured protocol error', () => {
    expect(() => encodeBrowserTaskPayload({ value: 'x'.repeat(256 * 1024) }, 'capability.call')).toThrow(
      BrowserProtocolValidationError,
    )
  })

  it('validates task events before stream data reaches a workspace', () => {
    expect(
      validateBrowserTaskEvent({
        Type: 'result',
        Data: new Uint8Array([123, 125]),
        Timestamp: '1785730000000',
        Sequence: '7',
      }),
    ).toMatchObject({ Type: 'result', Timestamp: 1785730000000, Sequence: 7 })
    expect(
      validateBrowserTaskEvent({
        Type: 'running',
        Timestamp: 1785730000001,
        Sequence: 8,
      }),
    ).toMatchObject({ Timestamp: 1785730000001, Sequence: 8 })
    expect(() => validateBrowserTaskEvent({ Type: 'unknown' })).toThrow('$.Type')
    expect(() => validateBrowserTaskEvent({ Type: 'result', Data: 'e30=' })).toThrow('$.Data')
    expect(() => validateBrowserTaskEvent({ Type: 'result', Timestamp: '-1' })).toThrow('$.Timestamp')
    expect(() => validateBrowserTaskEvent({ Type: 'result', Sequence: '1.5' })).toThrow('$.Sequence')
    expect(() =>
      validateBrowserTaskEvent({
        Type: 'result',
        Sequence: `${Number.MAX_SAFE_INTEGER + 1}`,
      }),
    ).toThrow('$.Sequence')
  })
})
