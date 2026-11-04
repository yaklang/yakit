import { describe, expect, it, vi } from 'vitest'
import '../../../../ai-re-act/hooks/__test__/setupElectron'
vi.mock('lottie-web', () => ({ default: vi.fn() }))
vi.mock('@/components/yakitUI/YakitSwitch/yakitSwitchAnimation.scss', () => ({}))
import {
  buildAIConfigHealthCheckConfig,
  buildAIConfigHealthCheckFormValues,
  formValueToAIConfigProvider,
} from '../providerFormConfig'
describe('script and ordinary provider roundtrip', () => {
  it('keeps script text and native-tool capability in save, restore and health checking', () => {
    const provider = {
      Type: 'yak-script',
      Script: 'chat = func(req, emit) { return "ok" }',
      EnableNativeToolCalling: true,
    }
    const values = buildAIConfigHealthCheckFormValues(provider)
    expect(formValueToAIConfigProvider({ ...values, api_key: 'old key', endpoint: 'old endpoint' })).toEqual(provider)
    expect(buildAIConfigHealthCheckConfig({ ...values, api_key: 'old key' })).toEqual(provider)
  })
  it('retains normal API configuration, headers, false values and extension parameters', () => {
    const provider = {
      Type: 'custom',
      APIKey: 'example-only',
      APIType: 'responses',
      EnableEndpoint: false,
      Headers: [{ Key: 'X-Tenant', Value: 'A' }],
      ExtraParams: [{ Key: 'tenant', Value: 'A' }],
      ReasoningEffort: 'middle',
    }
    const values = buildAIConfigHealthCheckFormValues(provider)
    expect(values.ReasoningEffort).toBe('medium')
    const saved = formValueToAIConfigProvider(values)
    expect(saved).toMatchObject({ ...provider, ReasoningEffort: 'medium' })
  })
  it('does not leak script/editor-only fields into ordinary provider extension parameters', () => {
    const config = buildAIConfigHealthCheckConfig({
      Type: 'custom',
      api_key: 'example-only',
      script: 'sensitive code',
      enable_native_tool_calling: true,
      model_type: 'tier_intelligent',
    })
    expect(config.ExtraParams).toBeUndefined()
    expect(config).not.toHaveProperty('Script')
  })
})
