import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { createStore } from 'zustand/vanilla'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import { defaultAIGlobalConfig } from '../../defaultConstant'
import type { ModelContextState } from '@/pages/ai-re-act/hooks/aiRender'
import type { AIModelContextResponse } from '../../type/modelContext'
import { toModelContextSnapshot } from '@/pages/ai-re-act/hooks/modelContext'
import AIModelContextSettings from '../AIModelContextSettings/AIModelContextSettings'
import useAIModelContext from '../../useContext/useAIModelContext'
import { useRefreshModelContext } from '../../useContext/useRefreshModelContext'
import type { AIModelContextSettingsRef } from '../AIModelContextSettings/type'
import { yakitNotify } from '@/utils/notification'

vi.mock('../../useContext/useAIModelContext', () => ({ default: vi.fn() }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
const mocks = vi.hoisted(() => ({ getModel: vi.fn(), save: vi.fn(), canonical: vi.fn() }))
const rawData = { modelContext: { status: 'idle', generation: 0 } as ModelContextState }
const store = createStore(() => ({ updateStateCount: vi.fn() }))
const session = { rawData, store, meta: { lifecycle: { current: true, closing: false } } }
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => session.store,
  useCurrentMeta: () => session.meta,
  useCurrentRawData: () => session.rawData,
}))
vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({ getCanonicalAIGlobalConfig: mocks.canonical }))
vi.mock('../../grpc', () => ({ grpcGetAIModelContext: mocks.getModel }))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

const props = () => ({
  enabled: true,
  promptTokens: undefined,
  error: undefined as string | undefined,
  thresholdTokens: 500000,
  editorThresholdTokens: 500000,
  minimumThresholdTokens: 125000,
  editorDisableAutoAdjust: false,
  waitingForContext: false,
  disableAutoAdjust: false,
  loading: false,
  saving: false,
  setThreshold: vi.fn(),
  setAutoAdjust: vi.fn(),
  retry: vi.fn(),
  save: vi.fn(),
  refresh: vi.fn(),
})

const mockContext = (context: ReturnType<typeof props>) => {
  vi.mocked(useAIModelContext).mockImplementation((source = 'settings', open) => {
    const refresh = useRefreshModelContext(source, open)
    return {
      ...context,
      refresh,
      save: mocks.save,
      retry: () => {
        const { failedPatch } = session.rawData.modelContext
        if (failedPatch) mocks.save(failedPatch)
        else void refresh()
      },
    }
  })
}

const configFor = (owner: string) => ({
  ...defaultAIGlobalConfig,
  IntelligentModels: [
    { ModelName: 'primary', ProviderId: '0', Provider: { Type: 'openai' }, ExtraParams: [], ContextOwnerId: owner },
  ],
})
const responseFor = (key: string): AIModelContextResponse => ({
  ContextKey: key,
  Provider: 'openai',
  Model: 'primary',
  ThresholdTokens: 500000,
  MinimumThresholdTokens: 100000,
  Source: 'default',
  DisableAutoAdjust: false,
})
const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const editor = (context: ReturnType<typeof props>, ref = createRef<AIModelContextSettingsRef>()) => {
  mockContext(context)
  mocks.save.mockImplementation(context.save)
  return <AIModelContextSettings source="stream" ref={ref} />
}

