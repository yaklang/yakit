import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NewAIThirdPartyApplicationConfigBase } from '../NewAIThirdPartyApplicationConfig'

const mocks = vi.hoisted(() => {
  const invoke = vi.fn()
  window.require = (() => ({ ipcRenderer: { invoke } })) as unknown as typeof window.require
  return { invoke }
})

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/utils/envfile', () => ({ isMemfit: () => false, fetchEnv: () => 'yakit' }))
vi.mock('@/utils/clipboard', () => ({ setClipboardText: vi.fn() }))
vi.mock('@/utils/tool', () => ({ JSONParseLog: JSON.parse }))
vi.mock('@/utils/editors', () => ({ NewHTTPPacketEditor: () => null }))
vi.mock('@/utils/kv', () => ({ setRemoteValue: vi.fn() }))
vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({ default: vi.fn() }))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({ showYakitModal: vi.fn() }))
vi.mock('@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard', () => ({
  HorizontalScrollCard: () => null,
}))
vi.mock('@/pages/mitm/MITMRule/MITMRuleFromModal', () => ({ InputHTTPHeaderForm: () => null }))
vi.mock('@/pages/ai-agent/aiModelList/utils', async () => {
  const { normalizeAIAPIType } = await import('@/pages/ai-agent/aiModelList/aiApiTypeOptions')
  return {
    normalizeAIAPIType,
    grpcGetAIThirdPartyAppConfigTemplate: async () => ({ Templates: [] }),
    grpcQueryAIProviderAll: async () => ({ Providers: [] }),
    grpcProbeReasoningEffort: vi.fn(),
    sortMemfitNameFirst: (names: string[]) => names,
  }
})

beforeEach(() => {
  mocks.invoke.mockReset().mockResolvedValue({ ModelName: ['remote-model'] })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  )
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('NewAIThirdPartyApplicationConfigBase model discovery', () => {
  it.each([false, true])(
    'serializes the actual form through both converters (enable_endpoint=%s)',
    async (enableEndpoint) => {
      const formValues = {
        Type: 'custom',
        api_key: 'test-api-key',
        api_type: 'responses',
        model: 'configured-model',
        base_url: 'https://models.example.test/v1',
        endpoint: 'https://endpoint.example.test/responses',
        enable_endpoint: enableEndpoint,
        proxy: 'http://proxy.example.test:8080',
        Headers: [{ Key: 'X-Tenant', Value: 'tenant-a' }],
        MaxTokens: 4096,
        Temperature: 0,
        _EffortProbed: true,
        _ProbedExtendedEfforts: ['xhigh'],
      }
      render(<NewAIThirdPartyApplicationConfigBase formValues={formValues} />)

      const field = await screen.findByLabelText(enableEndpoint ? 'Endpoint' : 'BaseURL')
      const refresh = screen.getByRole('button', { name: 'ConfigNetworkPage.modelNameRefreshBtn' })
      fireEvent.click(refresh)
      await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('ListAiModel', expect.any(Object)))
      const config = JSON.parse(mocks.invoke.mock.calls.at(-1)![1].Config)
      expect(config).not.toHaveProperty('ExtraParams')
      expect(config).toEqual({
        Type: 'custom',
        api_key: 'test-api-key',
        api_type: 'responses',
        domain: '',
        no_https: false,
        proxy: 'http://proxy.example.test:8080',
        base_url: enableEndpoint ? '' : 'https://models.example.test/v1',
        endpoint: enableEndpoint ? 'https://endpoint.example.test/responses' : '',
        enable_endpoint: enableEndpoint,
        Headers: [{ Key: 'X-Tenant', Value: 'tenant-a' }],
      })

      mocks.invoke.mockClear()
      fireEvent.change(field, { target: { value: 'https://updated.example.test/api' } })
      fireEvent.click(refresh)
      await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('ListAiModel', expect.any(Object)))
      expect(JSON.parse(mocks.invoke.mock.calls.at(-1)![1].Config)).toMatchObject({
        [enableEndpoint ? 'endpoint' : 'base_url']: 'https://updated.example.test/api',
        api_type: 'responses',
        enable_endpoint: enableEndpoint,
      })
    },
  )
})
