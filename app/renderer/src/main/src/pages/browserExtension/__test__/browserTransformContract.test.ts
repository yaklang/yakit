import { describe, expect, it } from 'vitest'
import {
  browserTransformRequestFields,
  toBrowserTransformSelection,
  type BrowserTransformSelectableProfile,
} from '../browserTransformContract'

const profile: BrowserTransformSelectableProfile = {
  id: 'profile-1',
  name: 'AES + RSA gateway',
  origin: 'https://example.test',
  maxConcurrency: 1,
  request: { enabled: true },
  response: { enabled: false },
}

describe('browser transform Web Fuzzer contract', () => {
  it('maps the confirmed profile to the exact Web Fuzzer request identifiers', () => {
    const selection = toBrowserTransformSelection({ id: 'browser-1', name: 'Chrome Browser' }, profile)
    expect(selection).toMatchObject({
      deviceId: 'browser-1',
      profileId: 'profile-1',
      profileName: profile.name,
      requestEnabled: true,
      responseEnabled: false,
    })
    expect(browserTransformRequestFields(selection)).toEqual({
      BrowserExtensionDeviceId: 'browser-1',
      BrowserTransformProfileId: 'profile-1',
    })
    expect(browserTransformRequestFields()).toEqual({})
  })
})
