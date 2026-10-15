import type React from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EnterpriseAIModelSelect } from '../EnterpriseAIModelSelect'
import { defaultAIGlobalConfig } from '../../../../defaultConstant'
import type { AIGlobalConfig } from '../../../utils'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import emiter from '@/utils/eventBus/eventBus'

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  get: vi.fn<() => Promise<AIGlobalConfig>>(),
  save: vi.fn<(_config: AIGlobalConfig) => Promise<void>>(),
  names: vi.fn(),
}))
vi.mock('../../../utils', () => ({
  isForcedSetAIModal: mocks.load,
  grpcGetAIGlobalConfig: mocks.get,
  grpcSetAIGlobalConfig: mocks.save,
  grpcListAiModel: mocks.names,
  getModelName: (name?: string) => name ?? '',
  isMemfitStart: () => false,
  isFreeEnd: () => false,
  sortMemfitNameFirst: (names: string[]) => names,
}))
vi.mock('../../../AIModelList', () => ({
  OutlineAtomIconByStatus: () => null,
  AIModelFreeTag: () => null,
  setAIModal: vi.fn(),
}))
vi.mock('@/utils/logCollection', () => ({ debugToPrintLogs: vi.fn() }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('ahooks', async (importOriginal) => ({
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
    open: boolean
    setOpen: (open: boolean) => void
    dropdownRender: (menu: React.ReactNode) => React.ReactNode
    children: React.ReactNode
  }) => (
    <>
      {children}
      <button onClick={() => setOpen(!open)}>{open ? 'close' : 'open'}</button>
      {open && (
        <div role="region" aria-label="models">
          {dropdownRender(null)}
        </div>
      )}
    </>
  ),
}))
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', () => ({
  YakitSelect: { Option: ({ label }: { label: React.ReactNode }) => <div data-testid="model-pill">{label}</div> },
}))

const configA = (): AIGlobalConfig => ({
  ...defaultAIGlobalConfig,
  IntelligentModels: ['model-a', 'model-b', 'model-c'].map((ModelName) => ({
    ModelName,
    ProviderId: ModelName,
    ExtraParams: [],
    Provider: { Type: 'test-provider', ReasoningEffort: 'off' },
  })),
})
const availableA = () => ({
  onlineModelsTotal: 3,
  localModelsTotal: 0,
  localModels: [],
  onlineModels: configA(),
})
const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
const StoreConsumer = () => {
  const model = useAIGlobalConfigStore((s) => s.aiGlobalConfig.IntelligentModels[0]?.ModelName)
  return <div data-testid="store-consumer">{model}</div>
}
const flush = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250)
  })
}
const toggle = (name: 'open' | 'close') => fireEvent.click(screen.getByRole('button', { name }))
const select = (name: string) => fireEvent.click(within(screen.getByRole('region', { name: 'models' })).getByText(name))
const expectModel = (name: string) => {
  expect(screen.getByTestId('model-pill')).toHaveTextContent(name)
  expect(screen.getByTestId('store-consumer')).toHaveTextContent(name)
  expect(useAIGlobalConfigStore.getState().aiGlobalConfig.IntelligentModels[0].ModelName).toBe(name)
}
const mount = async () => {
  render(
    <>
      <EnterpriseAIModelSelect />
      <StoreConsumer />
    </>,
  )
  await flush()
  expectModel('model-a')
}

