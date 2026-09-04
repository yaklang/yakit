import { describe, expect, it } from 'vitest'
import type { TransformProfileInput } from '../browserTransformTypes'
import { browserTransformRequestFields, toBrowserTransformSelection } from '../browserTransformContract'

const profile: TransformProfileInput = {
  name: 'AES + RSA gateway',
  enabled: true,
  target: { tabId: 7, frameId: 0, documentId: 'document-1' },
  origin: 'https://example.test',
  match: { methods: ['POST'], urlPattern: '*/encrypt/aesrsa.php' },
  request: {
    enabled: true,
    nodes: [
      { id: 'input', name: 'Plain body', kind: 'context.read', path: 'body' },
      {
        id: 'call',
        name: 'Captured transaction',
        kind: 'page.call',
        callableId: 'callable-1',
        arguments: [{ nodeId: 'input' }],
      },
      {
        id: 'output',
        name: 'Wire body',
        kind: 'output.write',
        destination: 'body',
        source: { nodeId: 'call' },
        encoding: 'json',
      },
    ],
  },
  response: { enabled: false, nodes: [] },
  failMode: 'closed',
  maxConcurrency: 1,
}

describe('browser transform Web Fuzzer contract', () => {
  it('maps the confirmed profile to the exact Web Fuzzer request identifiers', () => {
    const selection = toBrowserTransformSelection(
      { id: 'browser-1', name: 'Chrome Browser' },
      { id: 'profile-1', name: profile.name, origin: profile.origin, maxConcurrency: 1 },
    )
    expect(selection).toMatchObject({
      deviceId: 'browser-1',
      profileId: 'profile-1',
      profileName: profile.name,
    })
    expect(browserTransformRequestFields(selection)).toEqual({
      BrowserExtensionDeviceId: 'browser-1',
      BrowserTransformProfileId: 'profile-1',
    })
    expect(browserTransformRequestFields()).toEqual({})
  })
})
