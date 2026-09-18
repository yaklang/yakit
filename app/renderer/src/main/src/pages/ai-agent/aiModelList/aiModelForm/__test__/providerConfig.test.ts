import { describe, expect, it } from 'vitest'
import type { ThirdPartyApplicationConfig } from '@/components/configNetwork/ConfigNetworkPage'
import { providerToListAiModelConfig } from '../providerConfig'

describe('providerToListAiModelConfig', () => {
  it('preserves custom connection fields and provider extension parameters', () => {
    const provider: ThirdPartyApplicationConfig = {
      Type: 'custom',
      APIKey: 'custom-api-key',
      APIType: 'responses',
      Domain: 'gateway.example.test',
      NoHttps: true,
      Proxy: 'http://proxy.example.test:8080',
      BaseURL: 'https://gateway.example.test/custom/v1',
      Endpoint: '/deployment/models',
      EnableEndpoint: true,
      Headers: [{ Key: 'X-Tenant', Value: 'tenant-a' }],
      ExtraParams: [{ Key: 'api_version', Value: '2026-01-01' }],
    }

    expect(JSON.parse(providerToListAiModelConfig(provider)!)).toEqual({
      Type: 'custom',
      api_key: 'custom-api-key',
      api_type: 'responses',
      domain: 'gateway.example.test',
      no_https: true,
      proxy: 'http://proxy.example.test:8080',
      base_url: 'https://gateway.example.test/custom/v1',
      endpoint: '/deployment/models',
      enable_endpoint: true,
      Headers: [{ Key: 'X-Tenant', Value: 'tenant-a' }],
      ExtraParams: [{ Key: 'api_version', Value: '2026-01-01' }],
    })
  })

  it('supplies defaults for a provider without optional connection fields', () => {
    expect(JSON.parse(providerToListAiModelConfig({ Type: 'openai' })!)).toEqual({
      Type: 'openai',
      api_key: '',
      api_type: '',
      domain: '',
      no_https: false,
      proxy: '',
      base_url: '',
      endpoint: '',
      enable_endpoint: false,
      Headers: [],
      ExtraParams: [],
    })
  })

  it('keeps endpoint configuration when its override is explicitly disabled', () => {
    const config = providerToListAiModelConfig({
      Type: 'custom',
      BaseURL: 'https://gateway.example.test/v1',
      Endpoint: '/deployment/models',
      EnableEndpoint: false,
      NoHttps: false,
    })

    expect(JSON.parse(config!)).toMatchObject({
      base_url: 'https://gateway.example.test/v1',
      endpoint: '/deployment/models',
      enable_endpoint: false,
      no_https: false,
    })
  })

  it('does not create a request configuration when the provider is missing', () => {
    expect(providerToListAiModelConfig()).toBeUndefined()
  })
})
