import { describe, expect, it, vi } from 'vitest'
// 先于 utils/index 注册 electron stub：index 会拉 ChatMultiSessionController / yakRunner.utils，顶层 window.require('electron')
import '../../../ai-re-act/hooks/__test__/setupElectron'
// 导入链会经过 aiGlobalLoading → lottie-web，模块加载期探测 canvas，jsdom 不支持
vi.mock('lottie-web', () => ({ default: vi.fn() }))
import { formatAIAgentSetting, formatNumberUnits } from '..'
import { AIAgentSettingDefault } from '../../defaultConstant'

describe('formatAIAgentSetting', () => {
  it('SingleModelMode 缺字段时回退默认 false，并保留显式 true', () => {
    const { SingleModelMode: _omit, ...rest } = AIAgentSettingDefault
    expect(formatAIAgentSetting(rest).SingleModelMode).toBe(false)
    expect(formatAIAgentSetting({ ...AIAgentSettingDefault, SingleModelMode: true }).SingleModelMode).toBe(true)
  })

  it('DisableMemoryTriage 缺字段时回退默认 false，避免旧缓存漏传', () => {
    const { DisableMemoryTriage: _omit, ...rest } = AIAgentSettingDefault
    const result = formatAIAgentSetting(rest)
    expect(result.DisableMemoryTriage).toBe(AIAgentSettingDefault.DisableMemoryTriage)
    expect(result.DisableMemoryTriage).toBe(false)
  })

  it('DisableMemoryTriage 显式 true 原样透传到请求参数', () => {
    const result = formatAIAgentSetting({ ...AIAgentSettingDefault, DisableMemoryTriage: true })
    expect(result.DisableMemoryTriage).toBe(true)
  })

  it('DisableMemoryTriage 显式 false 不被默认值改写', () => {
    const result = formatAIAgentSetting({ ...AIAgentSettingDefault, DisableMemoryTriage: false })
    expect(result.DisableMemoryTriage).toBe(false)
  })

  it('Strategy.GoalMinIterations 缺字段时回退默认 0', () => {
    const result = formatAIAgentSetting({
      ...AIAgentSettingDefault,
      Strategy: { EnableGoalMode: true },
    })
    expect(result.Strategy?.GoalMinIterations).toBe(AIAgentSettingDefault.Strategy?.GoalMinIterations)
    expect(result.Strategy?.GoalMinIterations).toBe(0)
  })

  it('Strategy.GoalMinIterations 显式值原样透传', () => {
    const result = formatAIAgentSetting({
      ...AIAgentSettingDefault,
      Strategy: { ...AIAgentSettingDefault.Strategy, GoalMinIterations: 5 },
    })
    expect(result.Strategy?.GoalMinIterations).toBe(5)
  })

  it('Strategy.GoalDurationSeconds 缺字段时回落默认 0', () => {
    const result = formatAIAgentSetting({
      ...AIAgentSettingDefault,
      Strategy: { EnableGoalMode: true },
    })
    expect(result.Strategy?.GoalDurationSeconds).toBe(AIAgentSettingDefault.Strategy?.GoalDurationSeconds)
    expect(result.Strategy?.GoalDurationSeconds).toBe(0)
  })

  it('Strategy.GoalAcceptanceCriteria 缺字段时回落默认空串', () => {
    const result = formatAIAgentSetting({
      ...AIAgentSettingDefault,
      Strategy: { EnableGoalMode: true },
    })
    expect(result.Strategy?.GoalAcceptanceCriteria).toBe(AIAgentSettingDefault.Strategy?.GoalAcceptanceCriteria)
    expect(result.Strategy?.GoalAcceptanceCriteria).toBe('')
  })

  it('Strategy.GoalDurationSeconds / GoalAcceptanceCriteria 显式值原样透传', () => {
    const result = formatAIAgentSetting({
      ...AIAgentSettingDefault,
      Strategy: {
        ...AIAgentSettingDefault.Strategy,
        GoalDurationSeconds: 3600,
        GoalAcceptanceCriteria: '接口 200',
      },
    })
    expect(result.Strategy?.GoalDurationSeconds).toBe(3600)
    expect(result.Strategy?.GoalAcceptanceCriteria).toBe('接口 200')
  })

  it('新会话忽略旧的全局上下文默认值，交由后端恢复模型阈值', () => {
    const result = formatAIAgentSetting({
      ...AIAgentSettingDefault,
      TimelineContentSizeLimit: 60,
      RuntimeContextSizeLimit: 300,
    })
    expect(result).not.toHaveProperty('TimelineContentSizeLimit')
    // 0 表示恢复模型记录，不把旧的全局 300K 写给每个会话
    expect(result.RuntimeContextSizeLimit).toBe(0)
  })

  it('运行时上下文留空时不覆盖服务端默认阈值', () => {
    const { RuntimeContextSizeLimit: _omit, ...rest } = AIAgentSettingDefault
    expect(formatAIAgentSetting(rest).RuntimeContextSizeLimit).toBe(0)
    expect(formatAIAgentSetting({ ...AIAgentSettingDefault, RuntimeContextSizeLimit: 0 }).RuntimeContextSizeLimit).toBe(
      0,
    )
  })
})

// The same formatter feeds token totals, pressure labels and chart tooltips.
describe('decimal token display', () => {
  it.each([
    [999, '999'],
    [1000, '1.0K'],
    [1024, '1.0K'],
    [100000, '100.0K'],
    [512000, '512.0K'],
    [999999, '1.0M'],
    [1000000, '1.0M'],
    [1500000, '1.5M'],
  ])('formats %i tokens as %s', (tokens, label) => {
    expect(formatNumberUnits(tokens)).toBe(label)
  })

  it('keeps byte statistics on their existing binary scale', () => {
    expect(formatNumberUnits(1000, 1024)).toBe('1000')
    expect(formatNumberUnits(102400, 1024)).toBe('100.0K')
    expect(formatNumberUnits(1048576, 1024)).toBe('1.0M')
  })
})
