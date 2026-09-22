import '../../ai-re-act/hooks/__test__/setupElectron'
import type { ReactNode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

/** 可注入宽度的 ResizeObserver mock：notifyWidth 模拟容器宽度变化回调 */
const roCallbacks = new Set<(width: number) => void>()
const notifyWidth = (width: number) => {
  act(() => {
    roCallbacks.forEach((notify) => notify(width))
  })
}

describe('AIAgent 侧栏拖拽宽度', () => {
  beforeEach(() => {
    getRemoteValueMock.mockReset()
    setRemoteValueMock.mockReset()
    getRemoteValueMock.mockResolvedValue('')
    setRemoteValueMock.mockResolvedValue(undefined)
    roCallbacks.clear()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          const notify = (width: number) =>
            callback([{ contentRect: { width } } as ResizeObserverEntry], this as unknown as ResizeObserver)
          roCallbacks.add(notify)
        }
        observe() {}
        unobserve() {}
        disconnect() {
          roCallbacks.clear()
        }
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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

  it('宽度越过 1300 切浮层布局，浮层展开宽度沿用拖拽后的 sideRatio', () => {
    render(<AIAgent pageId="test" />)

    // 大屏：非 mini，走 YakitResizeBox 布局
    expect(screen.getByLabelText('first-ratio')).toBeInTheDocument()

    // 拖拽改宽，供浮层沿用
    fireEvent.click(screen.getByRole('button', { name: '展开侧栏' }))
    fireEvent.click(screen.getByRole('button', { name: '模拟拖拽结束' }))

    // 跌破 1300：切浮层布局，ResizeBox 分支消失
    notifyWidth(1200)
    expect(screen.queryByLabelText('first-ratio')).not.toBeInTheDocument()

    // 浮层展开态宽度取 sideRatio（inline style 挂在侧栏容器上，mock 的 SideList 自带一层 wrapper）
    const sideContainer = screen.getByLabelText('side-show').parentElement!.parentElement!
    expect(sideContainer).toHaveStyle({ width: '480px' })

    // 收起后展开宽度清空，再展开仍取 sideRatio
    fireEvent.click(screen.getByRole('button', { name: '收起侧栏' }))
    expect(screen.getByLabelText('side-show')).toHaveTextContent('false')
    // 收起后 inline 宽度清空（style 属性保留为空串）
    expect(sideContainer.style.width).toBe('')
    fireEvent.click(screen.getByRole('button', { name: '展开侧栏' }))
    expect(sideContainer).toHaveStyle({ width: '480px' })

    // 回到宽度 > 1300：恢复 ResizeBox 布局且展开宽度仍是拖拽后的 480px
    notifyWidth(1400)
    expect(screen.getByLabelText('first-ratio')).toHaveTextContent('480px')
  })

  it('小屏下宽度跌破 1230 时自动收起已展开的侧栏', () => {
    render(<AIAgent pageId="test" />)

    // 首次回调只初始化 isMini（skipFirstClose），不触发收起
    notifyWidth(1200)
    fireEvent.click(screen.getByRole('button', { name: '展开侧栏' }))
    expect(screen.getByLabelText('side-show')).toHaveTextContent('true')

    // 跌破 1230：mini 布局下强制收起
    notifyWidth(1100)
    expect(screen.getByLabelText('side-show')).toHaveTextContent('false')

    // 回升大屏恢复 ResizeBox 布局，收起态不自动展开
    notifyWidth(1400)
    expect(screen.getByLabelText('side-show')).toHaveTextContent('false')
    expect(screen.getByLabelText('first-ratio')).toHaveTextContent('24px')
  })
})
