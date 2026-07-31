import { describe, it, expect } from 'vitest'
import { getImageStoreKeyByAISource, AI_AGENT_HISTORY_AI_SOURCES } from '../useGetChatDataStoreKey'
import { AISourceEnum } from '../grpcApi'

describe('getImageStoreKeyByAISource', () => {
  it('B14: maps sources', () => {
    expect(getImageStoreKeyByAISource(AISourceEnum.aiAgent)).toBe('aiChatDataStore')
    expect(getImageStoreKeyByAISource(AISourceEnum.im)).toBe('aiChatDataStore')
    expect(getImageStoreKeyByAISource(AISourceEnum.history)).toBe('histroyAiStore')
    expect(getImageStoreKeyByAISource(AISourceEnum.flow)).toBe('FlowAiStore')
    expect(getImageStoreKeyByAISource(AISourceEnum.yakRunner)).toBe('yakRunnerPageAiStore')
    expect(getImageStoreKeyByAISource('unknown' as any)).toBe('unknown')
    expect(AI_AGENT_HISTORY_AI_SOURCES).toEqual(['ai', 'im', ''])
  })
})
