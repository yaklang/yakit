import { describe, expect, it, vi } from 'vitest'
// 先于 utils/index 注册 electron stub：index 会拉 ChatMultiSessionController / yakRunner.utils，顶层 window.require('electron')
import '../../../ai-re-act/hooks/__test__/setupElectron'
// 导入链会经过 aiGlobalLoading → lottie-web，模块加载期探测 canvas，jsdom 不支持
vi.mock('lottie-web', () => ({ default: vi.fn() }))
import { formatAIAgentSetting } from '..'
import { AIAgentSettingDefault } from '../../defaultConstant'

describe('formatAIAgentSetting', () => {
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
})
