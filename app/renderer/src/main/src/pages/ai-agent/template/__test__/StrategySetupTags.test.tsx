import { cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    useAIRunMode: vi.fn(),
    requestModeSlashReopen: vi.fn(),
  },
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
    i18nRefresh: 0,
  }),
}))

vi.mock('../../aiRunModeSelect/useAIRunMode', () => ({
  useAIRunMode: () => mocks.useAIRunMode(),
}))

vi.mock('../../components/aiMilkdownInput/aiMilkdownModeSlash/store', async () => {
  const actual = await vi.importActual('../../components/aiMilkdownInput/aiMilkdownModeSlash/store')
  return {
    ...(actual as object),
    requestModeSlashReopen: mocks.requestModeSlashReopen,
  }
})

const { useStrategySetupTags } = await import('../StrategySetupTags')
const StrategySetupTags = () => <>{useStrategySetupTags()}</>

type RunMode = ReturnType<(typeof mocks)['useAIRunMode']>

function stubRunMode(partial: Partial<RunMode> & { strategy?: RunMode['strategy'] }) {
  const onSetStrategy = vi.fn()
  mocks.useAIRunMode.mockReturnValue({
    enableMultiAgent: false,
    enableGoalMode: false,
    goalMinIterations: 0,
    maxSubAgents: 0,
    strategy: undefined,
    onSetStrategy,
    ...partial,
  })
  return { onSetStrategy }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('StrategySetupTags', () => {
  beforeEach(() => {
    stubRunMode({})
  })

  it('最小迭代标签点击 → reopen goalIterations payload', () => {
    stubRunMode({
      enableGoalMode: true,
      goalMinIterations: 3,
      strategy: {
        EnableGoalMode: true,
        GoalMinIterations: 3,
        GoalDurationSeconds: 0,
        GoalAcceptanceCriteria: '',
      },
    })
    render(<StrategySetupTags />)
    const button = screen.getAllByRole('button')[0]
    fireEvent.click(button)
    expect(mocks.requestModeSlashReopen).toHaveBeenCalledWith(button, {
      kind: 'goalIterations',
      iterations: 3,
    })
  })

  it('未知时长 7200 标签点击 → reopen 保留 durationKey', () => {
    stubRunMode({
      enableGoalMode: true,
      strategy: {
        EnableGoalMode: true,
        GoalMinIterations: 0,
        GoalDurationSeconds: 7200,
        GoalAcceptanceCriteria: '',
      },
    })
    render(<StrategySetupTags />)
    const button = screen.getAllByRole('button')[0]
    fireEvent.click(button)
    expect(mocks.requestModeSlashReopen).toHaveBeenCalledWith(button, {
      kind: 'goalDuration',
      durationKey: '7200',
    })
  })

  it('验收条件标签点击 → reopen goalAcceptance payload', () => {
    stubRunMode({
      enableGoalMode: true,
      strategy: {
        EnableGoalMode: true,
        GoalMinIterations: 0,
        GoalDurationSeconds: 0,
        GoalAcceptanceCriteria: '接口 200',
      },
    })
    render(<StrategySetupTags />)
    const button = screen.getAllByRole('button')[0]
    fireEvent.click(button)
    expect(mocks.requestModeSlashReopen).toHaveBeenCalledWith(button, {
      kind: 'goalAcceptance',
      text: '接口 200',
    })
  })

  it('Multi-Agent 标签点击 → reopen multiAgentConfig payload', () => {
    stubRunMode({
      enableMultiAgent: true,
      maxSubAgents: 4,
      strategy: { EnableMultiAgent: true, MaxSubAgents: 4 },
    })
    render(<StrategySetupTags />)
    const button = screen.getAllByRole('button')[0]
    fireEvent.click(button)
    expect(mocks.requestModeSlashReopen).toHaveBeenCalledWith(button, {
      kind: 'multiAgentConfig',
      subAgents: 4,
    })
  })

  it('Goal 开启但未配置三选一时，设置标签点击 → reopen goalModes', () => {
    stubRunMode({
      enableGoalMode: true,
      strategy: {
        EnableGoalMode: true,
        GoalMinIterations: 0,
        GoalDurationSeconds: 0,
        GoalAcceptanceCriteria: '',
      },
    })
    render(<StrategySetupTags />)
    const button = screen.getAllByRole('button')[0]
    fireEvent.click(button)
    expect(mocks.requestModeSlashReopen).toHaveBeenCalledWith(button, { kind: 'goalModes' })
  })

  it('关闭 Goal 标签会 clearGoalStrategy', () => {
    const { onSetStrategy } = stubRunMode({
      enableGoalMode: true,
      goalMinIterations: 2,
      strategy: {
        EnableGoalMode: true,
        GoalMinIterations: 2,
        GoalDurationSeconds: 0,
        GoalAcceptanceCriteria: '',
      },
    })
    render(<StrategySetupTags />)
    fireEvent.click(screen.getByRole('button', { name: /minIterationsPrefix.* ×$/ }))
    expect(onSetStrategy).toHaveBeenCalledWith(
      expect.objectContaining({
        EnableGoalMode: false,
        GoalMinIterations: 0,
        GoalDurationSeconds: 0,
        GoalAcceptanceCriteria: '',
      }),
    )
    expect(mocks.requestModeSlashReopen).not.toHaveBeenCalled()
  })

  it('关闭 Multi-Agent 标签会清 EnableMultiAgent', () => {
    const { onSetStrategy } = stubRunMode({
      enableMultiAgent: true,
      maxSubAgents: 3,
      strategy: { EnableMultiAgent: true, MaxSubAgents: 3 },
    })
    render(<StrategySetupTags />)
    fireEvent.click(screen.getByRole('button', { name: /subAgentCountPrefix.* ×$/ }))
    expect(onSetStrategy).toHaveBeenCalledWith({ EnableMultiAgent: false, MaxSubAgents: 0 })
  })
})

describe('useStrategySetupTags', () => {
  it('每个开启的策略各占一个标签', () => {
    stubRunMode({ enableGoalMode: true })
    const { result, rerender } = renderHook(useStrategySetupTags)
    expect(result.current).toHaveLength(1)

    stubRunMode({ enableMultiAgent: true, maxSubAgents: 1 })
    rerender()
    expect(result.current).toHaveLength(1)

    stubRunMode({ enableGoalMode: true, enableMultiAgent: true, maxSubAgents: 1 })
    rerender()
    expect(result.current).toHaveLength(2)

    stubRunMode({})
    rerender()
    expect(result.current).toHaveLength(0)
  })
})
