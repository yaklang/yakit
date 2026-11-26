import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AISourceEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import emiter from '@/utils/eventBus/eventBus'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { AIAgentSettingDefault } from '../../defaultConstant'
import type { AIAgentSetting } from '../../aiAgentType'
import {
  applyAIAgentChatSettingBroadcast,
  applyAIAgentChatSettingSessionDefaults,
  loadAIAgentChatSetting,
  mergeAIAgentChatSettingCache,
  persistAIAgentChatSetting,
  persistSharedChatSetting,
  serializeAIAgentChatSetting,
} from '../aiAgentChatSettingCache'

vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn(),
  setRemoteValue: vi.fn(),
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}))

const getRemoteValueMock = vi.mocked(getRemoteValue)
const setRemoteValueMock = vi.mocked(setRemoteValue)
const emitMock = vi.mocked(emiter.emit)

const settingWithModel: AIAgentSetting = {
  ...AIAgentSettingDefault,
  AIService: 'openai',
  AIModelName: 'gpt-test',
  ReviewPolicy: 'yolo',
  SyncPerceptionTrigger: true,
  EnablePlan: true,
  SingleModelMode: true,
  DisableMemoryTriage: true,
  Strategy: {
    EnableMultiAgent: true,
    EnableGoalMode: true,
    GoalMinIterations: 9,
    MaxSubAgents: 4,
  },
}

describe('serializeAIAgentChatSetting', () => {
  it('持久化时过滤两个旧阈值', () => {
    const setting = {
      ...settingWithModel,
      TimelineContentSizeLimit: 60,
      RuntimeContextSizeLimit: 300,
    }
    const parsed = JSON.parse(serializeAIAgentChatSetting(setting))
    expect(parsed).not.toHaveProperty('TimelineContentSizeLimit')
    expect(parsed).not.toHaveProperty('RuntimeContextSizeLimit')
  })

  it('持久化时去掉模型字段和会话运行模式', () => {
    const parsed = JSON.parse(serializeAIAgentChatSetting(settingWithModel)) as AIAgentSetting
    expect(parsed.AIService).toBeUndefined()
    expect(parsed.AIModelName).toBeUndefined()
    expect(parsed.EnablePlan).toBeUndefined()
    expect(parsed.SyncPerceptionTrigger).toBeUndefined()
    expect(parsed.SingleModelMode).toBeUndefined()
    expect(parsed.Source).toBeUndefined()
    expect(parsed.Strategy?.EnableMultiAgent).toBeUndefined()
    expect(parsed.Strategy?.EnableGoalMode).toBeUndefined()
    expect(parsed.ReviewPolicy).toBe('yolo')
    expect(parsed.Strategy?.GoalMinIterations).toBe(9)
  })
})

describe('mergeAIAgentChatSettingCache', () => {
  it('用默认值铺底，同时丢掉缓存里的模型字段', () => {
    const merged = mergeAIAgentChatSettingCache({
      AIService: 'openai',
      AIModelName: 'gpt-test',
      ReviewPolicy: 'ai',
    })
    expect(merged.AIService).toBeUndefined()
    expect(merged.AIModelName).toBeUndefined()
    expect(merged.ReviewPolicy).toBe('ai')
    expect(merged.ReActMaxIteration).toBe(AIAgentSettingDefault.ReActMaxIteration)
  })

  it('读缓存时过滤两个旧阈值', () => {
    const cache = {
      ...settingWithModel,
      TimelineContentSizeLimit: 60,
      RuntimeContextSizeLimit: 300,
    }
    const merged = mergeAIAgentChatSettingCache(cache)
    expect(merged).not.toHaveProperty('TimelineContentSizeLimit')
    expect(merged).not.toHaveProperty('RuntimeContextSizeLimit')
  })

  it('保留已保存的记忆处理开关和策略数值，不在读缓存时重置', () => {
    const merged = mergeAIAgentChatSettingCache(settingWithModel)
    expect(merged.DisableMemoryTriage).toBe(true)
    expect(merged.Strategy?.GoalMinIterations).toBe(9)
    expect(merged.Strategy?.MaxSubAgents).toBe(4)
    expect(merged.ReviewPolicy).toBe('yolo')
  })
})

