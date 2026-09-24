import type { MouseEvent } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

vi.mock('@yakit-libs/yakit-ui-icons/outline', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    BoxesOutlined: () => <span data-testid="icon-boxes" />,
    Goal2Outlined: () => <span data-testid="icon-goal" />,
    PencilAltOutlined: (props: { onClick?: (e: MouseEvent) => void }) => (
      <button type="button" aria-label="edit-tag" onClick={props.onClick} />
    ),
  }
})

vi.mock('@yakit-libs/yakit-ui-icons/solid', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    XCircleSolid: () => <span data-testid="icon-close" />,
  }
})

const { StrategySetupTags, useHasStrategySetupTags } = await import('../StrategySetupTags')

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
    fireEvent.click(screen.getByLabelText('edit-tag'))
    expect(mocks.requestModeSlashReopen).toHaveBeenCalledWith({
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
    fireEvent.click(screen.getByLabelText('edit-tag'))
    expect(mocks.requestModeSlashReopen).toHaveBeenCalledWith({
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
    fireEvent.click(screen.getByLabelText('edit-tag'))
    expect(mocks.requestModeSlashReopen).toHaveBeenCalledWith({
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
    fireEvent.click(screen.getByLabelText('edit-tag'))
    expect(mocks.requestModeSlashReopen).toHaveBeenCalledWith({
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
    fireEvent.click(screen.getByLabelText('edit-tag'))
    expect(mocks.requestModeSlashReopen).toHaveBeenCalledWith({ kind: 'goalModes' })
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
    const label = screen.getByTitle(/minIterationsPrefix/)
    const leading = label.parentElement!.firstElementChild!
    fireEvent.click(leading)
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
    const label = screen.getByTitle(/subAgentCountPrefix/)
    const leading = label.parentElement!.firstElementChild!
    fireEvent.click(leading)
    expect(onSetStrategy).toHaveBeenCalledWith({ EnableMultiAgent: false, MaxSubAgents: 0 })
  })
})

describe('useHasStrategySetupTags', () => {
  it('Goal / Multi-Agent 任一开启则 true', async () => {
    const { renderHook } = await import('@testing-library/react')
    stubRunMode({ enableGoalMode: true })
    const { result, rerender } = renderHook(() => useHasStrategySetupTags())
    expect(result.current).toBe(true)

    stubRunMode({ enableMultiAgent: true, maxSubAgents: 1 })
    rerender()
    expect(result.current).toBe(true)

    stubRunMode({})
    rerender()
    expect(result.current).toBe(false)
  })
})