beforeEach(() => {
  vi.useFakeTimers()
  mocks.get.mockReset().mockImplementation(() => Promise.resolve(configA()))
  mocks.save.mockReset().mockResolvedValue(undefined)
  mocks.names.mockReset().mockResolvedValue({ ModelName: ['model-renamed'] })
  mocks.load.mockReset().mockImplementation(({ haveDataCall }) => {
    haveDataCall?.(availableA())
    return Promise.resolve()
  })
  useAIGlobalConfigStore.setState({ aiGlobalConfig: configA(), isInit: true, queryLoading: false })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  )
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('EnterpriseAIModelSelect real config hook/store synchronization', () => {
  it.each([false, true])('选择 B 时 A 的探测完成，保留选择和探测结果（同厂商：%s）', async (sameProvider) => {
    const initial = configA()
    if (sameProvider)
      initial.IntelligentModels.forEach((model) => {
        model.ProviderId = 'shared-provider'
      })
    mocks.get.mockResolvedValue(initial)
    useAIGlobalConfigStore.setState({ aiGlobalConfig: initial })
    await mount()
    toggle('open')
    select('model-b')

    const latest = { ...initial, IntelligentModels: [...initial.IntelligentModels] }
    latest.IntelligentModels[0] = {
      ...latest.IntelligentModels[0],
      EffortProbed: true,
      ProbedExtendedEfforts: ['xhigh'],
    }
    act(() => useAIGlobalConfigStore.getState().setAIGlobalConfig(latest))
    toggle('close')
    await flush()

    expectModel('model-b')
    expect(mocks.save).toHaveBeenCalledTimes(1)
    expect(mocks.save.mock.calls[0][0].IntelligentModels).toEqual([
      latest.IntelligentModels[1],
      latest.IntelligentModels[0],
      latest.IntelligentModels[2],
    ])
  })

  it.each([false, true])('编辑 B 名称时保留 A 的探测结果，新名称不沿用旧探测（先探测：%s）', async (probeFirst) => {
    const initial = configA()
    initial.IntelligentModels[1].EffortProbed = true
    initial.IntelligentModels[1].ProbedExtendedEfforts = ['max']
    mocks.get.mockResolvedValue(initial)
    useAIGlobalConfigStore.setState({ aiGlobalConfig: initial })
    await mount()
    toggle('open')
    fireEvent.mouseEnter(
      within(screen.getByRole('region', { name: 'models' })).getAllByRole('button', { name: 'YakitButton.edit' })[1],
    )
    await flush()

    const latest = { ...initial, IntelligentModels: [...initial.IntelligentModels] }
    latest.IntelligentModels[0] = {
      ...latest.IntelligentModels[0],
      EffortProbed: true,
      ProbedExtendedEfforts: ['xhigh'],
    }
    const finishProbe = () => act(() => useAIGlobalConfigStore.getState().setAIGlobalConfig(latest))
    if (probeFirst) finishProbe()
    fireEvent.click(screen.getByText('model-renamed'))
    if (!probeFirst) finishProbe()
    toggle('close')
    await flush()

    const saved = mocks.save.mock.calls[0][0]
    expect(saved.IntelligentModels[0]).toEqual(latest.IntelligentModels[0])
    expect(saved.IntelligentModels[1].ModelName).toBe('model-renamed')
    expect(saved.IntelligentModels[1].EffortProbed).toBeUndefined()
    expect(saved.IntelligentModels[1].ProbedExtendedEfforts).toBeUndefined()
  })

  it('保留未保存选择时，同步探测结果的回滚', async () => {
    await mount()
    toggle('open')
    select('model-b')
    const probed = configA()
    probed.IntelligentModels[0].EffortProbed = true
    probed.IntelligentModels[0].ProbedExtendedEfforts = ['xhigh']
    act(() => useAIGlobalConfigStore.getState().setAIGlobalConfig(probed))
    act(() => useAIGlobalConfigStore.getState().setAIGlobalConfig(configA()))
    toggle('close')
    await flush()

    expectModel('model-b')
    const savedA = mocks.save.mock.calls[0][0].IntelligentModels[1]
    expect(savedA.EffortProbed).toBeUndefined()
    expect(savedA.ProbedExtendedEfforts).toBeUndefined()
  })

  it('编辑浮层打开后模型被刷新删除，清空过期浮层', async () => {
    await mount()
    toggle('open')
    fireEvent.mouseEnter(
      within(screen.getByRole('region', { name: 'models' })).getAllByRole('button', { name: 'YakitButton.edit' })[2],
    )
    await flush()
    const latest = configA()
    latest.IntelligentModels.pop()
    act(() => useAIGlobalConfigStore.getState().setAIGlobalConfig(latest))
    expect(screen.queryByText('model-renamed')).not.toBeInTheDocument()
    toggle('close')
    await flush()

    expect(mocks.save).not.toHaveBeenCalled()
    expect(useAIGlobalConfigStore.getState().aiGlobalConfig).toEqual(latest)
  })

  it('刷新失败保留当前模型，后续刷新仍可重试', async () => {
    await mount()
    const readsBeforeRefresh = mocks.get.mock.calls.length
    const availabilityBeforeRefresh = mocks.load.mock.calls.length
    mocks.get.mockRejectedValueOnce(new Error('config refresh failed'))
    mocks.load.mockRejectedValueOnce(new Error('availability refresh failed'))

    act(() => emiter.emit('onRefreshAvailableAIModelList'))
    await flush()
    expectModel('model-a')
    expect(mocks.save).not.toHaveBeenCalled()

    act(() => emiter.emit('onRefreshAvailableAIModelList'))
    await flush()
    expect(mocks.get).toHaveBeenCalledTimes(readsBeforeRefresh + 2)
    expect(mocks.load).toHaveBeenCalledTimes(availabilityBeforeRefresh + 2)
    expectModel('model-a')
  })

  it.each([false, true])('旧刷新 A 晚到不会回退保存 B（保存先完成：%s）', async (savedFirst) => {
    await mount()
    const refresh = deferred<AIGlobalConfig>()
    const availability = deferred<void>()
    const save = deferred<void>()
    mocks.get.mockReturnValueOnce(refresh.promise)
    mocks.load.mockImplementationOnce(({ haveDataCall }) =>
      availability.promise.then(() => haveDataCall?.(availableA())),
    )
    const readsBeforeRefresh = mocks.get.mock.calls.length
    act(() => emiter.emit('onRefreshAvailableAIModelList'))
    await flush()
    expect(mocks.get).toHaveBeenCalledTimes(readsBeforeRefresh + 1)
    toggle('open')
    select('model-b')
    mocks.save.mockReturnValueOnce(save.promise)
    toggle('close')
    await flush()
    expect(mocks.save).toHaveBeenCalledTimes(1)
    if (savedFirst) await act(async () => save.resolve())
    await act(async () => {
      refresh.resolve(configA())
      availability.resolve()
    })
    if (!savedFirst) await act(async () => save.resolve())
    await flush()
    expectModel('model-b')
    toggle('open')
    toggle('close')
    await flush()
    expect(mocks.save).toHaveBeenCalledTimes(1)
    expect(mocks.save.mock.calls[0][0].IntelligentModels[0].ModelName).toBe('model-b')
  })

  it('保存 B 失败回读 A 后，pill 和 store 同步且再次开关不重试 B', async () => {
    await mount()
    const recovery = deferred<AIGlobalConfig>()
    mocks.get.mockReturnValueOnce(recovery.promise)
    mocks.save.mockRejectedValueOnce(new Error('save failed'))
    toggle('open')
    select('model-b')
    toggle('close')
    await flush()
    expectModel('model-b')
    await act(async () => recovery.resolve(configA()))
    await flush()
    expectModel('model-a')
    toggle('open')
    toggle('close')
    await flush()
    expect(mocks.save).toHaveBeenCalledTimes(1)
  })

  it('失败回读 A 不覆盖重新打开后的草稿 C，关闭后保存 C', async () => {
    await mount()
    const recovery = deferred<AIGlobalConfig>()
    mocks.get.mockReturnValueOnce(recovery.promise)
    mocks.save.mockRejectedValueOnce(new Error('save failed'))
    toggle('open')
    select('model-b')
    toggle('close')
    await flush()
    toggle('open')
    select('model-c')
    await act(async () => recovery.resolve(configA()))
    await flush()
    expect(screen.getByTestId('model-pill')).toHaveTextContent('model-c')
    expect(screen.getByTestId('store-consumer')).toHaveTextContent('model-a')
    toggle('close')
    await flush()
    expect(mocks.save).toHaveBeenCalledTimes(2)
    expect(mocks.save.mock.calls[1][0].IntelligentModels[0].ModelName).toBe('model-c')
    expectModel('model-c')
  })
})
