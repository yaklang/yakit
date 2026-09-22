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
}))
vi.mock('../../utils', () => ({
  isForcedSetAIModal: mocks.load,
  grpcListAiModel: mocks.names,
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
      { setAIGlobalConfig: mocks.save, getLastAIGlobalConfig: mocks.latest },
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
})
let config: AIGlobalConfig
let latestConfig: AIGlobalConfig

beforeEach(() => {
  vi.clearAllMocks()
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

  it('管理模型仍打开配置页，刷新只更新 grpcListAiModel 返回的列表', async () => {
    const emit = vi.spyOn(emiter, 'emit')
    const dropdown = await openModels()
    fireEvent.click(within(dropdown).getByRole('button', { name: 'AIModelSelect.manageModels' }))
    expect(emit).toHaveBeenCalledWith(
      'openPage',
      JSON.stringify({ route: YakitRoute.Settings, params: { anchor: 'ai-model' } }),
    )
    mocks.names.mockResolvedValueOnce({ ModelName: ['refreshed-model'] })
    fireEvent.click(within(dropdown).getByRole('button', { name: 'YakitButton.refresh' }))
    expect(await within(dropdown).findByRole('option', { name: 'refreshed-model' })).toBeVisible()
    expect(within(dropdown).getAllByRole('option')).toHaveLength(1)
    expect(mocks.names).toHaveBeenCalledTimes(2)
    expect(mocks.load).toHaveBeenCalledTimes(1)
    expect(mocks.latest).not.toHaveBeenCalled()
    expectModelRequest('current-provider')
  })

  it('选择接口返回的名称只更新当前模型名称，保留原有连接配置和其他条目', async () => {
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
          { ...config.IntelligentModels[0], ModelName: 'remote-model-2' },
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
        { ...initialConfig.IntelligentModels[0], ModelName: 'remote-model-2' },
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
    fireEvent.click(within(dropdown).getByRole('option', { name: 'builtin-alternative' }))
    closeModels()
    expect(mocks.save).toHaveBeenCalledWith({
      ...config,
      IntelligentModels: [{ ...config.IntelligentModels[0], ModelName: 'builtin-alternative' }],
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
    expect(mocks.latest).not.toHaveBeenCalled()
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

  it('列表加载超过 500ms 时仍禁用刷新和重置，完成后恢复', async () => {
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
    expect(refreshButton).toBeDisabled()
    expect(resetButton).toBeDisabled()
    await act(async () => vi.advanceTimersByTimeAsync(1000))
    fireEvent.click(refreshButton)
    fireEvent.click(resetButton)
    expect(mocks.names).toHaveBeenCalledTimes(1)
    expect(mocks.latest).not.toHaveBeenCalled()
    await act(async () => resolveNames({ ModelName: ['remote-model-1'] }))
    expect(refreshButton).toBeEnabled()
    expect(resetButton).toBeEnabled()
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

  it('同步思考强度和探测结果后，切换模型名称不会用旧配置覆盖它们', async () => {
    const dropdown = await openModels()
    const updatedModel = {
      ...config.IntelligentModels[0],
      Provider: { ...config.IntelligentModels[0].Provider, ReasoningEffort: 'high' },
      EffortProbed: true,
      ProbedExtendedEfforts: ['xhigh'],
    }
    const updatedConfig = { ...config, IntelligentModels: [updatedModel, config.IntelligentModels[1]] }
    act(() => useAIGlobalConfigStore.getState().setAIGlobalConfig(updatedConfig))
    fireEvent.click(within(dropdown).getByRole('option', { name: 'remote-model-2' }))
    closeModels()
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith({
        ...updatedConfig,
        IntelligentModels: [{ ...updatedModel, ModelName: 'remote-model-2' }, config.IntelligentModels[1]],
      }),
    )
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
    fireEvent.click(within(dropdown).getByRole('option', { name: 'remote-model-2' }))
    act(() => resizeInput(600, 120))
    act(() => resizeInput(600, 240))
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
