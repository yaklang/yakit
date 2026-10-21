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
  const provider = {
    Type: 'yak-script',
    APIKey: '',
    BaseURL: 'http://127.0.0.1:18080',
    ExtraParams: [
      { Key: 'script', Value: script },
      { Key: 'script_params', Value: '{"cust_id":"tenant-a"}' },
      { Key: 'script_timeout_seconds', Value: '300' },
      { Key: 'tenant', Value: 'keep' },
    ],
  }

  it('adds a QClaw model from the template through the real save flow', async () => {
    render(<AIModelForm onClose={vi.fn()} />)
    fireEvent.change(await screen.findByRole('combobox', { name: 'ConfigNetworkPage.typeLabel' }), {
      target: { value: 'yak-script' },
    })
    fireEvent.click(await screen.findByRole('button', { name: 'ConfigNetworkPage.loadQClawMock' }))
    const editor = await screen.findByLabelText('yak-model-script')
    expect((editor as HTMLTextAreaElement).value).toContain('provider.ReadSSE')
    fireEvent.click(screen.getByRole('button', { name: 'AIModelList.confirmAddBtn' }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce())
    const saved = mocks.save.mock.calls[0][0].IntelligentModels[0]
    expect(saved).toMatchObject({
      ModelName: 'qclaw-mock',
      Provider: {
        Type: 'yak-script',
        APIType: '',
        BaseURL: 'http://127.0.0.1:18080',
        APIKey: 'qclaw-local-test',
        ExtraParams: expect.arrayContaining([
          { Key: 'script', Value: expect.stringContaining('provider.ReadSSE') },
          { Key: 'script_params', Value: '{"cust_id":"memfit-local"}' },
          { Key: 'script_timeout_seconds', Value: '240' },
        ]),
      },
    })
    expect(mocks.invoke).not.toHaveBeenCalled()
  })

  it('round-trips script fields and unknown extras with an optional empty API key', async () => {
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
    expect(saved).toMatchObject({ ...provider, ExtraParams: expect.arrayContaining(provider.ExtraParams) })
    const health = buildAIConfigHealthCheckConfig(values)
    expect(health.ExtraParams).toHaveLength(provider.ExtraParams.length + 1)
    expect(health.ExtraParams).toEqual(
      expect.arrayContaining([...provider.ExtraParams, { Key: 'model', Value: 'my-script' }]),
    )
    expect(buildAIConfigHealthCheckFormValues(saved)).toMatchObject({
      script,
      script_params: '{"cust_id":"tenant-a"}',
      script_timeout_seconds: 300,
    })
    expect(mocks.invoke).not.toHaveBeenCalled()
  })

  it('validates JSON objects, nonempty scripts and timeout before saving', async () => {
    const ref = createRef<{ form: FormInstance }>()
    render(
      <NewAIThirdPartyApplicationConfigBase
        ref={ref}
        formValues={{ Type: 'yak-script', model_type: AIModelTypeEnum.TierIntelligent }}
      />,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'ConfigNetworkPage.loadQClawMock' }))
    await screen.findByLabelText('yak-model-script')
    const form = ref.current!.form
    for (const invalid of ['[]', 'null', '{broken']) {
      await act(async () => {
        form.setFieldsValue({ script_params: invalid })
        await expect(form.validateFields()).rejects.toMatchObject({ errorFields: [{ name: ['script_params'] }] })
      })
    }
    await act(async () => {
      form.setFieldsValue({ script_params: '{}', script: '   ', script_timeout_seconds: 0 })
      await expect(form.validateFields()).rejects.toMatchObject({
        errorFields: expect.arrayContaining([
          expect.objectContaining({ name: ['script'] }),
          expect.objectContaining({ name: ['script_timeout_seconds'] }),
        ]),
      })
    })
  })

  it.each([false, true])('tests and saves the edited effective script (move tier=%s)', async (moveTier) => {
    const oldScript = 'chat = func(req, emit) { return "model override" }'
    const edited = 'chat = func(req, emit) { emit("edited"); return nil }'
    const item = {
      ModelName: 'my-script',
      Provider: provider,
      ExtraParams: [
        { Key: 'script', Value: oldScript },
        { Key: 'unrelated', Value: 'keep' },
      ],
    } as AIModelConfig
    mocks.config.IntelligentModels = [item]
    const onClose = vi.fn()
    const { unmount } = render(
      <AIModelForm item={item} aiModelType={AIModelTypeEnum.TierIntelligent} onClose={onClose} />,
    )
    const editor = await screen.findByLabelText('yak-model-script')
    expect(editor).toHaveValue(oldScript)
    fireEvent.change(editor, { target: { value: edited } })
    if (moveTier) {
      fireEvent.mouseDown(screen.getByRole('combobox', { name: 'ConfigNetworkPage.modelType' }))
      fireEvent.click(await screen.findByTitle('ConfigNetworkPage.lightweightModel'))
    }
    fireEvent.click(screen.getByRole('button', { name: 'AIModelList.testAndAddBtn' }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce())
    expect(mocks.healthCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        Config: expect.objectContaining({
          ExtraParams: expect.arrayContaining([{ Key: 'script', Value: edited }]),
        }),
      }),
    )
    const config = mocks.save.mock.calls[0][0]
    const saved = (moveTier ? config.LightweightModels : config.IntelligentModels)[0]
    if (moveTier) expect(config.IntelligentModels).toEqual([])
    expect(saved.ExtraParams).toEqual([{ Key: 'unrelated', Value: 'keep' }])
    expect(saved.Provider.ExtraParams).toEqual(
      expect.arrayContaining([
        { Key: 'script', Value: edited },
        { Key: 'tenant', Value: 'keep' },
      ]),
    )
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
  })

  it('clears script parameters when switching back to an ordinary provider', async () => {
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