describe('AIModelContextSettings', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    rawData.modelContext = { status: 'idle', generation: 0 }
    session.rawData = rawData
    useAIGlobalConfigStore.setState({
      persistedAiGlobalConfig: { ...defaultAIGlobalConfig, IntelligentModels: [] },
      configSavePending: false,
    })
  })

  it.each([fireEvent.mouseEnter, fireEvent.focus])('悬停或聚焦问号时显示自动调整说明', async (showHelp) => {
    render(editor(props()))
    const help = screen.getByRole('img', { name: 'AIContextUsage.autoAdjust' })
    showHelp(help)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('AIContextUsage.autoAdjustTooltip')
    expect(screen.getByRole('switch', { name: 'AIContextUsage.autoAdjust' })).toBeChecked()
  })

  it('每次打开读取主模型设置，关闭后的旧查询不会覆盖重新打开的结果', async () => {
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: configFor('owner-a') })
    mockContext(props())
    const old = deferred<AIModelContextResponse>()
    mocks.getModel
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce({ ...responseFor('key-a'), ThresholdTokens: 650000 })
    const view = render(<AIModelContextSettings source="settings" open />)
    await waitFor(() => expect(mocks.getModel).toHaveBeenCalledOnce())
    view.rerender(<AIModelContextSettings source="settings" open={false} />)
    expect(rawData.modelContext.status).toBe('idle')
    view.rerender(<AIModelContextSettings source="settings" open />)
    await waitFor(() => expect(rawData.modelContext.context?.threshold_tokens).toBe(650000))
    await act(async () => old.resolve(responseFor('key-a')))
    expect(rawData.modelContext.context?.threshold_tokens).toBe(650000)
  })

  it('切换主模型后清空未提交草稿，并忽略旧模型查询', async () => {
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: configFor('owner-a') })
    mockContext(props())
    const ref = createRef<AIModelContextSettingsRef>()
    const old = deferred<AIModelContextResponse>()
    mocks.getModel.mockReturnValueOnce(old.promise).mockResolvedValueOnce(responseFor('key-b'))
    render(<AIModelContextSettings source="settings" ref={ref} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '700' } })
    act(() => useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: configFor('owner-b') }))
    await waitFor(() => expect(rawData.modelContext.context?.context_key).toBe('key-b'))
    await act(async () => old.resolve(responseFor('key-a')))
    expect(rawData.modelContext.context?.context_key).toBe('key-b')
    expect(screen.getByRole('spinbutton')).toHaveValue('500')
    act(() => ref.current?.save())
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('查询期间收到同模型新流事件时保留实时设置和用量', async () => {
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: configFor('owner-a') })
    mockContext(props())
    const response = deferred<AIModelContextResponse>()
    mocks.getModel.mockReturnValueOnce(response.promise)
    render(<AIModelContextSettings source="settings" />)
    const runtime = { ...toModelContextSnapshot(responseFor('key-a')), threshold_tokens: 700000, prompt_tokens: 25000 }
    rawData.modelContext = { ...rawData.modelContext, runtime, context: runtime, saved: runtime }
    await act(async () => response.resolve(responseFor('key-a')))
    expect(rawData.modelContext).toMatchObject({
      status: 'ready',
      context: { threshold_tokens: 700000 },
      saved: { threshold_tokens: 700000 },
      promptTokens: 25000,
    })
  })

  it.each(['resolve', 'reject'] as const)('查询期间提交热更新后，查询 %s 保留待确认修改', async (result) => {
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: configFor('owner-a') })
    mockContext(props())
    const response = deferred<AIModelContextResponse>()
    const baseline = toModelContextSnapshot(responseFor('key-a'))
    rawData.modelContext = { status: 'ready', generation: 0, saved: baseline, runtime: baseline, context: baseline }
    mocks.getModel
      .mockImplementationOnce(() =>
        response.promise.then((value) => {
          if (result === 'reject') throw new Error('late query failure')
          return value
        }),
      )
      .mockResolvedValueOnce({ ...responseFor('key-a'), ThresholdTokens: 700000 })
    mocks.save.mockImplementation((patch) => {
      rawData.modelContext = {
        ...rawData.modelContext,
        pending: { patch, baseline },
        context: { ...baseline, ...patch },
      }
    })
    const ref = createRef<AIModelContextSettingsRef>()
    render(<AIModelContextSettings source="settings" ref={ref} />)
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '700' } })
    act(() => ref.current?.save())
    await act(async () => response.resolve(responseFor('key-a')))
    expect(rawData.modelContext).toMatchObject({
      context: { threshold_tokens: 700000 },
      pending: { patch: { threshold_tokens: 700000 } },
    })
    expect(rawData.modelContext.error).toBeUndefined()
    expect(mocks.getModel).toHaveBeenCalledOnce()
    act(() => {
      rawData.modelContext = { ...rawData.modelContext, pending: undefined }
      store.setState({})
    })
    await waitFor(() => expect(rawData.modelContext.status).toBe('ready'))
    expect(rawData.modelContext.context?.threshold_tokens).toBe(700000)
    expect(mocks.getModel).toHaveBeenCalledTimes(2)
    act(() => store.setState({}))
    expect(mocks.getModel).toHaveBeenCalledTimes(2)
  })

  it('查询被热更新阻挡后关闭面板，保存结束不再查询且结束加载状态', async () => {
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: configFor('owner-a') })
    mockContext(props())
    const response = deferred<AIModelContextResponse>()
    const baseline = toModelContextSnapshot(responseFor('key-a'))
    mocks.getModel.mockReturnValueOnce(response.promise)
    const view = render(<AIModelContextSettings source="settings" />)
    rawData.modelContext = { ...rawData.modelContext, pending: { patch: { threshold_tokens: 700000 }, baseline } }
    await act(async () => response.resolve(responseFor('key-a')))
    view.rerender(<AIModelContextSettings source="settings" open={false} />)
    expect(rawData.modelContext.status).toBe('idle')
    act(() => {
      rawData.modelContext = { ...rawData.modelContext, pending: undefined }
      store.setState({})
    })
    expect(mocks.getModel).toHaveBeenCalledOnce()
  })

  it('保存已经结束后才收到查询结果时直接应用，不重复查询', async () => {
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: configFor('owner-a') })
    mockContext(props())
    const response = deferred<AIModelContextResponse>()
    mocks.getModel.mockReturnValueOnce(response.promise)
    render(<AIModelContextSettings source="settings" />)
    const runtime = { ...toModelContextSnapshot(responseFor('key-a')), threshold_tokens: 700000 }
    rawData.modelContext = { ...rawData.modelContext, runtime, saved: runtime, context: runtime }
    await act(async () => response.resolve(responseFor('key-a')))
    expect(rawData.modelContext.context?.threshold_tokens).toBe(700000)
    expect(rawData.modelContext.status).toBe('ready')
    act(() => store.setState({}))
    expect(mocks.getModel).toHaveBeenCalledOnce()
  })

  it('关闭重开重新查询时保留保存失败的修改和提示', async () => {
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: configFor('owner-a') })
    mockContext(props())
    rawData.modelContext = {
      status: 'error',
      generation: 0,
      error: 'save rejected',
      failedPatch: { threshold_tokens: 600000 },
    }
    mocks.getModel.mockResolvedValue(responseFor('key-a'))
    render(<AIModelContextSettings source="settings" />)
    await waitFor(() => expect(rawData.modelContext.status).toBe('ready'))
    expect(rawData.modelContext).toMatchObject({ error: 'save rejected', failedPatch: { threshold_tokens: 600000 } })
  })

  it.each([
    [{ code: 12 }, 'unsupported'],
    [
      new Error("Error invoking remote method 'GetAIModelContext': Error: 12 UNIMPLEMENTED: unknown method"),
      'unsupported',
    ],
    [new Error('offline'), 'error'],
  ])('查询失败映射为对应状态 %s', async (error, status) => {
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: configFor('owner-a') })
    mockContext(props())
    mocks.getModel.mockRejectedValue(error)
    render(<AIModelContextSettings source="settings" />)
    await waitFor(() => expect(rawData.modelContext.status).toBe(status))
  })

  it('规范化 int64 字符串阈值，拒绝非法计数', async () => {
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: configFor('owner-a') })
    mockContext(props())
    mocks.getModel
      .mockResolvedValueOnce({ ...responseFor('key-a'), ThresholdTokens: '450000', MinimumThresholdTokens: '75000' })
      .mockResolvedValueOnce({ ...responseFor('key-a'), ThresholdTokens: 'broken' })
    const view = render(<AIModelContextSettings source="settings" />)
    await waitFor(() =>
      expect(rawData.modelContext.context).toMatchObject({ threshold_tokens: 450000, minimum_threshold_tokens: 75000 }),
    )
    view.rerender(<AIModelContextSettings source="settings" open={false} />)
    view.rerender(<AIModelContextSettings source="settings" open />)
    await waitFor(() => expect(rawData.modelContext.status).toBe('error'))
    expect(rawData.modelContext.context?.threshold_tokens).toBe(450000)
  })

  it('补齐主模型归属时继续当前查询，次要模型变化不重复读取', async () => {
    useAIGlobalConfigStore.setState({ aiGlobalConfig: configFor(''), persistedAiGlobalConfig: undefined })
    mocks.canonical.mockImplementation(async () => {
      const canonical = configFor('owner-a')
      useAIGlobalConfigStore.setState({ aiGlobalConfig: canonical, persistedAiGlobalConfig: canonical })
      return canonical
    })
    mocks.getModel.mockResolvedValue(responseFor('key-a'))
    mockContext(props())
    render(<AIModelContextSettings source="settings" />)
    await waitFor(() => expect(rawData.modelContext.status).toBe('ready'))
    act(() =>
      useAIGlobalConfigStore.setState({
        persistedAiGlobalConfig: {
          ...configFor('owner-a'),
          IntelligentModels: [...configFor('owner-a').IntelligentModels, ...configFor('owner-b').IntelligentModels],
        },
      }),
    )
    expect(mocks.getModel).toHaveBeenCalledExactlyOnceWith({ Config: configFor('owner-a').IntelligentModels[0] }, true)
  })

  it('会话销毁后忽略尚未返回的查询', async () => {
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: configFor('owner-a') })
    mockContext(props())
    const response = deferred<AIModelContextResponse>()
    mocks.getModel.mockReturnValueOnce(response.promise)
    const view = render(<AIModelContextSettings source="settings" />)
    view.unmount()
    await act(async () => response.resolve(responseFor('key-a')))
    expect(rawData.modelContext.saved).toBeUndefined()
  })

  it('查询失败后点击重试重新读取当前主模型', async () => {
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: configFor('owner-a') })
    mockContext({ ...props(), error: 'offline' })
    mocks.getModel.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(responseFor('key-a'))
    render(<AIModelContextSettings source="settings" />)
    await waitFor(() => expect(rawData.modelContext.status).toBe('error'))
    fireEvent.mouseEnter(screen.getByText('offline'))
    fireEvent.click(await screen.findByRole('button', { name: 'AIContextUsage.retry' }))
    await waitFor(() => expect(rawData.modelContext.status).toBe('ready'))
    expect(mocks.getModel).toHaveBeenCalledTimes(2)
    expect(rawData.modelContext.error).toBeUndefined()
  })

  it('切换会话后丢弃旧查询且各自保留会话数据', async () => {
    useAIGlobalConfigStore.setState({ persistedAiGlobalConfig: configFor('owner-a') })
    mockContext(props())
    const previous = deferred<AIModelContextResponse>()
    mocks.getModel.mockReturnValueOnce(previous.promise).mockResolvedValueOnce(responseFor('key-b'))
    const view = render(<AIModelContextSettings source="settings" />)
    const nextRawData = { modelContext: { status: 'idle', generation: 0 } as ModelContextState }
    session.rawData = nextRawData
    view.rerender(<AIModelContextSettings source="settings" />)
    await waitFor(() => expect(nextRawData.modelContext.context?.context_key).toBe('key-b'))
    await act(async () => previous.resolve(responseFor('key-a')))
    expect(nextRawData.modelContext.context?.context_key).toBe('key-b')
    expect(rawData.modelContext.saved).toBeUndefined()
  })
  it('高级配置内只修改草稿，关闭时一次保存阈值和开关，重复关闭不提交', () => {
    const context = props()
    const ref = createRef<AIModelContextSettingsRef>()
    mockContext(context)
    mocks.save.mockImplementation(context.save)
    render(<AIModelContextSettings ref={ref} source="settings" />)
    expect(useAIModelContext).toHaveBeenLastCalledWith('settings', true)
    const input = screen.getByRole('spinbutton', { name: 'AIContextUsage.threshold' })
    fireEvent.change(input, { target: { value: '600' } })
    fireEvent.blur(input)
    fireEvent.click(screen.getByRole('switch', { name: 'AIContextUsage.autoAdjust' }))
    expect(input).toHaveValue('600')
    expect(context.setThreshold).not.toHaveBeenCalled()
    expect(context.setAutoAdjust).not.toHaveBeenCalled()
    expect(context.save).not.toHaveBeenCalled()
    act(() => ref.current?.save())
    act(() => ref.current?.save())
    expect(context.save).toHaveBeenCalledExactlyOnceWith({ threshold_tokens: 600000, disable_auto_adjust: true })
  })

  it('关闭时提交尚未失焦的输入，重新打开时使用当前模型的值', () => {
    const context = props()
    const ref = createRef<AIModelContextSettingsRef>()
    mockContext(context)
    mocks.save.mockImplementation(context.save)
    const view = render(<AIModelContextSettings ref={ref} source="settings" />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '650' } })
    act(() => ref.current?.save())
    expect(context.save).toHaveBeenCalledExactlyOnceWith({ threshold_tokens: 650000 })
    view.unmount()
    const reopened = { ...props(), editorThresholdTokens: 450000 }
    mockContext(reopened)
    mocks.save.mockImplementation(reopened.save)
    render(<AIModelContextSettings ref={ref} source="settings" />)
    expect(screen.getByRole('spinbutton')).toHaveValue('450')
    act(() => ref.current?.save())
    expect(reopened.save).not.toHaveBeenCalled()
  })

  it('查询设置时显示整卡加载层，输入和开关不使用禁用样式', () => {
    const context = props()
    const view = render(editor({ ...context, loading: true }))
    const input = screen.getByRole('spinbutton')
    const toggle = screen.getByRole('switch')
    const spinner = view.container.querySelector('.ant-spin-spinning')
    expect(spinner).toBeInTheDocument()
    expect(input.closest('[aria-busy="true"]')).toContainElement(toggle)
    expect(input).not.toBeDisabled()
    expect(toggle).not.toBeDisabled()
    view.rerender(editor(context))
    expect(view.container.querySelector('.ant-spin-spinning')).not.toBeInTheDocument()
  })

  it.each([{ loading: true }, { waitingForContext: true }, { waitingForContext: true, saving: true }])(
    '查询或等待期间仍可编辑草稿，关闭时提交 %o',
    (state) => {
      const context = { ...props(), ...state }
      const ref = createRef<AIModelContextSettingsRef>()
      render(editor(context, ref))
      const input = screen.getByRole('spinbutton')
      expect(input.closest('[inert]')).toBeNull()
      fireEvent.change(input, { target: { value: '740' } })
      fireEvent.click(screen.getByRole('switch'))
      expect(input).toHaveValue('740')
      expect(context.save).not.toHaveBeenCalled()
      act(() => ref.current?.save())
      expect(context.save).toHaveBeenCalledExactlyOnceWith({ threshold_tokens: 740000, disable_auto_adjust: true })
    },
  )

  it('等待流回执时显示上次编辑的值，在标题旁提示等待原因', async () => {
    const context = props()
    const view = render(
      editor({
        ...context,
        waitingForContext: true,
        editorThresholdTokens: 700000,
        editorDisableAutoAdjust: true,
      }),
    )
    expect(screen.getByRole('spinbutton')).toHaveValue('700')
    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(view.container.querySelector('.ant-spin-spinning')).not.toBeInTheDocument()
    const info = screen.getByRole('img', { name: 'AIContextUsage.waitingContext' })
    expect(screen.getByText('AIContextUsage.threshold').parentElement).toContainElement(info)
    fireEvent.mouseEnter(info)
    await waitFor(() => expect(screen.getByText('AIContextUsage.waitingContext')).toBeVisible())
    view.rerender(editor(context))
    expect(screen.queryByRole('img', { name: 'AIContextUsage.waitingContext' })).not.toBeInTheDocument()
  })

  it('有错误时在标题旁悬停查看原因并重试', async () => {
    const callbacks = { ...props(), editorThresholdTokens: 870000 }
    const { rerender } = render(editor(callbacks))
    expect(screen.getByRole('spinbutton')).toHaveValue('870')
    expect(useAIModelContext).toHaveBeenLastCalledWith('stream', true)
    rerender(editor({ ...callbacks, saving: true }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    rerender(editor({ ...callbacks, waitingForContext: true, error: '保存失败' }))
    const badge = screen.getByText('保存失败')
    expect(screen.getByText('AIContextUsage.threshold').parentElement).toContainElement(badge)
    expect(badge).toBeVisible()
    expect(screen.queryByRole('img', { name: 'AIContextUsage.waitingContext' })).not.toBeInTheDocument()
    fireEvent.mouseEnter(badge)
    await waitFor(() => expect(screen.getAllByText('保存失败')).toHaveLength(2))
    rawData.modelContext.failedPatch = { threshold_tokens: 870000 }
    fireEvent.click(screen.getByRole('button', { name: 'AIContextUsage.retry' }))
    expect(callbacks.save).toHaveBeenCalledExactlyOnceWith({ threshold_tokens: 870000 })
    rerender(editor(callbacks))
    expect(screen.queryByText('保存失败')).not.toBeInTheDocument()
  })

  it.each([
    ['20', 125000],
    ['1000', 1000000],
  ])('输入 %s K 时先校正草稿，关闭后按边界提交一次', (value, tokens) => {
    const context = props()
    const ref = createRef<AIModelContextSettingsRef>()
    render(editor(context, ref))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    fireEvent.blur(input)
    expect(context.save).not.toHaveBeenCalled()
    expect(context.setThreshold).not.toHaveBeenCalled()
    act(() => ref.current?.save())
    expect(context.save).toHaveBeenCalledExactlyOnceWith({ threshold_tokens: tokens })
  })

  it.each([
    [50000, '50'],
    [650555, '650.555'],
  ])('引擎阈值 %i 保留真实值和精度，未编辑就关闭不保存', (tokens, display) => {
    const context = { ...props(), editorThresholdTokens: tokens }
    const ref = createRef<AIModelContextSettingsRef>()
    render(editor(context, ref))
    const input = screen.getByRole('spinbutton')
    expect(input).toHaveValue(display)
    fireEvent.blur(input)
    act(() => ref.current?.save())
    expect(context.save).not.toHaveBeenCalled()
  })

  it.each(['1001', '10000', '00001', '1000.1', '999.99', '1,001'])('拒绝超限输入 %s，保留原值并提示', (next) => {
    const context = props()
    const ref = createRef<AIModelContextSettingsRef>()
    render(editor(context, ref))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '650' } })
    fireEvent.change(input, { target: { value: next } })
    expect(input).toHaveValue('650')
    expect(yakitNotify).toHaveBeenCalledExactlyOnceWith('warning', 'AIContextUsage.exceedsMaximum')
    act(() => ref.current?.save())
    expect(context.save).toHaveBeenCalledExactlyOnceWith({ threshold_tokens: 650000 })
  })

  it.each([
    ['650.5', 650500],
    ['99.99', 99990],
  ])('保留四位小数 K 输入 %s 并按 token 精度保存', (next, tokens) => {
    const context = { ...props(), minimumThresholdTokens: 50000 }
    const ref = createRef<AIModelContextSettingsRef>()
    render(editor(context, ref))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: next } })
    expect(input).toHaveValue(next)
    expect(yakitNotify).not.toHaveBeenCalled()
    act(() => ref.current?.save())
    expect(context.save).toHaveBeenCalledExactlyOnceWith({ threshold_tokens: tokens })
  })

  it('模型更新最低阈值时同步更新滑块范围和刻度', () => {
    const context = props()
    const view = render(editor(context))
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuemin', '125000')
    expect(screen.getByText('125K')).toBeVisible()
    expect(screen.getByText('562.5K')).toBeVisible()
    view.rerender(editor({ ...context, minimumThresholdTokens: 300000 }))
    expect(slider).toHaveAttribute('aria-valuemin', '300000')
    expect(screen.getByText('300K')).toBeVisible()
    expect(screen.getByText('650K')).toBeVisible()
  })

  it.each([
    [125000, 500000],
    [600000, 600000],
  ])('下限为 %i 时局部重置只恢复阈值，关闭后保存 %i', (minimumThresholdTokens, expected) => {
    const context = { ...props(), minimumThresholdTokens, editorThresholdTokens: 800000, editorDisableAutoAdjust: true }
    const ref = createRef<AIModelContextSettingsRef>()
    render(editor(context, ref))
    fireEvent.click(screen.getByRole('button', { name: 'AIContextUsage.restoreDefault' }))
    expect(screen.getByRole('spinbutton')).toHaveValue(String(expected / 1000))
    expect(screen.getByRole('switch')).not.toBeChecked()
    expect(context.save).not.toHaveBeenCalled()
    act(() => ref.current?.save())
    expect(context.save).toHaveBeenCalledExactlyOnceWith({ threshold_tokens: expected })
  })

  it('编辑期间收到新阈值后保留尚未失焦的草稿，关闭后提交草稿', () => {
    const context = props()
    const ref = createRef<AIModelContextSettingsRef>()
    const view = render(editor(context, ref))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '700' } })
    view.rerender(editor({ ...context, editorThresholdTokens: 600000 }, ref))
    expect(input).toHaveValue('700')
    expect(context.save).not.toHaveBeenCalled()
    act(() => ref.current?.save())
    expect(context.save).toHaveBeenCalledExactlyOnceWith({ threshold_tokens: 700000 })
  })

  it('滑条键盘操作只更新草稿，直到关闭才保存', () => {
    const context = props()
    const ref = createRef<AIModelContextSettingsRef>()
    render(editor(context, ref))
    const slider = screen.getByRole('slider', { name: 'AIContextUsage.threshold' })
    fireEvent.keyDown(slider, { key: 'ArrowRight', keyCode: 39 })
    fireEvent.keyUp(slider, { key: 'ArrowRight', keyCode: 39 })
    expect(context.setThreshold).not.toHaveBeenCalled()
    expect(context.save).not.toHaveBeenCalled()
    act(() => ref.current?.save())
    expect(context.save).toHaveBeenCalledExactlyOnceWith({ threshold_tokens: 501000 })
  })
})
