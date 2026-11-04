import type React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { AIModelSelect } from '../AIModelSelect'
import type { AIGlobalConfig, AIModelConfig } from '../../utils'
import { defaultAIGlobalConfig } from '../../../defaultConstant'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import cloneDeep from 'lodash/cloneDeep'

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn<(config: AIGlobalConfig) => Promise<void>>(),
  names: vi.fn<(params: { Config: string }) => Promise<{ ModelName: string[] }>>(),
  latest: vi.fn<() => Promise<AIGlobalConfig>>(),
  notify: vi.fn(),
  configure: vi.fn(),
  probe: vi.fn(),
}))
vi.mock('../../utils', () => ({
  isForcedSetAIModal: mocks.load,
  grpcListAiModel: mocks.names,
  grpcProbeReasoningEffort: mocks.probe,
  getModelName: (name?: string) => name ?? '',
  isMemfitStart: () => false,
  isFreeEnd: () => false,
  sortMemfitNameFirst: (names: string[]) => names,
}))
vi.mock('../../AIModelList', () => ({
  OutlineAtomIconByStatus: () => null,
  AIModelFreeTag: () => null,
  setAIModal: mocks.configure,
}))
vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({
  default: function useMockAIGlobalConfig() {
    return [
      { aiGlobalConfig: useAIGlobalConfigStore((state) => state.aiGlobalConfig) },
      { setAIGlobalConfig: mocks.save, getLastAIGlobalConfig: mocks.latest, onRefresh: vi.fn() },
    ]
  },
}))
vi.mock('@/utils/notification', () => ({ yakitNotify: mocks.notify }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('ahooks', async (importOriginal) => ({
  // ahooks 导出庞大且此处整体 spread，模块类型无法用 import type 描述，显式豁免。
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  ...(await importOriginal<typeof import('ahooks')>()),
  useInViewport: () => [true],
}))
vi.mock('@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect', () => ({
  AIChatSelect: ({
    open,
    setOpen,
    dropdownRender,
    children,
  }: {
    children: React.ReactNode
    open: boolean
    setOpen: (open: boolean) => void
    dropdownRender: (menu: React.ReactNode) => React.ReactNode
  }) => (
    <>
      {children}
      <button onClick={() => setOpen(!open)}>{open ? '关闭选择' : '打开选择'}</button>
      {open && (
        <div role="region" aria-label="模型列表">
          {dropdownRender(null)}
        </div>
      )}
    </>
  ),
}))
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', () => ({
  YakitSelect: { Option: ({ label }: { label: React.ReactNode }) => <div data-testid="selected-model">{label}</div> },
}))