describe('applyAIAgentChatSettingSessionDefaults', () => {
  it('打开新会话时关掉规划 / 多 Agent / 目标优化，但留下已保存的策略数值', () => {
    const next = applyAIAgentChatSettingSessionDefaults(mergeAIAgentChatSettingCache(settingWithModel))
    expect(next.SyncPerceptionTrigger).toBe(false)
    expect(next.EnablePlan).toBe(false)
    expect(next.SingleModelMode).toBe(false)
    expect(next.Source).toBe(AISourceEnum.aiAgent)
    expect(next.DisableMemoryTriage).toBe(true)
    expect(next.Strategy).toEqual({
      EnableMultiAgent: false,
      EnableGoalMode: false,
      GoalMinIterations: 9,
      MaxSubAgents: 4,
      GoalDurationSeconds: 0,
      GoalAcceptanceCriteria: '',
    })
  })
})

describe('loadAIAgentChatSetting', () => {
  beforeEach(() => {
    getRemoteValueMock.mockReset()
  })

  it('远端无缓存时返回 empty', async () => {
    getRemoteValueMock.mockResolvedValue('')
    await expect(loadAIAgentChatSetting()).resolves.toEqual({ status: 'empty' })
  })

  it('非法 JSON 返回 error，不抛错', async () => {
    getRemoteValueMock.mockResolvedValue('{')
    await expect(loadAIAgentChatSetting()).resolves.toEqual({ status: 'error' })
  })

  it('非对象 JSON 返回 error', async () => {
    getRemoteValueMock.mockResolvedValue('"not-object"')
    await expect(loadAIAgentChatSetting()).resolves.toEqual({ status: 'error' })
  })

  it('读取异常返回 error', async () => {
    getRemoteValueMock.mockRejectedValue(new Error('kv-fail'))
    await expect(loadAIAgentChatSetting()).resolves.toEqual({ status: 'error' })
  })

  it('合法缓存走合并规则后再返回', async () => {
    getRemoteValueMock.mockResolvedValue(
      JSON.stringify({ ReviewPolicy: 'ai', EnablePlan: true, DisableMemoryTriage: true }),
    )
    const loaded = await loadAIAgentChatSetting()
    expect(getRemoteValueMock).toHaveBeenCalledWith(RemoteAIAgentGV.AIAgentChatSetting)
    expect(loaded.status).toBe('success')
    if (loaded.status !== 'success') return
    expect(loaded.setting.ReviewPolicy).toBe('ai')
    expect(loaded.setting.EnablePlan).toBe(true)
    expect(loaded.setting.DisableMemoryTriage).toBe(true)
    expect(loaded.setting.Source).toBe(AIAgentSettingDefault.Source)
  })
})

