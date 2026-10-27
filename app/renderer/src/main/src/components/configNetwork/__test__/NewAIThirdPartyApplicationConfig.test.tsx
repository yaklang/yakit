import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import type { FormInstance } from 'antd'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NewAIThirdPartyApplicationConfigBase } from '../NewAIThirdPartyApplicationConfig'
import {
  AIModelForm,
  buildAIConfigHealthCheckConfig,
  buildAIConfigHealthCheckFormValues,
  formValueToAIConfigProvider,
} from '@/pages/ai-agent/aiModelList/aiModelForm/AIModelForm'
import type { AIGlobalConfig, AIModelConfig } from '@/pages/ai-agent/aiModelList/utils'
import { AIModelTypeEnum } from '@/pages/ai-agent/defaultConstant'

const mocks = vi.hoisted(() => {
  const invoke = vi.fn()
  window.require = (() => ({ ipcRenderer: { invoke } })) as unknown as typeof window.require
  return { invoke, healthCheck: vi.fn(), save: vi.fn(), config: {} as AIGlobalConfig }
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
vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({
  default: () => [
    { aiGlobalConfigRef: { current: mocks.config } },
    { getLastAIGlobalConfig: async () => mocks.config, setAIGlobalConfig: mocks.save },
  ],
}))
vi.mock('@/components/yakitUI/YakitEditor/YakitEditor', () => ({
  YakitEditor: ({ value, setValue, readOnly }) => (
    <textarea
      aria-label="yak-model-script"
      value={value}
      onChange={(e) => setValue?.(e.target.value)}
      readOnly={readOnly}
    />
  ),
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({ showYakitModal: vi.fn() }))
vi.mock('@/pages/plugins/operator/horizontalScrollCard/HorizontalScrollCard', () => ({
  HorizontalScrollCard: () => null,
}))
vi.mock('@/pages/mitm/MITMRule/MITMRuleFromModal', () => ({ InputHTTPHeaderForm: () => null }))
vi.mock('@/pages/ai-agent/aiModelList/utils', async () => {
  const { normalizeAIAPIType } = await import('@/pages/ai-agent/aiModelList/aiApiTypeOptions')
  return {
    normalizeAIAPIType,
    grpcGetAIThirdPartyAppConfigTemplate: async () => ({
      Templates: [
        { Name: 'yak-script', Verbose: 'Yak script' },
        { Name: 'openai', Verbose: 'OpenAI' },
      ],
    }),
    grpcAIConfigHealthCheck: mocks.healthCheck,
    grpcQueryAIProviderAll: async () => ({ Providers: [] }),
    grpcProbeReasoningEffort: vi.fn(),
    sortMemfitNameFirst: (names: string[]) => names,
  }
})

beforeEach(() => {
  mocks.invoke.mockReset().mockResolvedValue({ ModelName: ['remote-model'] })
  mocks.healthCheck.mockReset().mockResolvedValue({ Success: true })
  mocks.save.mockReset().mockResolvedValue(undefined)
  mocks.config = { IntelligentModels: [], LightweightModels: [], VisionModels: [] } as unknown as AIGlobalConfig
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

describe('Yak script model configuration', () => {
  const script = 'chat = func(req, emit) { return "hello" }'
  const provider = { Type: 'yak-script', Script: script, EnableNativeToolCalling: false }

  it('adds a script model with the default editor template through the real save flow', async () => {
    render(<AIModelForm onClose={vi.fn()} />)
    fireEvent.change(await screen.findByRole('combobox', { name: 'ConfigNetworkPage.typeLabel' }), {
      target: { value: 'yak-script' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'ConfigNetworkPage.scriptConfigName' }), {
      target: { value: 'script-model' },
    })
    expect(screen.getByRole('switch', { name: 'ConfigNetworkPage.nativeToolCalling' })).not.toBeChecked()
    const editor = await screen.findByLabelText('yak-model-script')
    expect((editor as HTMLTextAreaElement).value).toContain('provider.ReadSSE')
    expect(screen.queryByText('ConfigNetworkPage.scriptTemplate')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ConfigNetworkPage.loadProviderExample' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'AIModelList.confirmAddBtn' }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce())
    const saved = mocks.save.mock.calls[0][0].IntelligentModels[0]
    expect(saved.ModelName).toBe('script-model')
    expect(saved.Provider).toEqual({
      Type: 'yak-script',
      Script: expect.stringContaining('provider.ReadSSE'),
      EnableNativeToolCalling: false,
    })
    expect(mocks.invoke).not.toHaveBeenCalled()
  })

  it('round-trips script and protocol switch without connection fields', async () => {
    const ref = createRef<{ form: FormInstance }>()
    render(
      <NewAIThirdPartyApplicationConfigBase
        ref={ref}
        formValues={{
          ...buildAIConfigHealthCheckFormValues(provider),
          model: 'my-script',
          model_type: AIModelTypeEnum.TierIntelligent,
        }}
      />,
    )
    expect(await screen.findByLabelText('yak-model-script')).toHaveValue(script)
    expect(screen.queryByLabelText('Reasoning Effort')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('ConfigNetworkPage.APItype')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ConfigNetworkPage.modelNameRefreshBtn' })).not.toBeInTheDocument()
    let values: any
    await act(async () => {
      values = await ref.current!.form.validateFields()
    })
    const saved = formValueToAIConfigProvider(values)
    expect(saved).toEqual(provider)
    expect(buildAIConfigHealthCheckConfig(values)).toEqual(provider)
    expect(buildAIConfigHealthCheckFormValues(saved)).toEqual({
      Type: 'yak-script',
      script,
      enable_native_tool_calling: false,
    })
    for (const label of ['ApiKey', 'BaseURL', 'Endpoint', 'Header', 'ConfigNetworkPage.scriptTimeout']) {
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument()
    }
    expect(screen.queryByText('ConfigNetworkPage.advancedConfigTitle')).not.toBeInTheDocument()
    expect(
      formValueToAIConfigProvider({
        ...values,
        api_key: 'stale',
        base_url: 'https://ignored.invalid',
        ExtraParams: [{ Key: 'tenant', Value: 'ignored' }],
      }),
    ).toEqual(provider)
    expect(mocks.invoke).not.toHaveBeenCalled()
  })

  it('validates nonempty scripts without separate parameter or timeout fields', async () => {
    const ref = createRef<{ form: FormInstance }>()
    render(
      <NewAIThirdPartyApplicationConfigBase
        ref={ref}
        formValues={{ Type: 'yak-script', model_type: AIModelTypeEnum.TierIntelligent }}
      />,
    )
    const editor = await screen.findByLabelText('yak-model-script')
    expect((editor as HTMLTextAreaElement).value).toContain('provider.ReadSSE')
    const form = ref.current!.form
    expect(screen.queryByLabelText('ConfigNetworkPage.scriptParams')).not.toBeInTheDocument()
    await act(async () => {
      form.setFieldsValue({ script: '   ' })
      await expect(form.validateFields()).rejects.toMatchObject({
        errorFields: expect.arrayContaining([expect.objectContaining({ name: ['script'] })]),
      })
    })
  })

  it.each([false, true])('tests and saves the edited script and switch (native=%s)', async (enableNative) => {
    const moveTier = enableNative
    const edited = 'chat = func(req, emit) { emit("edited"); return nil }'
    const item = {
      ModelName: 'my-script',
      Provider: provider,
      ExtraParams: [{ Key: 'unrelated', Value: 'keep' }],
    } as AIModelConfig
    mocks.config.IntelligentModels = [item]
    const onClose = vi.fn()
    const { unmount } = render(
      <AIModelForm item={item} aiModelType={AIModelTypeEnum.TierIntelligent} onClose={onClose} />,
    )
    const editor = await screen.findByLabelText('yak-model-script')
    expect(editor).toHaveValue(script)
    fireEvent.change(editor, { target: { value: edited } })
    if (enableNative) fireEvent.click(screen.getByRole('switch', { name: 'ConfigNetworkPage.nativeToolCalling' }))
    if (moveTier) {
      fireEvent.mouseDown(screen.getByRole('combobox', { name: 'ConfigNetworkPage.modelType' }))
      fireEvent.click(await screen.findByTitle('ConfigNetworkPage.lightweightModel'))
    }
    fireEvent.click(screen.getByRole('button', { name: 'AIModelList.testAndAddBtn' }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce())
    expect(mocks.healthCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        Config: { Type: 'yak-script', Script: edited, EnableNativeToolCalling: enableNative },
      }),
    )
    const config = mocks.save.mock.calls[0][0]
    const saved = (moveTier ? config.LightweightModels : config.IntelligentModels)[0]
    if (moveTier) expect(config.IntelligentModels).toEqual([])
    expect(saved.ExtraParams).toEqual([])
    expect(saved.Provider).toEqual({ Type: 'yak-script', Script: edited, EnableNativeToolCalling: enableNative })
    expect(onClose).toHaveBeenCalledOnce()
    unmount()
    render(
      <AIModelForm
        item={saved}
        aiModelType={moveTier ? AIModelTypeEnum.TierLightweight : AIModelTypeEnum.TierIntelligent}
        onClose={onClose}
      />,
    )
    expect(await screen.findByLabelText('yak-model-script')).toHaveValue(edited)
    expect(screen.getByRole('switch', { name: 'ConfigNetworkPage.nativeToolCalling' })).toHaveAttribute(
      'aria-checked',
      String(enableNative),
    )
  })

  it('shows source and disabled protocol switch in the read-only view', () => {
    render(
      <NewAIThirdPartyApplicationConfigBase
        readOnly
        formValues={{
          ...buildAIConfigHealthCheckFormValues(provider),
          model: 'my-script',
          model_type: AIModelTypeEnum.TierIntelligent,
        }}
      />,
    )
    expect(screen.getByDisplayValue(script)).toBeInTheDocument()
    expect(screen.getByRole('switch')).toBeDisabled()
    expect(screen.queryByText('ConfigNetworkPage.advancedConfigTitle')).not.toBeInTheDocument()
    expect(screen.queryByText('ConfigNetworkPage.scriptTimeout')).not.toBeInTheDocument()
  })

  it('clears script fields when switching back to an ordinary provider', async () => {
    const ref = createRef<{ form: FormInstance }>()
    render(
      <NewAIThirdPartyApplicationConfigBase
        ref={ref}
        formValues={{
          ...buildAIConfigHealthCheckFormValues(provider),
          model: 'my-script',
          model_type: AIModelTypeEnum.TierIntelligent,
        }}
      />,
    )
    await screen.findByLabelText('yak-model-script')
    fireEvent.change(screen.getByRole('combobox', { name: 'ConfigNetworkPage.typeLabel' }), {
      target: { value: 'openai' },
    })
    await screen.findByText('Reasoning Effort')
    expect(screen.queryByLabelText('yak-model-script')).not.toBeInTheDocument()
    expect(formValueToAIConfigProvider(ref.current!.form.getFieldsValue()).ExtraParams).toEqual([])
  })
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
      // 与 providerToListAiModelConfig 对齐：ExtraParams 不传给 ListAiModel（后端未使用该字段）
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
