import type React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import emiter from '@/utils/eventBus/eventBus'
import { AIReasoningEffortSelect } from '../AIReasoningEffortSelect'

const mocks = vi.hoisted(() => ({
  config: {
    Enabled: true,
    IntelligentModels: [
      {
        ProviderId: 'provider-1',
        ModelName: 'model-1',
        Provider: { Type: 'openai', APIKey: 'test-key', ReasoningEffort: 'low' },
        ExtraParams: [],
        EffortProbed: true,
      },
      {
        ProviderId: 'provider-2',
        ModelName: 'model-2',
        Provider: { Type: 'openai', APIKey: 'other-key', ReasoningEffort: 'medium' },
        ExtraParams: [],
        EffortProbed: true,
      },
    ],
  },
  save: vi.fn(),
  probe: vi.fn(),
}))

vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({
  default: () => [{ aiGlobalConfig: mocks.config }, { setAIGlobalConfig: mocks.save }],
}))
vi.mock('@/pages/ai-agent/aiModelList/utils', () => ({ grpcProbeReasoningEffort: mocks.probe }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))
vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({
  BrainOutlined: () => null,
  QuestionMarkCircleOutlined: () => null,
}))
vi.mock('@/components/yakitUI/YakitSolidLoading/YakitSolidLoading', () => ({ default: () => null }))
vi.mock('antd', () => ({ Tooltip: ({ children }: React.PropsWithChildren) => children }))
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', () => ({
  YakitSelect: {
    Option: ({ value }: { value: string }) => <option value={value}>{value}</option>,
  },
}))
vi.mock('../../aiReviewRuleSelect/AIReviewRuleSelect', () => ({
  AIChatSelect: ({
    value,
    onSelect,
    children,
  }: React.PropsWithChildren<{
    value: string
    onSelect: (value: string) => void
  }>) => (
    <select aria-label="Reasoning effort" value={value} onChange={(event) => onSelect(event.target.value)}>
      {children}
    </select>
  ),
}))

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('AIReasoningEffortSelect 保存完成刷新事件', () => {
  const onRefresh = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mocks.config.IntelligentModels[0].EffortProbed = true
    emiter.on('onRefreshAvailableAIModelList', onRefresh)
  })

  afterEach(() => {
    cleanup()
    emiter.off('onRefreshAvailableAIModelList', onRefresh)
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it.each(['success', 'failure'] as const)('手动更改：保存等待中不刷新，%s 后按结果通知', async (outcome) => {
    const save = deferred<void>()
    mocks.save.mockReturnValueOnce(save.promise)
    render(<AIReasoningEffortSelect />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Reasoning effort' }), { target: { value: 'high' } })
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith({
      ...mocks.config,
      IntelligentModels: [
        {
          ...mocks.config.IntelligentModels[0],
          Provider: { ...mocks.config.IntelligentModels[0].Provider, ReasoningEffort: 'high' },
        },
        mocks.config.IntelligentModels[1],
      ],
    })
    await act(async () => {})
    expect(onRefresh).not.toHaveBeenCalled()
    expect(mocks.probe).not.toHaveBeenCalled()

    await act(async () => {
      if (outcome === 'success') save.resolve()
      else save.reject(new Error('save failed'))
    })
    expect(onRefresh).toHaveBeenCalledTimes(outcome === 'success' ? 1 : 0)
    expect(mocks.config.IntelligentModels[0].Provider.ReasoningEffort).toBe('low')
  })

  it.each(['success', 'failure'] as const)('自动探测：结果保存等待中不刷新，%s 后按结果通知', async (outcome) => {
    mocks.config.IntelligentModels[0].EffortProbed = false
    const save = deferred<void>()
    const probe = deferred<{ XhighSupported: boolean; MaxSupported: boolean }>()
    mocks.save.mockReturnValueOnce(save.promise)
    mocks.probe.mockReturnValueOnce(probe.promise)
    render(<AIReasoningEffortSelect />)

    expect(mocks.probe).toHaveBeenCalledExactlyOnceWith({
      Config: mocks.config.IntelligentModels[0].Provider,
      Model: 'model-1',
    })
    expect(mocks.save).not.toHaveBeenCalled()
    expect(onRefresh).not.toHaveBeenCalled()
    await act(async () => {
      probe.resolve({ XhighSupported: true, MaxSupported: true })
    })
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith({
      ...mocks.config,
      IntelligentModels: [
        { ...mocks.config.IntelligentModels[0], EffortProbed: true, ProbedExtendedEfforts: ['xhigh', 'max'] },
        mocks.config.IntelligentModels[1],
      ],
    })
    expect(onRefresh).not.toHaveBeenCalled()

    await act(async () => {
      if (outcome === 'success') save.resolve()
      else save.reject(new Error('save failed'))
    })
    expect(onRefresh).toHaveBeenCalledTimes(outcome === 'success' ? 1 : 0)
    expect(mocks.config.IntelligentModels[0].EffortProbed).toBe(false)
  })
})
