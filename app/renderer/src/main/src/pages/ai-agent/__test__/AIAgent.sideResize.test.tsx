import '../../ai-re-act/hooks/__test__/setupElectron'
import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
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
  AIAgentSideList: ({ show, setShow }: { show: boolean; setShow: (v: boolean) => void }) => (
    <div>
      <output aria-label="side-show">{String(show)}</output>
      <button type="button" onClick={() => setShow(true)}>
        展开侧栏
      </button>
      <button type="button" onClick={() => setShow(false)}>
        收起侧栏
      </button>
    </div>
  ),
}))

vi.mock('@/components/yakitUI/YakitResizeBox/YakitResizeBox', () => ({
  YakitResizeBox: ({
    firstRatio,
    firstNode,
    secondNode,
    onMouseUp,
  }: {
    firstRatio?: string
    firstNode: ReactNode
    secondNode: ReactNode
    onMouseUp?: (e: {
      firstSizeNum: number
      secondSizeNum: number
      firstSizePercent: string
      secondSizePercent: string
    }) => void
  }) => (
    <div>
      <output aria-label="first-ratio">{firstRatio}</output>
      <button
        type="button"
        onClick={() =>
          onMouseUp?.({
            firstSizeNum: 480,
            secondSizeNum: 720,
            firstSizePercent: '40%',
            secondSizePercent: '60%',
          })
        }
      >
        模拟拖拽结束
      </button>
      {firstNode}
      {secondNode}
    </div>
  ),
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

vi.mock('../aiAgentChat/AIAgentChat', () => ({
  AIAgentChat: () => <div>chat</div>,
}))

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

describe('AIAgent 侧栏拖拽宽度', () => {
  beforeEach(() => {
    getRemoteValueMock.mockReset()
    setRemoteValueMock.mockReset()
    getRemoteValueMock.mockResolvedValue('')
    setRemoteValueMock.mockResolvedValue(undefined)
    if (typeof globalThis.ResizeObserver === 'undefined') {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as typeof ResizeObserver
    }
  })

  it('拖拽结束回写 sideRatio，收起再展开仍保持宽度', () => {
    render(<AIAgent pageId="test" />)

    // 默认收起：firstRatio 为 24px
    expect(screen.getByLabelText('first-ratio')).toHaveTextContent('24px')
    expect(screen.getByLabelText('side-show')).toHaveTextContent('false')

    fireEvent.click(screen.getByRole('button', { name: '展开侧栏' }))
    expect(screen.getByLabelText('side-show')).toHaveTextContent('true')
    expect(screen.getByLabelText('first-ratio')).toHaveTextContent('360px')

    // 模拟 dragResize 松手上报（P0 修复后才会真正到达这里）
    fireEvent.click(screen.getByRole('button', { name: '模拟拖拽结束' }))
    expect(screen.getByLabelText('first-ratio')).toHaveTextContent('480px')

    fireEvent.click(screen.getByRole('button', { name: '收起侧栏' }))
    expect(screen.getByLabelText('side-show')).toHaveTextContent('false')
    expect(screen.getByLabelText('first-ratio')).toHaveTextContent('24px')

    fireEvent.click(screen.getByRole('button', { name: '展开侧栏' }))
    expect(screen.getByLabelText('side-show')).toHaveTextContent('true')
    expect(screen.getByLabelText('first-ratio')).toHaveTextContent('480px')
  })
})
