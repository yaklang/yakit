import type React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { EnterpriseAIModelSelect } from '../EnterpriseAIModelSelect'
import { defaultAIGlobalConfig } from '../../../../defaultConstant'
import type { AIGlobalConfig } from '../../../utils'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import type { GetAIModelAvailableTotalResponse } from '../../../../type/aiModel'

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  refresh: vi.fn(),
  save: vi.fn((_config: AIGlobalConfig) => Promise.resolve()),
  names: vi.fn((_params: { Config: string }) => Promise.resolve({ ModelName: ['model-edited'] })),
  configure: vi.fn(),
  inViewport: true,
}))
vi.mock('../../../utils', () => ({
  isForcedSetAIModal: mocks.load,
  grpcListAiModel: mocks.names,
  getModelName: (name?: string) => name ?? '',
  isMemfitStart: () => false,
  isFreeEnd: () => false,
  sortMemfitNameFirst: (names: string[]) => names,
}))
vi.mock('../../../AIModelList', () => ({
  OutlineAtomIconByStatus: () => null,
  AIModelFreeTag: () => null,
  setAIModal: mocks.configure,
}))
vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({
  default: function useMockAIGlobalConfig() {
    return [
      { aiGlobalConfig: useAIGlobalConfigStore((state) => state.aiGlobalConfig) },
      {
        onRefresh: mocks.refresh,
        setAIGlobalConfig: (config: AIGlobalConfig) => {
          useAIGlobalConfigStore.getState().setAIGlobalConfig(config)
          return mocks.save(config)
        },
      },
    ]
  },
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('ahooks', async (importOriginal) => ({
  // ahooks 导出庞大且此处整体 spread，模块类型无法用 import type 描述，显式豁免。
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  ...(await importOriginal<typeof import('ahooks')>()),
  useInViewport: () => [mocks.inViewport],
}))
vi.mock('@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect', () => ({
  AIChatSelect: ({
    open,
    setOpen,
    dropdownRender,
  }: {
    open: boolean
    setOpen: (open: boolean) => void
    dropdownRender: (menu: React.ReactNode) => React.ReactNode
  }) => (
    <>
      <button onClick={() => setOpen(!open)}>{open ? '关闭选择' : '打开选择'}</button>
      {open && (
        <div role="region" aria-label="模型列表">
          {dropdownRender(null)}
        </div>
      )}
    </>
  ),
}))
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', () => ({ YakitSelect: { Option: () => null } }))

const applyModels = (res: GetAIModelAvailableTotalResponse) => {
  useAIGlobalConfigStore.getState().setAIGlobalConfig(res.onlineModels)
}

beforeEach(() => {
  vi.clearAllMocks()
  useAIGlobalConfigStore.getState().setAIGlobalConfig({ ...defaultAIGlobalConfig })
  mocks.load.mockReset().mockResolvedValue(null)
  mocks.save.mockReset().mockResolvedValue(undefined)
  mocks.names.mockReset().mockResolvedValue({ ModelName: ['model-edited'] })
  mocks.inViewport = true
  // jsdom 没有原生 ResizeObserver；尺寸变化在对应交互用例中主动触发。
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  )
  mocks.refresh.mockReset().mockImplementation(() => {
    applyModels({
      onlineModelsTotal: 2,
      localModelsTotal: 0,
      localModels: [],
      onlineModels: {
        ...defaultAIGlobalConfig,
        IntelligentModels: ['model-a', 'model-b'].map((ModelName) => ({
          ModelName,
          ProviderId: ModelName,
          ExtraParams: [],
          Provider: { Type: 'test-provider', ReasoningEffort: 'off' },
        })),
      },
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
  render(<EnterpriseAIModelSelect />)
  fireEvent.click(await screen.findByRole('button', { name: '打开选择' }))
  return screen.getByRole('region', { name: '模型列表' })
}

/** 下拉按钮顺序：配置、刷新、两条模型编辑、新增模型。CI 根目录 vitest 会 stub CSS modules，不能靠 className。 */
const getDropdownButtons = (dropdown: HTMLElement) => within(dropdown).getAllByRole('button')
const getEditButtons = (dropdown: HTMLElement) => within(dropdown).getAllByRole('button', { name: 'YakitButton.edit' })

describe('EnterpriseAIModelSelect', () => {
  it.each([false, true])('并发刷新全部结束后才清除 loading（新请求先结束：%s）', async (latestFirst) => {
    vi.useFakeTimers()
    const completions: Array<() => void> = []
    mocks.load.mockImplementation(() => new Promise<void>((resolve) => completions.push(resolve)))
    render(<EnterpriseAIModelSelect />)
    fireEvent.click(screen.getByRole('button', { name: '打开选择' }))
    await act(async () => vi.advanceTimersByTimeAsync(250))
    act(() => emiter.emit('onRefreshAvailableAIModelList'))
    expect(mocks.load).toHaveBeenCalledTimes(2)
    const refresh = getDropdownButtons(screen.getByRole('region', { name: '模型列表' }))[1]
    expect(refresh).toHaveClass('ant-btn-loading')

    await act(async () => completions[latestFirst ? 1 : 0]())
    await act(async () => vi.advanceTimersByTimeAsync(500))
    expect(refresh).toHaveClass('ant-btn-loading')
    await act(async () => completions[latestFirst ? 0 : 1]())
    await act(async () => vi.advanceTimersByTimeAsync(500))
    expect(refresh).not.toHaveClass('ant-btn-loading')
  })

  it('首次空配置新增模型后，收到可用模型刷新事件即可显示选择器', async () => {
    mocks.refresh.mockImplementationOnce(() => {
      applyModels({
        onlineModelsTotal: 0,
        localModelsTotal: 0,
        localModels: [],
        onlineModels: { ...defaultAIGlobalConfig },
      })
      return Promise.resolve()
    })
    render(<EnterpriseAIModelSelect />)
    expect(screen.queryByRole('button', { name: '打开选择' })).not.toBeInTheDocument()
    act(() => emiter.emit('onRefreshAvailableAIModelList'))
    fireEvent.click(await screen.findByRole('button', { name: '打开选择' }))
    expect(screen.getByText('model-a')).toBeVisible()
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('设置页删除全部模型后，回页的空响应清空列表且不写回旧配置', async () => {
    vi.useFakeTimers()
    const { rerender } = render(<EnterpriseAIModelSelect />)
    await act(async () => vi.advanceTimersByTimeAsync(500))
    expect(screen.getByRole('button', { name: '打开选择' })).toBeVisible()

    mocks.inViewport = false
    rerender(<EnterpriseAIModelSelect className="hidden-page" />)
    mocks.refresh.mockImplementationOnce(() => {
      applyModels({
        onlineModelsTotal: 0,
        localModelsTotal: 0,
        localModels: [],
        onlineModels: { ...defaultAIGlobalConfig },
      })
      return Promise.resolve()
    })
    mocks.inViewport = true
    rerender(<EnterpriseAIModelSelect />)
    await act(async () => vi.advanceTimersByTimeAsync(500))

    expect(mocks.load).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('button', { name: '打开选择' })).not.toBeInTheDocument()
    expect(screen.queryByText('model-a')).not.toBeInTheDocument()
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it.each([false, true])('保留重新打开后的新选择并保存（第二次关闭前完成上次保存：%s）', async (completed) => {
    let completeSave!: () => void
    mocks.save.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        completeSave = resolve
      }),
    )
    const dropdown = await openModels()
    fireEvent.click(within(dropdown).getByText('model-b'))
    fireEvent.click(screen.getByRole('button', { name: '关闭选择' }))
    expect(mocks.save).toHaveBeenCalledTimes(1)
    expect(mocks.save.mock.calls[0][0].IntelligentModels[0].ModelName).toBe('model-b')

    fireEvent.click(screen.getByRole('button', { name: '打开选择' }))
    fireEvent.click(screen.getByText('model-a'))
    if (completed) await act(async () => completeSave())
    fireEvent.click(screen.getByRole('button', { name: '关闭选择' }))

    expect(mocks.save).toHaveBeenCalledTimes(2)
    expect(mocks.save.mock.calls[1][0].IntelligentModels[0].ModelName).toBe('model-a')
    if (!completed) await act(async () => completeSave())
  })

  it('编辑名称请求透传自定义连接地址、协议、端点与请求头', async () => {
    mocks.refresh.mockImplementationOnce(() => {
      applyModels({
        onlineModelsTotal: 1,
        localModelsTotal: 0,
        localModels: [],
        onlineModels: {
          ...defaultAIGlobalConfig,
          IntelligentModels: [
            {
              ModelName: 'custom-model',
              ProviderId: 'custom',
              ExtraParams: [],
              Provider: {
                Type: 'custom',
                APIKey: 'test-key',
                APIType: 'responses',
                Domain: 'gateway.example',
                NoHttps: true,
                Proxy: 'http://proxy.example',
                BaseURL: 'https://gateway.example/v1',
                Endpoint: '/models',
                EnableEndpoint: true,
                Headers: [{ Key: 'X-Tenant', Value: 'test' }],
              },
            },
          ],
        },
      })
      return Promise.resolve()
    })
    const dropdown = await openModels()
    fireEvent.mouseEnter(getEditButtons(dropdown)[0])
    await screen.findByText('model-edited')
    expect(JSON.parse(mocks.names.mock.calls[0][0].Config)).toEqual({
      Type: 'custom',
      api_key: 'test-key',
      api_type: 'responses',
      domain: 'gateway.example',
      no_https: true,
      proxy: 'http://proxy.example',
      base_url: 'https://gateway.example/v1',
      endpoint: '/models',
      enable_endpoint: true,
      Headers: [{ Key: 'X-Tenant', Value: 'test' }],
    })
  })

  it.each([false, true])('重排后按连接加载名称，旧请求不会串入新模型（重排前完成：%s）', async (completed) => {
    let resolveFirst!: (value: { ModelName: string[] }) => void
    mocks.names.mockImplementation(({ Config }) => {
      if (JSON.parse(Config).base_url === 'https://provider-a.example/v1') {
        return new Promise((resolve) => {
          resolveFirst = resolve
        })
      }
      return Promise.resolve({ ModelName: ['provider-b-model'] })
    })
    mocks.refresh.mockImplementationOnce(() => {
      applyModels({
        onlineModelsTotal: 2,
        localModelsTotal: 0,
        localModels: [],
        onlineModels: {
          ...defaultAIGlobalConfig,
          IntelligentModels: ['a', 'b'].map((id) => ({
            ModelName: `model-${id}`,
            ProviderId: id,
            ExtraParams: [],
            Provider: { Type: 'custom', BaseURL: `https://provider-${id}.example/v1` },
          })),
        },
      })
      return Promise.resolve()
    })

    const dropdown = await openModels()
    fireEvent.mouseEnter(getEditButtons(dropdown)[0])
    await waitFor(() => expect(mocks.names).toHaveBeenCalledTimes(1))
    if (completed) {
      await act(async () => resolveFirst({ ModelName: ['provider-a-model'] }))
      await screen.findByText('provider-a-model')
    }

    fireEvent.click(within(dropdown).getByText('model-b'))
    fireEvent.mouseEnter(getEditButtons(dropdown)[0])
    await waitFor(() => expect(mocks.names).toHaveBeenCalledTimes(2))
    expect(JSON.parse(mocks.names.mock.calls[1][0].Config).base_url).toBe('https://provider-b.example/v1')
    await screen.findByText('provider-b-model')
    if (!completed) {
      await act(async () => resolveFirst({ ModelName: ['provider-a-model'] }))
    }
    expect(screen.queryByText('provider-a-model')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('provider-b-model'))
    fireEvent.click(screen.getByRole('button', { name: '关闭选择' }))
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
    expect(mocks.save.mock.calls[0][0].IntelligentModels[0]).toMatchObject({
      ModelName: 'provider-b-model',
      ProviderId: 'b',
      Provider: { BaseURL: 'https://provider-b.example/v1' },
    })
  })

  it('编辑浮层的标题、空态和刷新按钮使用国际化文案', async () => {
    mocks.names.mockResolvedValueOnce({ ModelName: [] })
    const dropdown = await openModels()
    fireEvent.mouseEnter(getEditButtons(dropdown)[0])
    expect(await screen.findByText('AIModelSelect.emptyModels')).toBeVisible()
    expect(screen.getAllByText('AIModelSelect.selectModel')).toHaveLength(2)
    const refreshButtons = screen.getAllByRole('button', { name: 'YakitButton.refresh' })
    expect(refreshButtons).toHaveLength(2)
    refreshButtons.forEach((button) => expect(button).toBeVisible())
    expect(screen.queryByText('模型选择')).not.toBeInTheDocument()
    expect(screen.queryByText('未获取到数据，可点击')).not.toBeInTheDocument()
  })

  it('AI 页内新增模型成功后直接刷新选择器，不通知模型管理列表', async () => {
    const emit = vi.spyOn(emiter, 'emit')
    const dropdown = await openModels()
    fireEvent.click(within(dropdown).getByRole('button', { name: 'AIModelList.addModel' }))
    expect(mocks.configure).toHaveBeenCalledTimes(1)
    act(() => mocks.configure.mock.calls[0][0].onSuccess())
    await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2))
    expect(emit).not.toHaveBeenCalledWith('onRefreshAIModelList')
  })

  it('离开 AI 页时不响应同步事件，切回后重新加载最新模型', async () => {
    vi.useFakeTimers()
    const { rerender } = render(<EnterpriseAIModelSelect />)
    await act(async () => vi.advanceTimersByTimeAsync(500))
    expect(mocks.load).toHaveBeenCalledTimes(1)

    mocks.inViewport = false
    rerender(<EnterpriseAIModelSelect className="hidden-page" />)
    act(() => emiter.emit('onRefreshAvailableAIModelList'))
    await act(async () => vi.advanceTimersByTimeAsync(500))
    expect(mocks.load).toHaveBeenCalledTimes(1)

    mocks.refresh.mockImplementationOnce(() => {
      applyModels({
        onlineModelsTotal: 1,
        localModelsTotal: 0,
        localModels: [],
        onlineModels: {
          ...defaultAIGlobalConfig,
          IntelligentModels: [
            { ModelName: 'updated-in-settings', ProviderId: 'provider', ExtraParams: [], Provider: { Type: 'test' } },
          ],
        },
      })
      return Promise.resolve()
    })
    mocks.inViewport = true
    rerender(<EnterpriseAIModelSelect />)
    await act(async () => vi.advanceTimersByTimeAsync(500))
    expect(mocks.load).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('button', { name: '打开选择' }))
    expect(screen.getByText('updated-in-settings')).toBeVisible()
  })

  it('仅可用模型刷新事件触发重新加载，卸载后取消订阅', async () => {
    vi.useFakeTimers()
    render(<EnterpriseAIModelSelect />)
    await act(async () => vi.advanceTimersByTimeAsync(500))
    mocks.load.mockClear()

    act(() => emiter.emit('onRefreshAIModelList'))
    await act(async () => vi.advanceTimersByTimeAsync(500))
    expect(mocks.load).not.toHaveBeenCalled()

    act(() => emiter.emit('onRefreshAvailableAIModelList'))
    await act(async () => vi.advanceTimersByTimeAsync(500))
    expect(mocks.load).toHaveBeenCalledTimes(1)

    cleanup()
    act(() => emiter.emit('onRefreshAvailableAIModelList'))
    await act(async () => vi.advanceTimersByTimeAsync(500))
    expect(mocks.load).toHaveBeenCalledTimes(1)
  })

  it('管理模型按钮显示国际化文案并打开模型配置，刷新仍会重新拉取模型列表', async () => {
    const emit = vi.spyOn(emiter, 'emit')
    const dropdown = await openModels()
    expect(within(dropdown).getByText('model-a')).toBeInTheDocument()
    const buttons = getDropdownButtons(dropdown)
    expect(buttons).toHaveLength(5)
    const configButton = within(dropdown).getByRole('button', { name: 'AIModelSelect.manageModels' })
    expect(configButton).toBeVisible()
    const refreshButton = buttons[1]
    fireEvent.click(configButton)
    expect(emit).toHaveBeenCalledWith(
      'openPage',
      JSON.stringify({ route: YakitRoute.Settings, params: { anchor: 'ai-model' } }),
    )
    expect(mocks.configure).not.toHaveBeenCalled()
    await waitFor(() => expect(refreshButton).not.toHaveClass('ant-btn-loading'))
    fireEvent.click(refreshButton)
    await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2))
  })

  it('选择模型后关闭下拉，将选择结果保存为首选模型', async () => {
    const dropdown = await openModels()
    fireEvent.click(within(dropdown).getByText('model-b'))
    fireEvent.click(screen.getByRole('button', { name: '关闭选择' }))
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith(
        expect.objectContaining({
          IntelligentModels: [
            expect.objectContaining({ ModelName: 'model-b' }),
            expect.objectContaining({ ModelName: 'model-a' }),
          ],
        }),
      ),
    )
  })

  it('悬停编辑按钮后仍可加载模型名称、编辑并保存', async () => {
    const dropdown = await openModels()
    fireEvent.mouseEnter(getEditButtons(dropdown)[0])
    fireEvent.click(await screen.findByText('model-edited'))
    expect(JSON.parse(mocks.names.mock.calls[0][0].Config)).toEqual({
      Type: 'test-provider',
      api_key: '',
      api_type: '',
      domain: '',
      no_https: false,
      proxy: '',
      base_url: '',
      endpoint: '',
      enable_endpoint: false,
      Headers: [],
    })
    fireEvent.click(screen.getByRole('button', { name: '关闭选择' }))
    await waitFor(() =>
      expect(mocks.save).toHaveBeenCalledWith(
        expect.objectContaining({
          IntelligentModels: [
            expect.objectContaining({ ModelName: 'model-edited' }),
            expect.objectContaining({ ModelName: 'model-b' }),
          ],
        }),
      ),
    )
  })

  it.each([500, 700])('宽度变为 %s 时，即使未打开编辑浮层也关闭列表并保存模型选择', async (width) => {
    let resizeInput: (width: number) => void = () => {}
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private callback: ResizeObserverCallback) {}
        observe(target: Element) {
          resizeInput = (width) =>
            this.callback(
              [{ target, contentRect: { width, height: 120 } } as ResizeObserverEntry],
              this as unknown as ResizeObserver,
            )
        }
        disconnect() {}
        unobserve() {}
      },
    )
    const dropdown = await openModels()
    act(() => resizeInput(600))
    fireEvent.click(within(dropdown).getByText('model-b'))
    act(() => resizeInput(width))
    expect(screen.queryByRole('region', { name: '模型列表' })).not.toBeInTheDocument()
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({
        IntelligentModels: [
          expect.objectContaining({ ModelName: 'model-b' }),
          expect.objectContaining({ ModelName: 'model-a' }),
        ],
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: '打开选择' }))
    act(() => resizeInput(width))
    expect(screen.getByRole('region', { name: '模型列表' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '关闭选择' }))
    expect(mocks.save).toHaveBeenCalledTimes(1)
  })

  it('选择器外层宽度变化时关闭一级和二级弹窗，高度变化不关闭，关闭后可重新打开', async () => {
    let resizeInput: (width: number, height: number) => void = () => {}
    let observedTarget: Element | undefined
    const disconnect = vi.fn()
    // 组件观察的是自身触发器元素（triggerRef），记录 observe 到的目标供用例主动触发尺寸变化。
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private callback: ResizeObserverCallback) {}
        observe(target: Element) {
          observedTarget = target
          resizeInput = (width, height) =>
            this.callback(
              [{ target, contentRect: { width, height } } as ResizeObserverEntry],
              this as unknown as ResizeObserver,
            )
        }
        disconnect = disconnect
        unobserve() {}
      },
    )
    try {
      render(<EnterpriseAIModelSelect className="model-trigger" />)
      fireEvent.click(await screen.findByRole('button', { name: '打开选择' }))
      await waitFor(() => expect(observedTarget).toBe(document.querySelector('.model-trigger')))
      act(() => resizeInput(600, 120))
      const dropdown = screen.getByRole('region', { name: '模型列表' })
      expect(dropdown).toBeVisible()
      const measureDropdown = vi.spyOn(dropdown.firstElementChild!, 'getBoundingClientRect')
      measureDropdown.mockReturnValue(new DOMRect(100, 0, 200, 300))
      fireEvent.mouseEnter(getEditButtons(dropdown)[0])
      expect(await screen.findByText('model-edited')).toBeVisible()
      expect(screen.getByText('model-edited').closest('[style*="translate("]')).toHaveStyle({
        transform: 'translate(306px, 0px)',
      })

      act(() => resizeInput(600, 240))
      expect(screen.getByText('model-edited')).toBeVisible()
      expect(dropdown).toBeVisible()
      act(() => resizeInput(500, 240))
      expect(screen.queryByText('model-edited')).not.toBeInTheDocument()
      expect(screen.queryByRole('region', { name: '模型列表' })).not.toBeInTheDocument()
      expect(disconnect).toHaveBeenCalled()
      expect(mocks.save).not.toHaveBeenCalled()

      fireEvent.click(screen.getByRole('button', { name: '打开选择' }))
      act(() => resizeInput(500, 240))
      const reopenedDropdown = screen.getByRole('region', { name: '模型列表' })
      const reopenedMeasureDropdown = vi.spyOn(reopenedDropdown.firstElementChild!, 'getBoundingClientRect')
      reopenedMeasureDropdown.mockReturnValue(new DOMRect(200, 0, 200, 300))
      fireEvent.mouseEnter(getEditButtons(reopenedDropdown)[0])
      expect(await screen.findByText('model-edited')).toBeVisible()
      expect(screen.getByText('model-edited').closest('[style*="translate("]')).toHaveStyle({
        transform: 'translate(406px, 0px)',
      })
      cleanup()
      expect(disconnect).toHaveBeenCalled()
    } finally {
      cleanup()
      vi.unstubAllGlobals()
    }
  })
})