const createModel = (ModelName: string, Type: string, builtin = false): AIModelConfig => ({
  ModelName,
  ProviderId: Type,
  ExtraParams: builtin ? [{ Key: 'isBuildin', Value: 'true' }] : [],
  Provider: { Type, APIKey: 'test-key', Domain: 'models.test', Proxy: 'http://proxy.test', NoHttps: true },
  EffortProbed: true,
})
let config: AIGlobalConfig
let latestConfig: AIGlobalConfig

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('YAKIT_EDITION', 'yakit')
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  )
  config = {
    ...defaultAIGlobalConfig,
    IntelligentModels: [createModel('configured-a', 'current-provider'), createModel('configured-b', 'other-provider')],
  }
  latestConfig = {
    ...config,
    IntelligentModels: [...config.IntelligentModels, createModel('builtin-default', 'builtin-provider', true)],
  }
  useAIGlobalConfigStore.getState().setAIGlobalConfig(config)
  mocks.save.mockReset().mockImplementation((config) => {
    useAIGlobalConfigStore.getState().setAIGlobalConfig(config)
    return Promise.resolve()
  })
  mocks.latest.mockReset().mockImplementation(() => Promise.resolve(latestConfig))
  mocks.probe.mockReset().mockRejectedValue(new Error('probe unavailable'))
  mocks.names.mockReset().mockImplementation(({ Config }) =>
    Promise.resolve({
      ModelName:
        JSON.parse(Config).Type === 'builtin-provider'
          ? ['builtin-default', 'builtin-alternative']
          : ['remote-model-1', 'remote-model-2'],
    }),
  )
  mocks.load.mockImplementation(({ haveDataCall }) => {
    haveDataCall?.({
      onlineModelsTotal: config.IntelligentModels.length,
      localModelsTotal: 0,
      localModels: [],
      onlineModels: config,
    })
    return Promise.resolve()
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

const openModels = async () => {
  render(<AIModelSelect />)
  const trigger = await screen.findByRole('button', { name: '打开选择' })
  await act(async () => fireEvent.click(trigger))
  return screen.getByRole('region', { name: '模型列表' })
}
const closeModels = () => fireEvent.click(screen.getByRole('button', { name: '关闭选择' }))
const resetModel = () => fireEvent.click(screen.getByRole('button', { name: 'AIModelSelect.resetModel' }))
const expectModelRequest = (Type: string) =>
  expect(mocks.names).toHaveBeenLastCalledWith({
    Config: JSON.stringify({
      Type,
      api_key: 'test-key',
      api_type: '',
      domain: 'models.test',
      no_https: true,
      proxy: 'http://proxy.test',
      base_url: '',
      endpoint: '',
      enable_endpoint: false,
      Headers: [],
    }),
  })

describe('AIModelSelect', () => {
  it.each([
    [undefined, 'effortDefault'],
    ['off', 'effortOff'],
    ['low', 'effortLow'],
    ['medium', 'effortMedium'],
    ['high', 'effortHigh'],
    ['xhigh', 'effortXhigh'],
    ['max', 'effortMax'],
  ])('在已选模型名称后展示思考强度 %s', async (effort, label) => {
    config.IntelligentModels[0].Provider.ReasoningEffort = effort
    useAIGlobalConfigStore.getState().setAIGlobalConfig(config)
    render(<AIModelSelect />)
    const selected = await screen.findByTestId('selected-model')
    const modelName = within(selected).getByText('configured-a')
    expect(modelName.nextElementSibling).toHaveTextContent(`ConfigNetworkPage.${label}`)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it.each(['memfit', 'yakitEE'])('%s 的脚本模型使用已配置名称，不触发模型发现', async (edition) => {
    vi.stubEnv('YAKIT_EDITION', edition)
    config = {
      ...config,
      IntelligentModels: [createModel('script-model', 'yak-script')],
    }
    useAIGlobalConfigStore.getState().setAIGlobalConfig(config)
    const dropdown = await openModels()
    expect(within(dropdown).getByText('script-model')).toBeVisible()
    if (edition === 'yakitEE') {
      fireEvent.mouseEnter(within(dropdown).getByRole('button', { name: 'YakitButton.edit' }))
      await waitFor(() => expect(screen.getAllByText('script-model')).toHaveLength(3))
    }
    expect(screen.getByRole('button', { name: 'YakitButton.refresh' })).toBeDisabled()
    expect(mocks.names).not.toHaveBeenCalled()
  })

  it('脚本 Provider 更新后关闭旧编辑浮层，再次打开仍使用配置名称', async () => {
    vi.stubEnv('YAKIT_EDITION', 'yakitEE')
    config = { ...config, IntelligentModels: [createModel('script-model', 'yak-script')] }
    useAIGlobalConfigStore.getState().setAIGlobalConfig(config)
    const dropdown = await openModels()
    const editButton = within(dropdown).getByRole('button', { name: 'YakitButton.edit' })
    fireEvent.mouseEnter(editButton)
    expect(await screen.findByRole('button', { name: 'YakitButton.refresh' })).toBeDisabled()

    const model = config.IntelligentModels[0]
    act(() =>
      useAIGlobalConfigStore.getState().setAIGlobalConfig({
        ...config,
        IntelligentModels: [
          { ...model, Provider: { ...model.Provider, ExtraParams: [{ Key: 'script', Value: 'updated-script' }] } },
        ],
      }),
    )
    expect(screen.queryByRole('button', { name: 'YakitButton.refresh' })).not.toBeInTheDocument()
    fireEvent.mouseEnter(editButton)
    expect(await screen.findByRole('button', { name: 'YakitButton.refresh' })).toBeDisabled()
    expect(screen.getAllByText('script-model')).toHaveLength(3)
    expect(mocks.names).not.toHaveBeenCalled()
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it.each(['yakitEE', 'yakitSE', 'irifyEE'])('%s 使用企业旧版模型列表并保存首选顺序', async (edition) => {
    vi.stubEnv('YAKIT_EDITION', edition)
    const dropdown = await openModels()
    expect(within(dropdown).queryByRole('button', { name: 'AIModelSelect.resetModel' })).not.toBeInTheDocument()
    expect(within(dropdown).getAllByRole('button', { name: 'YakitButton.edit' })).toHaveLength(2)
    expect(mocks.names).not.toHaveBeenCalled()
    fireEvent.click(within(dropdown).getByText('configured-b'))
    closeModels()
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith({
        ...config,
        IntelligentModels: [config.IntelligentModels[1], config.IntelligentModels[0]],
      }),
    )
    expect(mocks.load).toHaveBeenCalledTimes(1)
  })

  it.each(['yakit', 'irify', 'memfit', 'breachtrace'])('%s 保持当前单层名称选择和重置入口', async (edition) => {
    vi.stubEnv('YAKIT_EDITION', edition)
    const dropdown = await openModels()
    expect(within(dropdown).getByRole('button', { name: 'AIModelSelect.resetModel' })).toBeVisible()
    expect(within(dropdown).queryByRole('button', { name: 'YakitButton.edit' })).not.toBeInTheDocument()
    await act(async () => fireEvent.click(within(dropdown).getByRole('option', { name: 'remote-model-2' })))
    closeModels()
    expect(mocks.save).toHaveBeenCalledWith({
      ...config,
      IntelligentModels: [
        { ...config.IntelligentModels[0], ModelName: 'remote-model-2', EffortProbed: undefined },
        config.IntelligentModels[1],
      ],
    })
    expect(mocks.load).toHaveBeenCalledTimes(1)
  })

  it('将非空连接字段透传给模型列表请求，不发送 Provider 扩展参数', async () => {
    const currentModel = config.IntelligentModels[0]
    config = {
      ...config,
      IntelligentModels: [
        {
          ...currentModel,
          ExtraParams: [{ Key: 'isBuildin', Value: 'true' }],
          Provider: {
            ...currentModel.Provider,
            APIType: 'responses',
            BaseURL: 'https://gateway.example.test/custom/v1',
            Endpoint: '/deployment/models',
            EnableEndpoint: true,
            Headers: [{ Key: 'X-Tenant', Value: 'tenant-a' }],
            ExtraParams: [{ Key: 'api_version', Value: '2026-01-01' }],
          },
        },
        config.IntelligentModels[1],
      ],
    }
    useAIGlobalConfigStore.getState().setAIGlobalConfig(config)

    await openModels()

    expect(mocks.names).toHaveBeenCalledTimes(1)
    const requestConfig = JSON.parse(mocks.names.mock.calls[0][0].Config)
    expect(requestConfig).not.toHaveProperty('ExtraParams')
    expect(requestConfig).toEqual({
      Type: 'current-provider',
      api_key: 'test-key',
      api_type: 'responses',
      domain: 'models.test',
      no_https: true,
      proxy: 'http://proxy.test',
      base_url: 'https://gateway.example.test/custom/v1',
      endpoint: '/deployment/models',
      enable_endpoint: true,
      Headers: [{ Key: 'X-Tenant', Value: 'tenant-a' }],
    })
  })

  it('只改变 BaseURL 时重新请求模型列表，不沿用旧地址的结果', async () => {
    config = {
      ...config,
      IntelligentModels: [
        {
          ...config.IntelligentModels[0],
          Provider: { ...config.IntelligentModels[0].Provider, BaseURL: 'https://first.example.test/v1' },
        },
      ],
    }
    useAIGlobalConfigStore.getState().setAIGlobalConfig(config)
    const dropdown = await openModels()
    expect(JSON.parse(mocks.names.mock.calls[0][0].Config).base_url).toBe('https://first.example.test/v1')
    mocks.names.mockResolvedValueOnce({ ModelName: ['second-server-model'] })

    act(() =>
      useAIGlobalConfigStore.getState().setAIGlobalConfig({
        ...config,
        IntelligentModels: [
          {
            ...config.IntelligentModels[0],
            Provider: { ...config.IntelligentModels[0].Provider, BaseURL: 'https://second.example.test/v1' },
          },
        ],
      }),
    )

    expect(await within(dropdown).findByRole('option', { name: 'second-server-model' })).toBeVisible()
    expect(mocks.names).toHaveBeenCalledTimes(2)
    const firstRequest = JSON.parse(mocks.names.mock.calls[0][0].Config)
    expect(JSON.parse(mocks.names.mock.calls[1][0].Config)).toEqual({
      ...firstRequest,
      base_url: 'https://second.example.test/v1',
    })
    expect(within(dropdown).queryByRole('option', { name: 'remote-model-1' })).not.toBeInTheDocument()
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('用当前显示模型的连接配置调用 grpcListAiModel，下拉只展示响应中的名称', async () => {
    render(<AIModelSelect />)
    expect(await screen.findByTestId('selected-model')).toHaveTextContent('configured-a')
    expect(mocks.names).not.toHaveBeenCalled()
    expect(mocks.latest).not.toHaveBeenCalled()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '打开选择' })))
    const dropdown = screen.getByRole('region', { name: '模型列表' })
    expect(
      within(dropdown)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['remote-model-1', 'remote-model-2'])
    expect(within(dropdown).queryByText('configured-a')).not.toBeInTheDocument()
    expect(within(dropdown).queryByText('configured-b')).not.toBeInTheDocument()
    expect(within(dropdown).queryByRole('button', { name: 'YakitButton.edit' })).not.toBeInTheDocument()
    expectModelRequest('current-provider')
    expect(mocks.latest).not.toHaveBeenCalled()
  })

  it('管理模型打开配置页，刷新同时更新模型名称和当前模型的思考档位', async () => {
    const emit = vi.spyOn(emiter, 'emit')
    const currentModel = {
      ...config.IntelligentModels[0],
      Provider: { ...config.IntelligentModels[0].Provider, ReasoningEffort: 'max' },
      ProbedExtendedEfforts: ['max'],
    }
    config = { ...config, IntelligentModels: [currentModel, config.IntelligentModels[1]] }
    useAIGlobalConfigStore.getState().setAIGlobalConfig(config)
    const dropdown = await openModels()
    fireEvent.click(within(dropdown).getByRole('button', { name: 'AIModelSelect.manageModels' }))
    expect(emit).toHaveBeenCalledWith(
      'openPage',
      JSON.stringify({ route: YakitRoute.Settings, params: { anchor: 'ai-model' } }),
    )
    mocks.names.mockResolvedValueOnce({ ModelName: ['refreshed-model'] })
    mocks.probe.mockResolvedValueOnce({
      XhighSupported: true,
      MaxSupported: false,
      MaxErrorMessage: JSON.stringify({ error: { message: '最高档位需要升级客户端' } }),
    })
    fireEvent.click(within(dropdown).getByRole('button', { name: 'YakitButton.refresh' }))
    expect(await within(dropdown).findByRole('option', { name: 'refreshed-model' })).toBeVisible()
    expect(within(dropdown).getAllByRole('option')).toHaveLength(1)
    expect(mocks.names).toHaveBeenCalledTimes(2)
    expect(mocks.load).toHaveBeenCalledTimes(1)
    expect(mocks.latest).not.toHaveBeenCalled()
    expectModelRequest('current-provider')
    expect(mocks.probe).toHaveBeenCalledExactlyOnceWith({
      Config: config.IntelligentModels[0].Provider,
      Model: 'configured-a',
    })
    const effortTrigger = within(dropdown).getByRole('button', { name: 'AIReasoningEffort.selectQuality' })
    expect(effortTrigger).toHaveTextContent('ConfigNetworkPage.effortMax')
    fireEvent.mouseEnter(within(effortTrigger).getByText('Error'))
    expect(await screen.findByText('最高档位需要升级客户端')).toBeInTheDocument()
    fireEvent.click(effortTrigger)
    expect(await screen.findByRole('menuitemradio', { name: 'ConfigNetworkPage.effortXhigh' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitemradio', { name: 'ConfigNetworkPage.effortMax' })).not.toBeInTheDocument()
  })

  it('重新打开有 Error 的模型时探测一次，恢复后再次打开不探测', async () => {
    mocks.probe
      .mockResolvedValueOnce({ MaxSupported: false, XhighSupported: true, MaxErrorMessage: 'probe failed' })
      .mockResolvedValueOnce({ MaxSupported: true, XhighSupported: true })
    const dropdown = await openModels()
    fireEvent.click(within(dropdown).getByRole('button', { name: 'YakitButton.refresh' }))
    expect(await within(dropdown).findByText('Error')).toBeVisible()
    expect(mocks.probe).toHaveBeenCalledTimes(1)
    closeModels()

    await act(async () => fireEvent.click(screen.getByRole('button', { name: '打开选择' })))
    expect(mocks.probe).toHaveBeenCalledTimes(2)
    expect(mocks.probe).toHaveBeenLastCalledWith({
      Config: config.IntelligentModels[0].Provider,
      Model: 'configured-a',
    })
    expect(screen.queryByText('Error')).not.toBeInTheDocument()
    closeModels()

    await act(async () => fireEvent.click(screen.getByRole('button', { name: '打开选择' })))
    expect(mocks.probe).toHaveBeenCalledTimes(2)
  })

  it('悬停 Error 标签按档位显示两个错误，切换模型后不沿用上一模型的错误', async () => {
    mocks.probe.mockResolvedValueOnce({
      MaxSupported: false,
      XhighSupported: false,
      MaxErrorMessage: JSON.stringify({ error: { message: '最高档位的错误' } }),
      XhighErrorMessage: JSON.stringify({ error: { message: '极高档位的错误' } }),
    })
    const dropdown = await openModels()
    fireEvent.click(within(dropdown).getByRole('button', { name: 'YakitButton.refresh' }))
    fireEvent.mouseEnter(await within(dropdown).findByText('Error'))
    const maxError = await screen.findByText('最高档位的错误')
    const xhighError = screen.getByText('极高档位的错误')
    expect(maxError.parentElement).toHaveTextContent('ConfigNetworkPage.effortMax')
    expect(xhighError.parentElement).toHaveTextContent('ConfigNetworkPage.effortXhigh')

    await act(async () => fireEvent.click(within(dropdown).getByRole('option', { name: 'remote-model-2' })))
    expect(within(dropdown).queryByText('Error')).not.toBeInTheDocument()
    expect(dropdown).toBeVisible()
  })

  it('选择接口返回的名称时保留连接配置和其他条目，清除旧模型的探测状态', async () => {
    const dropdown = await openModels()
    fireEvent.click(within(dropdown).getByRole('option', { name: 'remote-model-2' }))
    expect(screen.getByTestId('selected-model')).toHaveTextContent('remote-model-2')
    expect(within(dropdown).getByRole('option', { name: 'remote-model-2' })).toHaveAttribute('aria-selected', 'true')
    expect(mocks.save).not.toHaveBeenCalled()
    expect(useAIGlobalConfigStore.getState().aiGlobalConfig).toEqual(config)
    closeModels()
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith({
        ...config,
        IntelligentModels: [
          { ...config.IntelligentModels[0], ModelName: 'remote-model-2', EffortProbed: undefined },
          config.IntelligentModels[1],
        ],
      }),
    )
    expect(mocks.names).toHaveBeenCalledTimes(1)
    expect(mocks.latest).not.toHaveBeenCalled()
  })

  it.each([false, true])('初始化响应迟到时保留用户选择及保存结果（已关闭保存：%s）', async (saved) => {
    const initialConfig = cloneDeep(config)
    let completeLoad!: () => void
    mocks.load.mockImplementationOnce(
      ({ haveDataCall }) =>
        new Promise((resolve) => {
          completeLoad = () => {
            haveDataCall?.({
              onlineModelsTotal: initialConfig.IntelligentModels.length,
              localModelsTotal: 0,
              localModels: [],
              onlineModels: initialConfig,
            })
            resolve(null)
          }
        }),
    )
    const dropdown = await openModels()
    expect(mocks.load).toHaveBeenCalledTimes(1)
    fireEvent.click(within(dropdown).getByRole('option', { name: 'remote-model-2' }))
    if (saved) closeModels()

    await act(async () => completeLoad())

    expect(screen.getByTestId('selected-model')).toHaveTextContent('remote-model-2')
    if (!saved) closeModels()
    const expectedConfig = {
      ...initialConfig,
      IntelligentModels: [
        { ...initialConfig.IntelligentModels[0], ModelName: 'remote-model-2', EffortProbed: undefined },
        initialConfig.IntelligentModels[1],
      ],
    }
    expect(mocks.save).toHaveBeenCalledTimes(1)
    expect(mocks.save).toHaveBeenCalledWith(expectedConfig)
    expect(useAIGlobalConfigStore.getState().aiGlobalConfig).toEqual(expectedConfig)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '打开选择' })))
    expect(screen.getByRole('option', { name: 'remote-model-2' })).toHaveAttribute('aria-selected', 'true')
    closeModels()
    expect(mocks.save).toHaveBeenCalledTimes(1)
  })

  it('点击重置时才获取内置高质模型，并使用最新配置而非本地缓存加载列表', async () => {
    config.IntelligentModels.push(createModel('cached-default', 'cached-provider', true))
    const dropdown = await openModels()
    expect(mocks.latest).not.toHaveBeenCalled()
    resetModel()
    expect(await within(dropdown).findByRole('option', { name: 'builtin-default' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByTestId('selected-model')).toHaveTextContent('builtin-default')
    expect(
      within(dropdown)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['builtin-default', 'builtin-alternative'])
    expect(mocks.latest).toHaveBeenCalledTimes(1)
    expectModelRequest('builtin-provider')
    expect(mocks.save).not.toHaveBeenCalled()
    expect(useAIGlobalConfigStore.getState().aiGlobalConfig).toEqual(config)
    closeModels()
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith({
        ...latestConfig,
        IntelligentModels: [latestConfig.IntelligentModels[2], ...latestConfig.IntelligentModels.slice(0, 2)],
      }),
    )
  })

  it.each(['reset', 'store'] as const)('初始化响应迟到时不覆盖后续配置更新（来源：%s）', async (source) => {
    const initialConfig = cloneDeep(config)
    let completeLoad!: () => void
    mocks.load.mockImplementationOnce(
      ({ haveDataCall }) =>
        new Promise((resolve) => {
          completeLoad = () => {
            haveDataCall?.({
              onlineModelsTotal: initialConfig.IntelligentModels.length,
              localModelsTotal: 0,
              localModels: [],
              onlineModels: initialConfig,
            })
            resolve(null)
          }
        }),
    )
    const dropdown = await openModels()
    const expectedConfig = {
      ...latestConfig,
      IntelligentModels: [latestConfig.IntelligentModels[2], ...latestConfig.IntelligentModels.slice(0, 2)],
    }
    if (source === 'reset') resetModel()
    else act(() => useAIGlobalConfigStore.getState().setAIGlobalConfig(expectedConfig))
    expect(await within(dropdown).findByRole('option', { name: 'builtin-default' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await act(async () => completeLoad())

    expect(screen.getByTestId('selected-model')).toHaveTextContent('builtin-default')
    expectModelRequest('builtin-provider')
    closeModels()
    expect(mocks.save).toHaveBeenCalledTimes(source === 'reset' ? 1 : 0)
    expect(useAIGlobalConfigStore.getState().aiGlobalConfig).toEqual(expectedConfig)
  })

  it('最新配置的内置模型已在首位时，关闭重置仍同步到全局配置且不重复保存', async () => {
    latestConfig = {
      ...config,
      IntelligentModels: [createModel('builtin-default', 'builtin-provider', true), ...config.IntelligentModels],
    }
    const dropdown = await openModels()
    resetModel()
    expect(await within(dropdown).findByRole('option', { name: 'builtin-default' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(mocks.save).not.toHaveBeenCalled()
    expect(useAIGlobalConfigStore.getState().aiGlobalConfig).toEqual(config)

    closeModels()

    expect(mocks.save).toHaveBeenCalledWith(latestConfig)
    expect(useAIGlobalConfigStore.getState().aiGlobalConfig).toEqual(latestConfig)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '打开选择' })))
    expect(screen.getByRole('option', { name: 'builtin-default' })).toHaveAttribute('aria-selected', 'true')
    closeModels()
    expect(mocks.save).toHaveBeenCalledTimes(1)
  })

  it('重置首次立即执行，500ms 内重复点击忽略且不补发，之后可重新获取', async () => {
    const dropdown = await openModels()
    vi.useFakeTimers()
    const resetButton = within(dropdown).getByRole('button', { name: 'AIModelSelect.resetModel' })
    expect(resetButton).toBeEnabled()
    await act(async () => resetModel())
    expect(within(dropdown).getByRole('option', { name: 'builtin-default' })).toBeVisible()
    await act(async () => resetModel())
    expect(mocks.latest).toHaveBeenCalledTimes(1)
    await act(async () => vi.advanceTimersByTimeAsync(499))
    expect(mocks.latest).toHaveBeenCalledTimes(1)
    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(mocks.latest).toHaveBeenCalledTimes(1)
    mocks.names.mockResolvedValueOnce({ ModelName: ['new-default', 'new-alternative'] })
    latestConfig = { ...latestConfig, IntelligentModels: [createModel('new-default', 'new-builtin-provider', true)] }
    await act(async () => resetModel())
    expect(within(dropdown).getByRole('option', { name: 'new-default' })).toHaveAttribute('aria-selected', 'true')
    expect(mocks.latest).toHaveBeenCalledTimes(2)
    expect(mocks.names).toHaveBeenCalledTimes(3)
    expectModelRequest('new-builtin-provider')
  })

  it.each([false, true])('重置未完成时关闭，保留已完成的选择且忽略迟到响应（已有修改：%s）', async (hasDraft) => {
    let resolveConfig!: (value: AIGlobalConfig) => void
    mocks.latest.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveConfig = resolve
        }),
    )
    const dropdown = await openModels()
    if (hasDraft) fireEvent.click(within(dropdown).getByRole('option', { name: 'remote-model-2' }))
    const expectedName = hasDraft ? 'remote-model-2' : 'configured-a'
    resetModel()
    expect(mocks.latest).toHaveBeenCalledTimes(1)
    closeModels()
    expect(mocks.save).toHaveBeenCalledTimes(hasDraft ? 1 : 0)
    expect(useAIGlobalConfigStore.getState().aiGlobalConfig.IntelligentModels[0].ModelName).toBe(expectedName)

    await act(async () => resolveConfig(latestConfig))
    expect(screen.getByTestId('selected-model')).toHaveTextContent(expectedName)
    expect(mocks.names).toHaveBeenCalledTimes(1)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '打开选择' })))
    expectModelRequest('current-provider')
    expect(screen.getByRole('button', { name: 'AIModelSelect.resetModel' })).toBeEnabled()
    closeModels()
    expect(mocks.save).toHaveBeenCalledTimes(hasDraft ? 1 : 0)
  })

  it.each([false, true])('切换连接并重新打开后，旧响应不影响新列表及 loading（旧请求先完成：%s）', async (oldFirst) => {
    let resolveOldNames!: (value: { ModelName: string[] }) => void
    let resolveNewNames!: (value: { ModelName: string[] }) => void
    mocks.names
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOldNames = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveNewNames = resolve
          }),
      )
    await openModels()
    closeModels()
    config = { ...config, IntelligentModels: [latestConfig.IntelligentModels[2]] }
    act(() => useAIGlobalConfigStore.getState().setAIGlobalConfig(config))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '打开选择' })))
    const dropdown = screen.getByRole('region', { name: '模型列表' })
    expect(mocks.names).toHaveBeenCalledTimes(2)
    expectModelRequest('builtin-provider')
    if (oldFirst) {
      await act(async () => resolveOldNames({ ModelName: ['old-model'] }))
      expect(within(dropdown).queryAllByRole('option')).toHaveLength(0)
      expect(within(dropdown).getByRole('button', { name: 'AIModelSelect.resetModel' })).toBeDisabled()
      expect(within(dropdown).getByRole('button', { name: 'YakitButton.refresh' })).toBeDisabled()
    }
    await act(async () => resolveNewNames({ ModelName: ['builtin-default', 'builtin-alternative'] }))
    if (!oldFirst) await act(async () => resolveOldNames({ ModelName: ['old-model'] }))
    expect(
      within(dropdown)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['builtin-default', 'builtin-alternative'])
    expect(within(dropdown).getByRole('button', { name: 'YakitButton.refresh' })).toBeEnabled()
    expect(mocks.save).not.toHaveBeenCalled()
    await act(async () => fireEvent.click(within(dropdown).getByRole('option', { name: 'builtin-alternative' })))
    closeModels()
    expect(mocks.save).toHaveBeenCalledWith({
      ...config,
      IntelligentModels: [
        { ...config.IntelligentModels[0], ModelName: 'builtin-alternative', EffortProbed: undefined },
      ],
    })
  })

  it('刷新首次立即执行，500ms 内重复点击忽略且不补发', async () => {
    const dropdown = await openModels()
    vi.useFakeTimers()
    const refreshButton = within(dropdown).getByRole('button', { name: 'YakitButton.refresh' })
    await act(async () => fireEvent.click(refreshButton))
    expect(mocks.names).toHaveBeenCalledTimes(2)
    await act(async () => fireEvent.click(refreshButton))
    await act(async () => vi.advanceTimersByTimeAsync(499))
    expect(mocks.names).toHaveBeenCalledTimes(2)
    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(mocks.names).toHaveBeenCalledTimes(2)
    await act(async () => fireEvent.click(refreshButton))
    expect(mocks.names).toHaveBeenCalledTimes(3)
    expect(mocks.probe).toHaveBeenCalledTimes(2)
    expect(mocks.latest).not.toHaveBeenCalled()
  })

  it('同名模型重新打开不重复探测，切换名称后只探测一次', async () => {
    const first = { ...config.IntelligentModels[0], ModelName: 'remote-model-1', EffortProbed: undefined }
    const second = { ...first, ModelName: 'remote-model-2', EffortProbed: true }
    config = { ...config, IntelligentModels: [first, second] }
    useAIGlobalConfigStore.getState().setAIGlobalConfig(config)

    const dropdown = await openModels()
    const effort = within(dropdown).getByRole('button', { name: 'AIReasoningEffort.selectQuality' })
    fireEvent.click(effort)
    fireEvent.click(effort)
    expect(mocks.probe).toHaveBeenCalledExactlyOnceWith({ Config: first.Provider, Model: first.ModelName })
    closeModels()

    await act(async () => fireEvent.click(screen.getByRole('button', { name: '打开选择' })))
    fireEvent.click(screen.getByRole('button', { name: 'AIReasoningEffort.selectQuality' }))
    fireEvent.click(screen.getByRole('option', { name: first.ModelName }))
    expect(mocks.probe).toHaveBeenCalledTimes(1)
    await act(async () => fireEvent.click(screen.getByRole('option', { name: second.ModelName })))
    expect(mocks.probe).toHaveBeenNthCalledWith(2, { Config: second.Provider, Model: second.ModelName })
    expect(mocks.probe).toHaveBeenCalledTimes(2)
  })

  it('同一连接重置也重新读取配置并获取模型列表', async () => {
    latestConfig = { ...config, IntelligentModels: [createModel('remote-model-1', 'current-provider', true)] }
    const dropdown = await openModels()
    resetModel()
    await waitFor(() => expect(mocks.names).toHaveBeenCalledTimes(2))
    expect(await within(dropdown).findByRole('option', { name: 'remote-model-1' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(mocks.latest).toHaveBeenCalledTimes(1)
    expectModelRequest('current-provider')
  })

  it('最新配置没有内置高质模型时保留当前选择，不使用内置轻量模型', async () => {
    latestConfig = { ...config, LightweightModels: [createModel('lightweight', 'builtin-provider', true)] }
    const dropdown = await openModels()
    resetModel()
    await waitFor(() => expect(mocks.notify).toHaveBeenCalledWith('warning', 'AIModelSelect.noBuiltinModel'))
    expect(screen.getByTestId('selected-model')).toHaveTextContent('configured-a')
    expect(within(dropdown).getByRole('option', { name: 'remote-model-1' })).toBeVisible()
    expect(mocks.names).toHaveBeenCalledTimes(1)
    closeModels()
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('获取内置配置失败时保留当前模型与列表', async () => {
    mocks.latest.mockRejectedValueOnce(new Error('config unavailable'))
    const dropdown = await openModels()
    await act(async () => resetModel())
    expect(screen.getByTestId('selected-model')).toHaveTextContent('configured-a')
    expect(within(dropdown).getByRole('option', { name: 'remote-model-1' })).toBeVisible()
    expect(mocks.names).toHaveBeenCalledTimes(1)
  })

  it('列表加载超过 500ms 时仍禁用刷新、重置和思考质量，完成后恢复', async () => {
    let resolveNames!: (value: { ModelName: string[] }) => void
    mocks.names.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveNames = resolve
        }),
    )
    const dropdown = await openModels()
    vi.useFakeTimers()
    const refreshButton = within(dropdown).getByRole('button', { name: 'YakitButton.refresh' })
    const resetButton = within(dropdown).getByRole('button', { name: 'AIModelSelect.resetModel' })
    const effortTrigger = within(dropdown).getByRole('button', { name: 'AIReasoningEffort.selectQuality' })
    expect(refreshButton).toBeDisabled()
    expect(resetButton).toBeDisabled()
    expect(effortTrigger).toHaveAttribute('aria-disabled', 'true')
    await act(async () => vi.advanceTimersByTimeAsync(1000))
    fireEvent.click(refreshButton)
    fireEvent.click(resetButton)
    fireEvent.click(effortTrigger)
    expect(effortTrigger).toHaveAttribute('aria-expanded', 'false')
    expect(mocks.names).toHaveBeenCalledTimes(1)
    expect(mocks.latest).not.toHaveBeenCalled()
    await act(async () => resolveNames({ ModelName: ['remote-model-1'] }))
    expect(refreshButton).toBeEnabled()
    expect(resetButton).toBeEnabled()
    expect(effortTrigger).toHaveAttribute('aria-disabled', 'false')
    fireEvent.click(effortTrigger)
    expect(effortTrigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('重置获取配置和模型列表期间持续禁用两个按钮，完成后恢复', async () => {
    let resolveConfig!: (value: AIGlobalConfig) => void
    let resolveNames!: (value: { ModelName: string[] }) => void
    mocks.latest.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveConfig = resolve
        }),
    )
    const dropdown = await openModels()
    vi.useFakeTimers()
    mocks.names.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveNames = resolve
        }),
    )
    const refreshButton = within(dropdown).getByRole('button', { name: 'YakitButton.refresh' })
    const resetButton = within(dropdown).getByRole('button', { name: 'AIModelSelect.resetModel' })
    resetModel()
    expect(refreshButton).toBeDisabled()
    expect(resetButton).toBeDisabled()
    await act(async () => vi.advanceTimersByTimeAsync(1000))
    fireEvent.click(refreshButton)
    fireEvent.click(resetButton)
    expect(mocks.latest).toHaveBeenCalledTimes(1)
    expect(mocks.names).toHaveBeenCalledTimes(1)
    await act(async () => resolveConfig(latestConfig))
    expect(mocks.names).toHaveBeenCalledTimes(2)
    expect(refreshButton).toBeDisabled()
    expect(resetButton).toBeDisabled()
    await act(async () => resolveNames({ ModelName: ['builtin-default'] }))
    expect(refreshButton).toBeEnabled()
    expect(resetButton).toBeEnabled()
    expect(within(dropdown).getByRole('option', { name: 'builtin-default' })).toHaveAttribute('aria-selected', 'true')
  })

  it('列表接口失败显示空态，可通过刷新重试', async () => {
    mocks.names.mockRejectedValueOnce(new Error('failed'))
    const dropdown = await openModels()
    expect(within(dropdown).getByText('AIModelSelect.emptyModels')).toBeVisible()
    fireEvent.click(within(dropdown).getAllByRole('button', { name: 'YakitButton.refresh' })[0])
    expect(await within(dropdown).findByRole('option', { name: 'remote-model-1' })).toBeVisible()
    expect(mocks.names).toHaveBeenCalledTimes(2)
    expect(mocks.latest).not.toHaveBeenCalled()
  })

  it('全局配置变化时无需切换视口即可同步选中模型及列表', async () => {
    const dropdown = await openModels()
    config = { ...config, IntelligentModels: [latestConfig.IntelligentModels[2]] }
    act(() => useAIGlobalConfigStore.getState().setAIGlobalConfig(config))
    expect(await within(dropdown).findByRole('option', { name: 'builtin-default' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expectModelRequest('builtin-provider')
    expect(mocks.latest).not.toHaveBeenCalled()
    expect(mocks.load).toHaveBeenCalledTimes(1)
    closeModels()
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('模型名称和思考档位在同一次关闭时保存，子菜单选择不丢失模型草稿', async () => {
    const dropdown = await openModels()
    fireEvent.click(within(dropdown).getByRole('option', { name: 'remote-model-2' }))
    fireEvent.click(within(dropdown).getByRole('button', { name: 'AIReasoningEffort.selectQuality' }))
    fireEvent.click(await screen.findByRole('menuitemradio', { name: 'ConfigNetworkPage.effortHigh' }))
    expect(screen.getByTestId('selected-model')).toHaveTextContent('remote-model-2')
    expect(dropdown).toBeVisible()
    expect(within(screen.getByTestId('selected-model')).getByText('ConfigNetworkPage.effortHigh')).toBeVisible()
    expect(within(dropdown).getByRole('button', { name: 'AIReasoningEffort.selectQuality' })).toHaveTextContent(
      'ConfigNetworkPage.effortHigh',
    )
    expect(mocks.save).not.toHaveBeenCalled()
    expect(useAIGlobalConfigStore.getState().aiGlobalConfig).toEqual(config)

    closeModels()
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
    expect(mocks.save).toHaveBeenCalledWith({
      ...config,
      IntelligentModels: [
        {
          ...config.IntelligentModels[0],
          ModelName: 'remote-model-2',
          EffortProbed: undefined,
          Provider: { ...config.IntelligentModels[0].Provider, ReasoningEffort: 'high' },
        },
        config.IntelligentModels[1],
      ],
    })
  })

  it('按名称读取思考档位和探测结果，切换到未配置的模型时回到默认', async () => {
    const source = {
      ...config.IntelligentModels[0],
      ModelName: 'remote-model-1',
      Provider: { ...config.IntelligentModels[0].Provider, ReasoningEffort: 'high' },
    }
    const target = {
      ...source,
      ModelName: 'remote-model-2',
      Provider: { ...source.Provider, ReasoningEffort: 'xhigh' },
      ProbedExtendedEfforts: ['xhigh'],
    }
    config = { ...config, IntelligentModels: [source, target, config.IntelligentModels[1]] }
    useAIGlobalConfigStore.getState().setAIGlobalConfig(config)
    mocks.names.mockResolvedValueOnce({ ModelName: ['remote-model-1', 'remote-model-2', 'new-model'] })
    const dropdown = await openModels()
    await act(async () => fireEvent.click(within(dropdown).getByRole('option', { name: 'remote-model-2' })))
    expect(screen.getByTestId('selected-model')).toHaveTextContent('ConfigNetworkPage.effortXhigh')
    const getEffortTrigger = () => within(dropdown).getByRole('button', { name: 'AIReasoningEffort.selectQuality' })
    fireEvent.click(getEffortTrigger())
    expect(await screen.findByRole('menuitemradio', { name: 'ConfigNetworkPage.effortXhigh' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await act(async () => fireEvent.click(within(dropdown).getByRole('option', { name: 'new-model' })))
    expect(screen.getByTestId('selected-model')).toHaveTextContent('ConfigNetworkPage.effortDefault')
    expect(getEffortTrigger()).toHaveAttribute('aria-expanded', 'false')
    expect(getEffortTrigger()).toHaveTextContent('ConfigNetworkPage.effortDefault')
    await waitFor(() => expect(mocks.probe).toHaveBeenCalledWith(expect.objectContaining({ Model: 'new-model' })))
    fireEvent.click(getEffortTrigger())
    expect(await screen.findByRole('menuitemradio', { name: 'ConfigNetworkPage.effortDefault' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.queryByRole('menuitemradio', { name: 'ConfigNetworkPage.effortXhigh' })).not.toBeInTheDocument()

    await act(async () => fireEvent.click(within(dropdown).getByRole('option', { name: 'remote-model-1' })))
    expect(screen.getByTestId('selected-model')).toHaveTextContent('ConfigNetworkPage.effortHigh')
    closeModels()
    expect(mocks.save).not.toHaveBeenCalled()
    expect(mocks.names).toHaveBeenCalledTimes(1)
    expect(mocks.load).toHaveBeenCalledTimes(1)
  })

  it('全局配置内容未变时，不覆盖下拉中尚未保存的模型选择', async () => {
    const dropdown = await openModels()
    fireEvent.click(within(dropdown).getByRole('option', { name: 'remote-model-2' }))
    act(() => useAIGlobalConfigStore.getState().setAIGlobalConfig(cloneDeep(config)))
    expect(screen.getByTestId('selected-model')).toHaveTextContent('remote-model-2')
    closeModels()
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
  })

  it('首次新增及删除全部模型时，根据全局配置更新选择器显示状态', async () => {
    config = cloneDeep(defaultAIGlobalConfig)
    useAIGlobalConfigStore.getState().setAIGlobalConfig(config)
    render(<AIModelSelect />)
    expect(screen.queryByRole('button', { name: '打开选择' })).not.toBeInTheDocument()
    act(() => useAIGlobalConfigStore.getState().setAIGlobalConfig(latestConfig))
    expect(await screen.findByRole('button', { name: '打开选择' })).toBeVisible()
    expect(screen.getByTestId('selected-model')).toHaveTextContent('configured-a')
    act(() => useAIGlobalConfigStore.getState().setAIGlobalConfig(config))
    expect(screen.queryByRole('button', { name: '打开选择' })).not.toBeInTheDocument()
    expect(mocks.load).toHaveBeenCalledTimes(1)
  })

  it.each([500, 700])('宽度变为 %s 时关闭并保存，高度变化不关闭', async (width) => {
    let resizeInput: (width: number, height: number) => void = () => {}
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private callback: ResizeObserverCallback) {}
        observe(target: Element) {
          resizeInput = (width, height) =>
            this.callback(
              [{ target, contentRect: { width, height } } as ResizeObserverEntry],
              this as unknown as ResizeObserver,
            )
        }
        disconnect() {}
        unobserve() {}
      },
    )
    const dropdown = await openModels()
    act(() => resizeInput(600, 120))
    await act(async () => fireEvent.click(within(dropdown).getByRole('option', { name: 'remote-model-2' })))
    act(() => resizeInput(640, 120))
    act(() => resizeInput(640, 240))
    expect(dropdown).toBeVisible()
    act(() => resizeInput(width, 240))
    expect(screen.queryByRole('region', { name: '模型列表' })).not.toBeInTheDocument()
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        IntelligentModels: [expect.objectContaining({ ModelName: 'remote-model-2' }), config.IntelligentModels[1]],
      }),
    )
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '打开选择' })))
    expect(screen.getByRole('option', { name: 'remote-model-2' })).toHaveAttribute('aria-selected', 'true')
    closeModels()
    expect(mocks.save).toHaveBeenCalledTimes(1)
  })
})
