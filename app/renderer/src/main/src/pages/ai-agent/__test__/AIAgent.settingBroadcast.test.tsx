import '../../ai-re-act/hooks/__test__/setupElectron'
import type { ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import emiter from '@/utils/eventBus/eventBus'
import { serializeAIAgentChatSetting } from '../utils/aiAgentChatSettingCache'
import { AIAgentSettingDefault } from '../defaultConstant'
import { AIAgent } from '../AIAgent'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn(),
  setRemoteValue: vi.fn(),
}))

vi.mock('@/utils/notification', () => ({
  failed: vi.fn(),
}))

vi.mock('../AIAgentSideList', () => ({
  AIAgentSideList: () => null,
}))

vi.mock('../aiBottomSideBar/AIBottomSideBar', () => ({
  AIBottomSideBar: () => null,
}))

vi.mock('../aiBottomDetails/AIBottomDetails', () => ({
  AIBottomDetails: () => null,
}))

vi.mock('../../yakRunner/SplitView/SplitView', () => ({
  SplitView: ({ elements }: { elements: { element: ReactNode }[] }) => (
    <>
      {elements.map((item, index) => (
        <div key={index}>{item.element}</div>
      ))}
    </>
  ),
}))

vi.mock('../aiAgentChat/AIAgentChat', async () => {
  const { useContext } = await import('react')
  const { default: AIAgentContext } = await import('../useContext/AIAgentContext')
  return {
    AIAgentChat: () => {
      const { store, dispatcher } = useContext(AIAgentContext)
      return (
        <div>
          <span data-testid="review-policy">{store.setting.ReviewPolicy}</span>
          <span data-testid="memory">{String(!!store.setting.DisableMemoryTriage)}</span>
          <span data-testid="goal">{store.setting.Strategy?.GoalMinIterations}</span>
          <span data-testid="enable-plan">{String(!!store.setting.EnablePlan)}</span>
          <button type="button" onClick={() => dispatcher.setSetting((s) => ({ ...s, EnablePlan: true }))}>
            turn-on-plan
          </button>
        </div>
      )
    },
  }
})

vi.mock('../../ai-re-act/hooks/useChatIPC', () => ({
  useChatIPC: () => ({
    onStart: vi.fn(),
    onSend: vi.fn(),
    onClose: vi.fn(),
    onUpdatePageId: vi.fn(),
  }),
}))

vi.mock('../../ai-re-act/hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: { updateSessionConfig: vi.fn() },
}))

vi.mock('../../KnowledgeBase/hooks/useKnowledgeBase', () => ({
  useKnowledgeBase: () => ({ initialize: vi.fn(), knowledgeBases: [] }),
}))

vi.mock('../components/aiFileSystemList/store/useHistoryFolder', () => ({
  loadRemoteHistory: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../components/aiFileSystemList/store/useCustomFolder', () => ({
  initCustomFolderStore: vi.fn().mockResolvedValue(undefined),
}))

const getRemoteValueMock = vi.mocked(getRemoteValue)
const setRemoteValueMock = vi.mocked(setRemoteValue)

describe('AIAgent 配置广播', () => {
  beforeEach(() => {
    getRemoteValueMock.mockReset()
    setRemoteValueMock.mockReset()
    getRemoteValueMock.mockResolvedValue(
      JSON.stringify({
        ReviewPolicy: 'yolo',
        DisableMemoryTriage: true,
        Strategy: { GoalMinIterations: 9, MaxSubAgents: 4 },
      }),
    )
    setRemoteValueMock.mockResolvedValue(undefined)
    if (typeof globalThis.ResizeObserver === 'undefined') {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as typeof ResizeObserver
    }
  })

  it('加载缓存后收到设置广播，会合并已保存项并保留当前会话开关，再写回缓存', async () => {
    render(<AIAgent pageId="test" />)

    await waitFor(() => {
      expect(screen.getByTestId('review-policy')).toHaveTextContent('yolo')
    })
    expect(screen.getByTestId('memory')).toHaveTextContent('true')
    expect(screen.getByTestId('goal')).toHaveTextContent('9')
    expect(screen.getByTestId('enable-plan')).toHaveTextContent('false')

    fireEvent.click(screen.getByText('turn-on-plan'))
    await waitFor(() => {
      expect(screen.getByTestId('enable-plan')).toHaveTextContent('true')
    })

    act(() => {
      emiter.emit(
        'onAIAgentChatSettingChange',
        serializeAIAgentChatSetting({
          ...AIAgentSettingDefault,
          ReviewPolicy: 'manual',
          DisableMemoryTriage: true,
          Strategy: { GoalMinIterations: 9, MaxSubAgents: 4 },
        }),
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('review-policy')).toHaveTextContent('manual')
    })
    expect(screen.getByTestId('enable-plan')).toHaveTextContent('true')
    expect(screen.getByTestId('memory')).toHaveTextContent('true')
    expect(screen.getByTestId('goal')).toHaveTextContent('9')

    await waitFor(() => {
      const last = setRemoteValueMock.mock.calls.at(-1)
      expect(last?.[1]).toContain('"ReviewPolicy":"manual"')
      expect(last?.[1]).toContain('"DisableMemoryTriage":true')
      expect(last?.[1]).toContain('"GoalMinIterations":9')
      expect(last?.[1]).not.toContain('EnablePlan')
    })
  })
})