describe('applyAIAgentChatSettingBroadcast', () => {
  it('应用设置广播时保留当前会话的规划 / 多 Agent / 目标优化', () => {
    const current: AIAgentSetting = {
      ...AIAgentSettingDefault,
      EnablePlan: true,
      SingleModelMode: true,
      ReviewPolicy: 'manual',
      Strategy: {
        EnableMultiAgent: true,
        EnableGoalMode: true,
        GoalMinIterations: 3,
        MaxSubAgents: 2,
      },
    }
    const incoming = JSON.parse(serializeAIAgentChatSetting(settingWithModel)) as Partial<AIAgentSetting>
    const next = applyAIAgentChatSettingBroadcast(current, incoming)
    expect(next.EnablePlan).toBe(true)
    expect(next.SingleModelMode).toBe(true)
    expect(next.Strategy?.EnableMultiAgent).toBe(true)
    expect(next.Strategy?.EnableGoalMode).toBe(true)
    expect(next.ReviewPolicy).toBe('yolo')
    expect(next.AIService).toBeUndefined()
  })

  it('即使广播里带上会话开关 false，也不会覆盖当前会话', () => {
    const current: AIAgentSetting = {
      ...AIAgentSettingDefault,
      EnablePlan: true,
      SingleModelMode: true,
      Strategy: { EnableMultiAgent: true, EnableGoalMode: true },
    }
    const next = applyAIAgentChatSettingBroadcast(current, {
      EnablePlan: false,
      SingleModelMode: false,
      ReviewPolicy: 'ai',
      Strategy: { EnableMultiAgent: false, EnableGoalMode: false, GoalMinIterations: 8 },
    })
    expect(next.EnablePlan).toBe(true)
    expect(next.SingleModelMode).toBe(true)
    expect(next.Strategy?.EnableMultiAgent).toBe(true)
    expect(next.Strategy?.EnableGoalMode).toBe(true)
    expect(next.ReviewPolicy).toBe('ai')
    expect(next.Strategy?.GoalMinIterations).toBe(8)
  })
})

describe('persistAIAgentChatSetting', () => {
  beforeEach(() => {
    setRemoteValueMock.mockReset()
    emitMock.mockReset()
  })

  it('默认写入远端并广播，payload 不含模型字段', async () => {
    await persistAIAgentChatSetting(settingWithModel)
    const payload = serializeAIAgentChatSetting(settingWithModel)
    expect(setRemoteValueMock).toHaveBeenCalledWith(RemoteAIAgentGV.AIAgentChatSetting, payload)
    const { ReviewPolicy, AIReviewRiskControlScore, ...shared } = JSON.parse(payload)
    expect(ReviewPolicy).toBe('yolo')
    expect(emitMock).toHaveBeenCalledWith('onAIAgentChatSettingChange', JSON.stringify(shared))
    expect(payload).not.toContain('gpt-test')
    expect(payload).not.toContain('EnablePlan')
  })

  it('emit=false 时只落库不广播', async () => {
    await persistAIAgentChatSetting(settingWithModel, false)
    expect(setRemoteValueMock).toHaveBeenCalled()
    expect(emitMock).not.toHaveBeenCalled()
  })

  it('交错保存共享项与全局设置时保留最近一次全局审核模式和零阈值', async () => {
    let cache = JSON.stringify({ ReviewPolicy: 'manual', AIReviewRiskControlScore: 0.8 })
    getRemoteValueMock.mockImplementation(async () => cache)
    setRemoteValueMock.mockImplementation(async (_, payload) => {
      cache = payload
    })
    const chat = { ...settingWithModel, AIReviewRiskControlScore: 0.5 }
    const global = { ...settingWithModel, ReviewPolicy: 'ai' as const, AIReviewRiskControlScore: 0 }
    const writes = [
      persistSharedChatSetting(chat),
      persistAIAgentChatSetting(global),
      persistSharedChatSetting({ ...chat, AICallTokenLimit: 600 }),
    ]
    await Promise.all(writes)
    expect(JSON.parse(setRemoteValueMock.mock.calls[0][1])).toMatchObject({
      ReviewPolicy: 'manual',
      AIReviewRiskControlScore: 0.8,
    })
    expect(JSON.parse(cache)).toMatchObject({ ReviewPolicy: 'ai', AIReviewRiskControlScore: 0, AICallTokenLimit: 600 })
    expect(emitMock).toHaveBeenNthCalledWith(
      1,
      'onAIAgentChatSettingChange',
      expect.not.stringContaining('"ReviewPolicy"'),
    )
    expect(emitMock).toHaveBeenNthCalledWith(
      3,
      'onAIAgentChatSettingChange',
      expect.not.stringContaining('"AIReviewRiskControlScore"'),
    )
  })
})
