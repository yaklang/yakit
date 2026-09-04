import { describe, expect, it, vi } from 'vitest'
import {
  activateMemfitLicense,
  getMemfitLicenseRequest,
  normalizeCachedLicense,
  verifyCachedMemfitLicense,
} from '../memfitLicense'

const createClient = (overrides = {}) => ({
  GetLicense: vi.fn((_params, callback) => callback(null, { License: 'request-code' })),
  CheckLicense: vi.fn((_params, callback) => callback(null, {})),
  GetKey: vi.fn((_params, callback) => callback(null, { Value: JSON.stringify('activation-code') })),
  SetKey: vi.fn((_params, callback) => callback(null, {})),
  ...overrides,
})

describe('memfit main-process license gate', () => {
  it('supports both JSON encoded and legacy raw cached activation codes', () => {
    expect(normalizeCachedLicense(JSON.stringify('activation-code'))).toBe('activation-code')
    expect(normalizeCachedLicense('legacy-activation-code')).toBe('legacy-activation-code')
    expect(normalizeCachedLicense('')).toBe('')
  })

  it('gets the device request code from the engine', async () => {
    const client = createClient()
    await expect(getMemfitLicenseRequest(() => client)).resolves.toBe('request-code')
  })

  it('checks and caches a newly submitted license before allowing entry', async () => {
    const client = createClient()
    await expect(activateMemfitLicense(() => client, ' activation-code ')).resolves.toBe(true)
    expect(client.CheckLicense).toHaveBeenCalledWith(
      { LicenseActivation: 'activation-code', CompanyVersion: 'EnpriTrace' },
      expect.any(Function),
    )
    expect(client.SetKey).toHaveBeenCalledWith(
      { Key: 'LICENSE_ACTIVATION', Value: JSON.stringify('activation-code') },
      expect.any(Function),
    )
  })

  it('does not verify when no cached license exists', async () => {
    const client = createClient({
      GetKey: vi.fn((_params, callback) => callback(null, { Value: '' })),
    })
    await expect(verifyCachedMemfitLicense(() => client)).resolves.toBe(false)
    expect(client.CheckLicense).not.toHaveBeenCalled()
  })

  it('rechecks a cached activation code with the engine', async () => {
    const client = createClient()
    await expect(verifyCachedMemfitLicense(() => client)).resolves.toBe(true)
    expect(client.CheckLicense).toHaveBeenCalledWith(
      { LicenseActivation: 'activation-code', CompanyVersion: 'EnpriTrace' },
      expect.any(Function),
    )
  })
})
