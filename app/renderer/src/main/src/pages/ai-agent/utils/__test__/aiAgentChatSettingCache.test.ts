import { describe, expect, it } from 'vitest'
import { AIAgentSettingDefault } from '../../defaultConstant'
import { mergeAIAgentChatSettingCache, stripAIAgentChatSettingForPersist } from '../aiAgentChatSettingCache'

describe('AI Senso context settings cache migration', () => {
  it('drops only deprecated settings, keeps other saved preferences, and uses the new default', () => {
    const cache = Object.freeze({
      AIService: 'old-service',
      AIModelName: 'old-model',
      TimelineContentSizeLimit: 60,
      AICallAutoRetry: 7,
      ReviewPolicy: 'yolo',
      Strategy: { EnableGoalMode: true, GoalMinIterations: 4 },
    })
    const restored = mergeAIAgentChatSettingCache(cache)
    expect(restored).toMatchObject({
      RuntimeContextSizeLimit: 300,
      AICallAutoRetry: 7,
      ReviewPolicy: 'yolo',
      Strategy: cache.Strategy,
    })
    expect(restored).not.toHaveProperty('TimelineContentSizeLimit')
    expect(restored).not.toHaveProperty('AIService')
    expect(restored).not.toHaveProperty('AIModelName')
    expect(cache.TimelineContentSizeLimit).toBe(60)
  })

  it.each([0, 450])('round-trips an explicit new threshold %s without replacing it by the default', (value) => {
    const saved = stripAIAgentChatSettingForPersist({
      ...AIAgentSettingDefault,
      RuntimeContextSizeLimit: value,
      TimelineContentSizeLimit: 60,
      EnablePlan: true,
    })
    const restored = mergeAIAgentChatSettingCache(JSON.parse(JSON.stringify(saved)))
    expect(restored.RuntimeContextSizeLimit).toBe(value)
    expect(restored.EnablePlan).toBe(true)
    expect(saved).not.toHaveProperty('TimelineContentSizeLimit')
  })
})
