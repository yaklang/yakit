import { describe, expect, it, vi } from 'vitest'
import '../../../ai-re-act/hooks/__test__/setupElectron'

vi.mock('lottie-web', () => ({ default: vi.fn() }))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: { getSessionExecute: vi.fn(() => false) },
}))
vi.mock('@/pages/yakRunner/utils', () => ({ isYaklangScriptDeliveryPath: vi.fn() }))

import { formatAIAgentSetting, onReStart } from '..'
import type { AISession } from '../../type/aiChat'
import { AIAgentSettingDefault } from '../../defaultConstant'
import { applyForgeNameToStartParams } from '@/pages/digitalEmployee/resolver'

describe('formatAIAgentSetting runtime context', () => {
  it('enables Plan for a new conversation and when startup settings omit the mode', () => {
    expect(AIAgentSettingDefault.EnablePlan).toBe(true)
    expect(formatAIAgentSetting(AIAgentSettingDefault).EnablePlan).toBe(true)
    const { EnablePlan: _removed, ...withoutMode } = AIAgentSettingDefault
    expect(formatAIAgentSetting(withoutMode).EnablePlan).toBe(true)
  })

  it('preserves an explicitly disabled Plan in the startup request', () => {
    expect(formatAIAgentSetting({ ...AIAgentSettingDefault, EnablePlan: false }).EnablePlan).toBe(false)
  })

  it('preserves a historical conversation with Plan explicitly disabled on restart', () => {
    const onStart = vi.fn()
    const activeChat = { SessionID: 'history', StartParams: { EnablePlan: false } } as AISession
    onReStart({ activeChat, onStart })
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onStart.mock.calls[0][0].params.Params.EnablePlan).toBe(false)
  })

  it.each([
    { EnableGoalMode: true, GoalDurationSeconds: 600, GoalMinIterations: 0, GoalAcceptanceCriteria: '' },
    { EnableGoalMode: true, GoalDurationSeconds: -1, GoalMinIterations: 0, GoalAcceptanceCriteria: '' },
    { EnableGoalMode: true, GoalDurationSeconds: 0, GoalMinIterations: 0, GoalAcceptanceCriteria: 'evidence report' },
  ])('preserves Goal strategy through the employee startup path: %j', (strategy) => {
    const params = applyForgeNameToStartParams(
      formatAIAgentSetting({ ...AIAgentSettingDefault, Strategy: strategy }),
      'employee-forge',
    )
    expect(params.Strategy).toMatchObject(strategy)
    expect(params.ForgeName).toBe('employee-forge')
  })
  it('sends the default 300 KB as bytes and preserves the digital employee startup adapter', () => {
    const settings = { ...AIAgentSettingDefault, EnablePlan: true, AICallAutoRetry: 7 }
    const request = applyForgeNameToStartParams(formatAIAgentSetting(settings), 'employee-forge')
    expect(request).toMatchObject({
      ForgeName: 'employee-forge',
      RuntimeContextSizeLimit: 307200,
      EnablePlan: true,
      AICallAutoRetry: 7,
    })
    expect(request).not.toHaveProperty('TimelineContentSizeLimit')
    expect(settings.RuntimeContextSizeLimit).toBe(300)
  })

  it.each([450, '450'] as const)('converts the UI value %s KB only once', (value) => {
    const settings = { ...AIAgentSettingDefault, RuntimeContextSizeLimit: value } as typeof AIAgentSettingDefault
    expect(formatAIAgentSetting(settings).RuntimeContextSizeLimit).toBe(450 * 1024)
  })

  it.each([undefined, 0, '', -1, 'invalid', Number.MAX_SAFE_INTEGER])(
    'uses the engine default for missing or invalid UI value %s',
    (value) => {
      const settings = { ...AIAgentSettingDefault, RuntimeContextSizeLimit: value } as typeof AIAgentSettingDefault
      expect(formatAIAgentSetting(settings).RuntimeContextSizeLimit).toBe(0)
    },
  )

  it('does not reinterpret the deprecated timeline value as a runtime threshold', () => {
    const { RuntimeContextSizeLimit: _removed, ...rest } = AIAgentSettingDefault
    const settings = { ...rest, TimelineContentSizeLimit: 120, UserInteractLimit: 4 }
    const result = formatAIAgentSetting(settings)
    expect(result).not.toHaveProperty('TimelineContentSizeLimit')
    expect(result.RuntimeContextSizeLimit).toBe(0)
    expect(result.UserInteractLimit).toBe(4)
    expect(settings.TimelineContentSizeLimit).toBe(120)
  })

  it.each([
    { limit: undefined, expected: 0 },
    { limit: '307200', expected: 307200 },
    { limit: 0, expected: 0 },
  ])('restarts history with $expected bytes without leaking the UI default into the request', ({ limit, expected }) => {
    const onStart = vi.fn()
    const savedParams = {
      TimelineContentSizeLimit: 61440,
      ForgeName: 'saved-forge',
      ...(limit === undefined ? {} : { RuntimeContextSizeLimit: limit }),
    }
    const activeChat = { SessionID: 'history', StartParams: savedParams } as unknown as AISession
    onReStart({ activeChat, onStart })
    expect(onStart).toHaveBeenCalledTimes(1)
    const [{ params }] = onStart.mock.calls[0]
    expect(params.Params).toMatchObject({ RuntimeContextSizeLimit: expected, ForgeName: 'saved-forge', UserQuery: '' })
    expect(params.Params).not.toHaveProperty('TimelineContentSizeLimit')
    expect(savedParams.TimelineContentSizeLimit).toBe(61440)
  })
})
