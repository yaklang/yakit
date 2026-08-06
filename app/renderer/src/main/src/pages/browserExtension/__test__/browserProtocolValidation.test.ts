import { describe, expect, it } from 'vitest'
import {
  BrowserProtocolValidationError,
  browserSnapshotResources,
  decodeBrowserSnapshotResource,
  decodeBrowserTaskResult,
  encodeBrowserTaskPayload,
  validateBrowserTaskEvent,
} from '../browserProtocolValidation'

function context(side: 'left' | 'right') {
  return {
    side,
    deviceId: `device-${side}`,
    installationId: `installation-${side}`,
    isolationContextId: `context-${side}`,
    cookieStoreId: `store-${side}`,
    origin: 'https://example.test',
    grantId: `grant-${side}`,
    target: { tabId: side === 'left' ? 1 : 2, frameId: 0, documentId: `document-${side}` },
    fingerprint: `fingerprint-${side}`,
    contextReference: { kind: 'handle', id: `handle-${side}` },
    authentication: {
      status: 'authenticated',
      cookieCount: 1,
      storageEntryCount: 0,
      authCookieNames: null,
      authStorageKeys: null,
    },
    expiresAt: Date.now() + 60_000,
  }
}

function workspace(extra: Record<string, unknown> = {}) {
  return {
    version: 1,
    id: 'workspace-1',
    engineInstanceId: 'engine-1',
    mode: 'horizontal',
    state: 'ready',
    left: context('left'),
    right: context('right'),
    proof: { id: 'proof-1', level: 'strong', reasons: null, expiresAt: Date.now() + 60_000 },
    baselines: {},
    baselinePair: {
      state: 'waiting',
      reasons: null,
      resourceCandidates: null,
      operationCandidates: null,
    },
    createdAt: Date.now(),
    expiresAt: Date.now() + 60_000,
    ...extra,
  }
}

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
    )
    expect(status.connections).toEqual([])
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

  it('normalizes nullable authorization collections before components can call filter or map', () => {
    const result = decodeBrowserTaskResult(
      'authorization.workspace.inspect',
      { workspaceId: 'workspace-1' },
      JSON.stringify(workspace()),
    ) as ReturnType<typeof workspace>
    expect(result.left.authentication.authCookieNames).toEqual([])
    expect(result.proof.reasons).toEqual([])
    expect(result.baselinePair.resourceCandidates).toEqual([])
    expect(result.baselinePair.operationCandidates).toEqual([])
  })

  it('rejects old workspace versions and unexpected fields instead of leaking them into React', () => {
    expect(() =>
      decodeBrowserTaskResult('authorization.workspace.inspect', {}, JSON.stringify(workspace({ version: 0 }))),
    ).toThrow('$.version')
    expect(() =>
      decodeBrowserTaskResult('authorization.workspace.inspect', {}, JSON.stringify(workspace({ unexpected: true }))),
    ).toThrow('$.unexpected')
  })

  it('normalizes capability list null and rejects a non-array list response', () => {
    expect(decodeBrowserTaskResult('capability.call', { method: 'browser.transform.profile.list' }, 'null')).toEqual([])
    expect(() =>
      decodeBrowserTaskResult('capability.call', { method: 'browser.transform.profile.list' }, '{}'),
    ).toThrow('数组或空值')
    expect(() =>
      decodeBrowserTaskResult('capability.call', { method: 'browser.authorization.baseline.candidates' }, '[null]'),
    ).toThrow('$[0]')
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

  it('normalizes evidence collections and rejects prototype-pollution keys', () => {
    const evidence = decodeBrowserTaskResult(
      'authorization.evidence.inspect',
      {},
      JSON.stringify({
        version: 1,
        workspaceId: 'workspace-1',
        executionId: 'execution-1',
        cases: null,
        comparisons: null,
        semantic: null,
        representations: null,
      }),
    ) as Record<string, unknown>
    expect(evidence.cases).toEqual([])
    expect(evidence.representations).toEqual([])

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
