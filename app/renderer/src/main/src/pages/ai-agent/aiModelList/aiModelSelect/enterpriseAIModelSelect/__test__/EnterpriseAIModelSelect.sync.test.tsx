import type React from 'react'
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EnterpriseAIModelSelect } from '../EnterpriseAIModelSelect'
import { defaultAIGlobalConfig } from '../../../../defaultConstant'
import type { AIGlobalConfig } from '../../../utils'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import emiter from '@/utils/eventBus/eventBus'
import useAIGlobalConfig from '@/pages/ai-re-act/hooks/useAIGlobalConfig'

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
  it('连续两次改名保存均失败后释放旧名称关系，新增旧同名条目不会丢失第三次改名', async () => {
    const initial = configA()
    await mount()
    const firstSave = deferred<void>()
    const secondSave = deferred<void>()
    const recovery = deferred<AIGlobalConfig>()
    mocks.save.mockReturnValueOnce(firstSave.promise).mockReturnValueOnce(secondSave.promise)
    mocks.get.mockReturnValueOnce(recovery.promise)
    const names = ['model-renamed', 'model-renamed-again', 'model-final']
    for (const [index, name] of names.entries()) {
      mocks.names.mockResolvedValue({ ModelName: [name] })
      toggle('open')
      fireEvent.mouseEnter(
        within(screen.getByRole('region', { name: 'models' })).getAllByRole('button', { name: 'YakitButton.edit' })[0],
      )
      await flush()
      fireEvent.click(screen.getByText(name))
      if (index < names.length - 1) {
        toggle('close')
        await flush()
      }
    }
    await act(async () => firstSave.reject(new Error('first save failed')))
    await flush()
    await act(async () => secondSave.reject(new Error('second save failed')))
    await flush()
    await act(async () => recovery.resolve(initial))
    await flush()
    const latest = structuredClone(initial)
    latest.IntelligentModels.push({ ...initial.IntelligentModels[0], ModelName: 'model-renamed' })
    act(() => useAIGlobalConfigStore.getState().setAIGlobalConfig(latest))
    toggle('close')
    await flush()

    expect(mocks.save).toHaveBeenCalledTimes(3)
    expect(mocks.save.mock.calls[2][0]).toEqual({
      ...latest,
      IntelligentModels: [
        { ...latest.IntelligentModels[0], ModelName: 'model-final' },
        ...latest.IntelligentModels.slice(1),
      ],
    })
  })

  it('同一行连续改名时首次保存成功，第二次保存完整配置保留最终名称', async () => {
    const initial = configA()
    await mount()
    const save = deferred<void>()
    mocks.save.mockReturnValueOnce(save.promise)
    toggle('open')
    fireEvent.mouseEnter(
      within(screen.getByRole('region', { name: 'models' })).getAllByRole('button', { name: 'YakitButton.edit' })[0],
    )
    await flush()
    fireEvent.click(screen.getByText('model-renamed'))
    toggle('close')
    await flush()
    expect(mocks.save.mock.calls[0][0]).toEqual({
      ...initial,
      IntelligentModels: [
        { ...initial.IntelligentModels[0], ModelName: 'model-renamed' },
        ...initial.IntelligentModels.slice(1),
      ],
    })

    mocks.names.mockResolvedValue({ ModelName: ['model-renamed-again'] })
    toggle('open')
    fireEvent.mouseEnter(
      within(screen.getByRole('region', { name: 'models' })).getAllByRole('button', { name: 'YakitButton.edit' })[0],
    )
    await flush()
    fireEvent.click(screen.getByText('model-renamed-again'))
    await act(async () => save.resolve())
    await flush()
    toggle('close')
    await flush()

    expect(mocks.save).toHaveBeenCalledTimes(2)
    expect(mocks.save.mock.calls[1][0]).toEqual({
      ...initial,
      IntelligentModels: [
        { ...initial.IntelligentModels[0], ModelName: 'model-renamed-again' },
        ...initial.IntelligentModels.slice(1),
      ],
    })
  })

  it('首次重名保存成功时，重新打开编辑原同名条目仍保留正确的完整配置', async () => {
    const initial = configA()
    initial.IntelligentModels.forEach((model, index) => {
      model.ProviderId = 'shared-provider'
      model.ExtraParams = [{ Key: 'entry', Value: String(index) }]
    })
    initial.IntelligentModels[0].Provider.ReasoningEffort = 'low'
    initial.IntelligentModels[1].Provider.ReasoningEffort = 'high'
    mocks.get.mockResolvedValue(initial)
    mocks.names.mockResolvedValue({ ModelName: ['model-b'] })
    useAIGlobalConfigStore.setState({ aiGlobalConfig: initial })
    await mount()
    const save = deferred<void>()
    mocks.save.mockReturnValueOnce(save.promise)
    toggle('open')
    fireEvent.mouseEnter(
      within(screen.getByRole('region', { name: 'models' })).getAllByRole('button', { name: 'YakitButton.edit' })[0],
    )
    await flush()
    fireEvent.click(
      screen
        .getAllByText('model-b')
        .find((element) => !screen.getByRole('region', { name: 'models' }).contains(element))!,
    )
    toggle('close')
    await flush()
    const firstSave = {
      ...initial,
      IntelligentModels: [
        { ...initial.IntelligentModels[0], ModelName: 'model-b' },
        ...initial.IntelligentModels.slice(1),
      ],
    }
    expect(mocks.save.mock.calls[0][0]).toEqual(firstSave)

    mocks.names.mockResolvedValue({ ModelName: ['model-renamed-again'] })
    toggle('open')
    fireEvent.mouseEnter(
      within(screen.getByRole('region', { name: 'models' })).getAllByRole('button', { name: 'YakitButton.edit' })[1],
    )
    await flush()
    fireEvent.click(screen.getByText('model-renamed-again'))
    select('model-renamed-again')
    await act(async () => save.resolve())
    await flush()
    const latest = structuredClone(firstSave)
    latest.IntelligentModels[0].EffortProbed = true
    latest.IntelligentModels[0].ProbedExtendedEfforts = ['max']
    act(() => useAIGlobalConfigStore.getState().setAIGlobalConfig(latest))
    toggle('close')
    await flush()

    expect(mocks.save).toHaveBeenCalledTimes(2)
    expect(mocks.save.mock.calls[1][0]).toEqual({
      ...latest,
      IntelligentModels: [
        { ...latest.IntelligentModels[1], ModelName: 'model-renamed-again' },
        latest.IntelligentModels[0],
        latest.IntelligentModels[2],
      ],
    })
  })

  it('待编辑模型被删除后新增同名模型，不重放已删除条目的改名和选择', async () => {
    const initial = configA()
    await mount()
    toggle('open')
    fireEvent.mouseEnter(
      within(screen.getByRole('region', { name: 'models' })).getAllByRole('button', { name: 'YakitButton.edit' })[1],
    )
    await flush()
    fireEvent.click(screen.getByText('model-renamed'))
    select('model-renamed')
    const removed = { ...initial, IntelligentModels: [initial.IntelligentModels[0], initial.IntelligentModels[2]] }
    act(() => useAIGlobalConfigStore.getState().setAIGlobalConfig(removed))
    const latest = structuredClone(initial)
    latest.IntelligentModels[1].Provider.ReasoningEffort = 'high'
    latest.IntelligentModels[1].ExtraParams = [{ Key: 'entry', Value: 'new-model' }]
    act(() => useAIGlobalConfigStore.getState().setAIGlobalConfig(latest))
    toggle('close')
    await flush()

    expect(mocks.save).not.toHaveBeenCalled()
    expect(useAIGlobalConfigStore.getState().aiGlobalConfig).toEqual(latest)
    expectModel('model-a')
  })

  it('初始同厂商同名条目按配置区分，选择第二条后探测更新仍保存该条目', async () => {
    const initial = configA()
    initial.IntelligentModels.forEach((model, index) => {
      model.ProviderId = 'shared-provider'
      model.ExtraParams = [{ Key: 'entry', Value: String(index) }]
    })
    initial.IntelligentModels[1].ModelName = 'model-a'
    initial.IntelligentModels[0].Provider.ReasoningEffort = 'low'
    initial.IntelligentModels[1].Provider.ReasoningEffort = 'high'
    mocks.get.mockResolvedValue(initial)
    useAIGlobalConfigStore.setState({ aiGlobalConfig: initial })
    await mount()
    toggle('open')
    fireEvent.click(within(screen.getByRole('region', { name: 'models' })).getAllByText('model-a')[1])
    const latest = structuredClone(initial)
    latest.IntelligentModels[1].EffortProbed = true
    latest.IntelligentModels[1].ProbedExtendedEfforts = ['max']
    act(() => useAIGlobalConfigStore.getState().setAIGlobalConfig(latest))
    toggle('close')
    await flush()

    expect(mocks.save).toHaveBeenCalledTimes(1)
    expect(mocks.save.mock.calls[0][0]).toEqual({
      ...latest,
      IntelligentModels: [latest.IntelligentModels[1], latest.IntelligentModels[0], latest.IntelligentModels[2]],
    })
  })

  it.each([1, 2])('同厂商改成已有名称后选择原条目，后台更新 %s 次仍保存正确条目和完整字段', async (updates) => {
    const initial = configA()
    initial.IntelligentModels.forEach((model, index) => {
      model.ProviderId = 'shared-provider'
      model.ExtraParams = [{ Key: 'entry', Value: String(index) }]
    })
    initial.IntelligentModels[0].Provider.ReasoningEffort = 'low'
    initial.IntelligentModels[1].Provider.ReasoningEffort = 'high'
    mocks.get.mockResolvedValue(initial)
    mocks.names.mockResolvedValue({ ModelName: ['model-b'] })
    useAIGlobalConfigStore.setState({ aiGlobalConfig: initial })
    await mount()
    toggle('open')
    fireEvent.mouseEnter(
      within(screen.getByRole('region', { name: 'models' })).getAllByRole('button', { name: 'YakitButton.edit' })[0],
    )
    await flush()
    // 名称选项在 portal 中，主列表中的同名项仍是第二行。
    fireEvent.click(
      screen
        .getAllByText('model-b')
        .find((element) => !screen.getByRole('region', { name: 'models' }).contains(element))!,
    )
    fireEvent.click(within(screen.getByRole('region', { name: 'models' })).getAllByText('model-b')[1])

    let latest = structuredClone(initial)
    for (let index = 0; index < updates; index++) {
      latest = structuredClone(initial)
      latest.IntelligentModels[1].EffortProbed = true
      latest.IntelligentModels[1].ProbedExtendedEfforts = index === 0 ? ['xhigh'] : ['max']
      act(() => useAIGlobalConfigStore.getState().setAIGlobalConfig(latest))
    }
    toggle('close')
    await flush()

    expect(mocks.save).toHaveBeenCalledTimes(1)
    expect(mocks.save.mock.calls[0][0]).toEqual({
      ...latest,
      IntelligentModels: [
        latest.IntelligentModels[1],
        { ...latest.IntelligentModels[0], ModelName: 'model-b' },
        latest.IntelligentModels[2],
      ],
    })
  })

  it.each([false, true])('连续改名跨首次保存失败回读，保留第二次名称及完整字段（同厂商：%s）', async (sameProvider) => {
    const initial = configA()
    if (sameProvider)
      initial.IntelligentModels.forEach((model) => {
        model.ProviderId = 'shared-provider'
      })
    initial.IntelligentModels[0].Provider.ReasoningEffort = 'low'
    initial.IntelligentModels[0].ExtraParams = [{ Key: 'entry', Value: 'original-a' }]
    mocks.get.mockResolvedValue(initial)
    useAIGlobalConfigStore.setState({ aiGlobalConfig: initial })
    await mount()
    const save = deferred<void>()
    const recovery = deferred<AIGlobalConfig>()
    mocks.save.mockReturnValueOnce(save.promise)
    mocks.get.mockReturnValueOnce(recovery.promise)
    toggle('open')
    fireEvent.mouseEnter(
      within(screen.getByRole('region', { name: 'models' })).getAllByRole('button', { name: 'YakitButton.edit' })[0],
    )
    await flush()
    fireEvent.click(screen.getByText('model-renamed'))
    toggle('close')
    await flush()

    mocks.names.mockResolvedValue({ ModelName: ['model-renamed-again'] })
    toggle('open')
    fireEvent.mouseEnter(
      within(screen.getByRole('region', { name: 'models' })).getAllByRole('button', { name: 'YakitButton.edit' })[0],
    )
    await flush()
    fireEvent.click(screen.getByText('model-renamed-again'))
    await act(async () => save.reject(new Error('save failed')))
    await flush()
    await act(async () => recovery.resolve(initial))
    await flush()
    toggle('close')
    await flush()

    expect(mocks.save).toHaveBeenCalledTimes(2)
    expect(mocks.save.mock.calls[1][0]).toEqual({
      ...initial,
      IntelligentModels: [
        { ...initial.IntelligentModels[0], ModelName: 'model-renamed-again' },
        ...initial.IntelligentModels.slice(1),
      ],
    })
  })

  it.each([false, true])(
    '思考强度延迟保存失败后，新选择和改名保留且完整配置使用回读值（同厂商：%s）',
    async (sameProvider) => {
      const initial = configA()
      initial.IntelligentModels[0].Provider.ReasoningEffort = 'low'
      if (sameProvider)
        initial.IntelligentModels.forEach((model) => {
          model.ProviderId = 'shared-provider'
        })
      mocks.get.mockResolvedValue(initial)
      useAIGlobalConfigStore.setState({ aiGlobalConfig: initial })
      await mount()
      const { result } = renderHook(() => useAIGlobalConfig())
      await flush()
      const save = deferred<void>()
      const recovery = deferred<AIGlobalConfig>()
      mocks.save.mockReturnValueOnce(save.promise)
      mocks.get.mockReturnValueOnce(recovery.promise)
      const optimistic = structuredClone(initial)
      optimistic.IntelligentModels[0].Provider.ReasoningEffort = 'high'
      act(() => {
        void result.current[1].setAIGlobalConfig(optimistic).catch(() => undefined)
      })
      await flush()
      toggle('open')
      select('model-b')
      fireEvent.mouseEnter(
        within(screen.getByRole('region', { name: 'models' })).getAllByRole('button', { name: 'YakitButton.edit' })[0],
      )
      await flush()
      fireEvent.click(screen.getByText('model-renamed'))
      await act(async () => save.reject(new Error('save failed')))
      await flush()
      await act(async () => recovery.resolve(initial))
      await flush()
      toggle('close')
      await flush()

      expect(mocks.save).toHaveBeenCalledTimes(2)
      expect(mocks.save.mock.calls[1][0]).toEqual({
        ...initial,
        IntelligentModels: [
          { ...initial.IntelligentModels[1], ModelName: 'model-renamed' },
          initial.IntelligentModels[0],
          initial.IntelligentModels[2],
        ],
      })
    },
  )

  it.each([false, true])('改名延迟保存失败后，保留新选择且不再次提交失败名称（同厂商：%s）', async (sameProvider) => {
    const initial = configA()
    if (sameProvider)
      initial.IntelligentModels.forEach((model) => {
        model.ProviderId = 'shared-provider'
      })
    mocks.get.mockResolvedValue(initial)
    useAIGlobalConfigStore.setState({ aiGlobalConfig: initial })
    await mount()
    const save = deferred<void>()
    const recovery = deferred<AIGlobalConfig>()
    mocks.save.mockReturnValueOnce(save.promise)
    mocks.get.mockReturnValueOnce(recovery.promise)
    toggle('open')
    fireEvent.mouseEnter(
      within(screen.getByRole('region', { name: 'models' })).getAllByRole('button', { name: 'YakitButton.edit' })[0],
    )
    await flush()
    fireEvent.click(screen.getByText('model-renamed'))
    toggle('close')
    await flush()
    toggle('open')
    select('model-b')
    await act(async () => save.reject(new Error('save failed')))
    await flush()
    await act(async () => recovery.resolve(initial))
    await flush()
    toggle('close')
    await flush()

    expect(mocks.save).toHaveBeenCalledTimes(2)
    expect(mocks.save.mock.calls[1][0]).toEqual({
      ...initial,
      IntelligentModels: [initial.IntelligentModels[1], initial.IntelligentModels[0], initial.IntelligentModels[2]],
    })
  })

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
    const latest = configA()
    expect(mocks.save.mock.calls[1][0]).toEqual({
      ...latest,
      IntelligentModels: [latest.IntelligentModels[2], latest.IntelligentModels[0], latest.IntelligentModels[1]],
    })
    expectModel('model-c')
  })
})
