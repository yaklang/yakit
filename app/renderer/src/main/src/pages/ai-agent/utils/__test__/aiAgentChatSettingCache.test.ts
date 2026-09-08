import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AISourceEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import emiter from '@/utils/eventBus/eventBus'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { AIAgentSettingDefault } from '../../defaultConstant'
import type { AIAgentSetting } from '../../aiAgentType'
import {
  loadAIAgentChatSetting,
  mergeAIAgentChatSettingCache,
  persistAIAgentChatSetting,
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
  DisableMemoryTriage: true,
  Strategy: {
    EnableMultiAgent: true,
    EnableGoalMode: true,
    GoalMinIterations: 9,
    MaxSubAgents: 4,
  },
}

describe('serializeAIAgentChatSetting', () => {
  it('持久化时去掉 AIService / AIModelName，避免把会话模型写进全局缓存', () => {
    const parsed = JSON.parse(serializeAIAgentChatSetting(settingWithModel)) as AIAgentSetting
    expect(parsed.AIService).toBeUndefined()
    expect(parsed.AIModelName).toBeUndefined()
    expect(parsed.ReviewPolicy).toBe('yolo')
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

  it('强制关闭会话专属开关，Strategy 只保留默认迭代上限', () => {
    const merged = mergeAIAgentChatSettingCache(settingWithModel)
    expect(merged.SyncPerceptionTrigger).toBe(false)
    expect(merged.EnablePlan).toBe(false)
    expect(merged.DisableMemoryTriage).toBe(AIAgentSettingDefault.DisableMemoryTriage)
    expect(merged.Strategy).toEqual({
      EnableMultiAgent: false,
      EnableGoalMode: false,
      GoalMinIterations: AIAgentSettingDefault.Strategy?.GoalMinIterations,
      MaxSubAgents: AIAgentSettingDefault.Strategy?.MaxSubAgents,
    })
    expect(merged.Source).toBe(AISourceEnum.aiAgent)
  })
})

describe('loadAIAgentChatSetting', () => {
  beforeEach(() => {
    getRemoteValueMock.mockReset()
  })

  it('远端无缓存时返回 undefined', async () => {
    getRemoteValueMock.mockResolvedValue('')
    await expect(loadAIAgentChatSetting()).resolves.toBeUndefined()
  })

  it('非法 JSON 返回 undefined，不抛错', async () => {
    getRemoteValueMock.mockResolvedValue('{')
    await expect(loadAIAgentChatSetting()).resolves.toBeUndefined()
  })

  it('非对象 JSON 返回 undefined', async () => {
    getRemoteValueMock.mockResolvedValue('"not-object"')
    await expect(loadAIAgentChatSetting()).resolves.toBeUndefined()
  })

  it('合法缓存走合并规则后再返回', async () => {
    getRemoteValueMock.mockResolvedValue(JSON.stringify({ ReviewPolicy: 'ai', EnablePlan: true }))
    const loaded = await loadAIAgentChatSetting()
    expect(getRemoteValueMock).toHaveBeenCalledWith(RemoteAIAgentGV.AIAgentChatSetting)
    expect(loaded?.ReviewPolicy).toBe('ai')
    expect(loaded?.EnablePlan).toBe(false)
    expect(loaded?.Source).toBe(AISourceEnum.aiAgent)
  })
})

describe('persistAIAgentChatSetting', () => {
  beforeEach(() => {
    setRemoteValueMock.mockReset()
    emitMock.mockReset()
  })

  it('默认写入远端并广播，payload 不含模型字段', () => {
    persistAIAgentChatSetting(settingWithModel)
    const payload = serializeAIAgentChatSetting(settingWithModel)
    expect(setRemoteValueMock).toHaveBeenCalledWith(RemoteAIAgentGV.AIAgentChatSetting, payload)
    expect(emitMock).toHaveBeenCalledWith('onAIAgentChatSettingChange', payload)
    expect(payload).not.toContain('gpt-test')
  })

  it('emit=false 时只落库不广播', () => {
    persistAIAgentChatSetting(settingWithModel, false)
    expect(setRemoteValueMock).toHaveBeenCalled()
    expect(emitMock).not.toHaveBeenCalled()
  })
})
