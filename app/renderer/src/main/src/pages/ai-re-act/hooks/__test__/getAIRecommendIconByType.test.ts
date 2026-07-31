import './setupElectron'
import { describe, it, expect, vi } from 'vitest'
import { getAIRecommendIconByType } from '../useGetAIMaterialsData'

vi.mock('../../ai-agent/aiChatWelcome/icon', () => ({
  AIToolIcon: () => null,
  HoverAIToolIcon: () => null,
  AIForgeIcon: () => null,
  HoverAIForgeIcon: () => null,
  AIKnowledgeBaseIcon: () => null,
  HoverAIKnowledgeBaseIcon: () => null,
}))

vi.mock('@/pages/ai-agent/grpc', () => ({
  grpcGetRandomAIMaterials: vi.fn(),
}))

describe('getAIRecommendIconByType', () => {
  it('B15: returns icons for known types', () => {
    expect(getAIRecommendIconByType('工具').icon).toBeTruthy()
    expect(getAIRecommendIconByType('技能').icon).toBeTruthy()
    expect(getAIRecommendIconByType('知识库').icon).toBeTruthy()
    expect(getAIRecommendIconByType('其他').icon).toBeNull()
  })
})
