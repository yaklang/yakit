import type React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { consumeMcpWebFuzzerExecution, queueMcpWebFuzzerExecution } from '../../../utils/eventBus/events/webFuzzer'
import { createMcpWebFuzzerExecutionSlot } from '../mcpWebFuzzerExecutionSlot'
import { SecondNodeExtra, type FuzzerResponse } from '../HTTPFuzzerPage'

// 依赖链会拉到 lottie-web / xterm，模块加载期探测 canvas，jsdom 不支持
vi.mock('lottie-web', () => ({ default: { loadAnimation: vi.fn(), destroy: vi.fn() } }))
vi.mock('@xterm/xterm', () => ({ Terminal: vi.fn() }))

// HTTPFuzzerPage 模块顶层会 window.require('electron')
vi.hoisted(() => {
  const ipcRenderer = {
    on: () => undefined,
    off: () => undefined,
    once: () => undefined,
    removeListener: () => undefined,
    removeAllListeners: () => undefined,
    send: () => undefined,
    invoke: () => Promise.resolve(undefined),
  }
  ;(window as unknown as { require: (id: string) => unknown }).require = (id: string) => {
    if (id === 'electron') return { ipcRenderer }
    return {}
  }
})

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh' },
  }),
}))

// 受控替身：关闭请求走组件自己的 onOpenChange，才能断言组合期间被丢弃
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({
    open,
    onOpenChange,
    content,
    children,
  }: {
    open?: boolean
    onOpenChange?: (next: boolean) => void
    content?: React.ReactNode
    children?: React.ReactNode
  }) => (
    <div>
      <button type="button" data-testid="search-popover-request-open" onClick={() => onOpenChange?.(true)}>
        open
      </button>
      <button type="button" data-testid="search-popover-request-close" onClick={() => onOpenChange?.(false)}>
        close
      </button>
      {children}
      {open ? <div data-testid="search-popover-panel">{content}</div> : null}
    </div>
  ),
}))

/**
 * HTTPFuzzerPage MCP 生命周期接线（start / end / cancel）防回归。
 * 页面把状态收敛到 createMcpWebFuzzerExecutionSlot，此处覆盖状态转换本身。
 */
const pageId = 'http-fuzzer-page-mcp-lifecycle'

afterEach(() => {
  cleanup()
  while (consumeMcpWebFuzzerExecution(pageId)) {
    // drain module-local queue
  }
})

describe('HTTPFuzzerPage MCP execution lifecycle', () => {
  it('after end/release, can start the next queued command', () => {
    const slot = createMcpWebFuzzerExecutionSlot()
    const expiresAt = Date.now() + 10_000
    queueMcpWebFuzzerExecution({ executionId: 'first', pageId, expiresAt })
    queueMcpWebFuzzerExecution({ executionId: 'second', pageId, expiresAt })

    expect(slot.tryStart(pageId, false)).toBe('first')
    expect(slot.isInFlight()).toBe(true)
    // in-flight 时即使 busy=false 也不能抢占
    expect(slot.tryStart(pageId, false)).toBeUndefined()

    // 模拟 endToken：释放后可续消费
    expect(slot.release()).toBe(true)
    expect(slot.getFuzzerIndex()).toBeUndefined()
    expect(slot.tryStart(pageId, false)).toBe('second')
    expect(slot.getFuzzerIndex()).toBe('second')
  })

  it('after cancel/release, clears FuzzerIndex so manual send is not attributed to MCP', () => {
    const slot = createMcpWebFuzzerExecutionSlot()
    queueMcpWebFuzzerExecution({
      executionId: 'mcp-cancelled',
      pageId,
      expiresAt: Date.now() + 10_000,
    })

    expect(slot.tryStart(pageId, false)).toBe('mcp-cancelled')
    // 模拟 cancelCurrentHTTPFuzzer：释放槽位
    expect(slot.release()).toBe(true)
    expect(slot.isInFlight()).toBe(false)
    expect(slot.getFuzzerIndex()).toBeUndefined()

    // 手动发送走 getFuzzerRequestParams → FuzzerIndex 必须为空
    expect(slot.getFuzzerIndex()).toBeUndefined()
    // busy（loading）时不应从队列再起一条
    queueMcpWebFuzzerExecution({
      executionId: 'queued-while-manual',
      pageId,
      expiresAt: Date.now() + 10_000,
    })
    expect(slot.tryStart(pageId, true)).toBeUndefined()
    expect(consumeMcpWebFuzzerExecution(pageId)?.executionId).toBe('queued-while-manual')
  })

  it('does not start while busy (loading)', () => {
    const slot = createMcpWebFuzzerExecutionSlot()
    queueMcpWebFuzzerExecution({
      executionId: 'blocked-by-loading',
      pageId,
      expiresAt: Date.now() + 10_000,
    })
    expect(slot.tryStart(pageId, true)).toBeUndefined()
    expect(slot.isInFlight()).toBe(false)
    expect(consumeMcpWebFuzzerExecution(pageId)?.executionId).toBe('blocked-by-loading')
  })

  it('manual send must pass busy=true so duplex cannot interleave the same token', () => {
    // 对应页面：submitToHTTPFuzzer 同步写 loadingRef.current=true，再 setLoading(true)
    // 若只依赖 effect 同步 loadingRef，duplex 会在窗口内 tryStart(busy=false) 抢占同 token
    const slot = createMcpWebFuzzerExecutionSlot()
    const expiresAt = Date.now() + 10_000
    queueMcpWebFuzzerExecution({ executionId: 'race-mcp', pageId, expiresAt })

    let busy = false
    // 手动发送入口：先占 busy
    busy = true
    expect(slot.tryStart(pageId, busy)).toBeUndefined()
    expect(slot.isInFlight()).toBe(false)
    expect(consumeMcpWebFuzzerExecution(pageId)?.executionId).toBe('race-mcp')
  })
})

const singleResponse = {
  IsTooLargeResponse: false,
  ExtractedResults: [],
  Payloads: [],
} as unknown as FuzzerResponse

const searchPlaceholder = 'SecondNodeExtra.enterTargetResponse'

/**
 * 窄宽度把搜索收进 Popover。输入法组合会触发 onOpenChange(false)，
 * 组合期间必须忽略关闭，组合结束后下一次关闭才生效。
 */
describe('SecondNodeExtra search popover', () => {
  const buildSecondNodeExtra = (width: number) => (
    <SecondNodeExtra
      rsp={singleResponse}
      onlyOneResponse
      cachedTotal={1}
      failedCount={0}
      secondNodeSize={{ width, height: 200 }}
      setQuery={() => {}}
      sendPayloadsType="config"
      setShowExtra={() => {}}
      showResponseInfoSecondEditor={false}
      setShowResponseInfoSecondEditor={() => {}}
    />
  )
  const renderSecondNodeExtra = (width: number) => render(buildSecondNodeExtra(width))

  it('keeps the search popover open while composing and closes after composition ends', () => {
    renderSecondNodeExtra(400)
    expect(screen.queryByPlaceholderText(searchPlaceholder)).toBeNull()

    fireEvent.click(screen.getByTestId('search-popover-request-open'))
    const input = screen.getByPlaceholderText(searchPlaceholder)
    expect(screen.queryByTestId('search-popover-panel')).not.toBeNull()

    fireEvent.compositionStart(input)
    fireEvent.click(screen.getByTestId('search-popover-request-close'))
    expect(screen.queryByPlaceholderText(searchPlaceholder)).not.toBeNull()
    expect(screen.queryByTestId('search-popover-panel')).not.toBeNull()

    fireEvent.compositionEnd(input)
    expect(screen.queryByPlaceholderText(searchPlaceholder)).not.toBeNull()

    fireEvent.click(screen.getByTestId('search-popover-request-close'))
    expect(screen.queryByPlaceholderText(searchPlaceholder)).toBeNull()
    expect(screen.queryByTestId('search-popover-panel')).toBeNull()
  })

  /**
   * 页面级快捷键（Alt+Enter 发包、Ctrl/Cmd+Shift+S 保存历史）监听在 document 上，
   * 搜索框不得拦截 keydown 冒泡。回归：曾用 onKeyDown stopPropagation 修输入法误关闭，连带挡掉快捷键。
   */
  const expectShortcutsBubbleToDocument = (input: HTMLElement) => {
    const onDocKeyDown = vi.fn()
    document.addEventListener('keydown', onDocKeyDown)
    fireEvent.keyDown(input, { key: 'Enter', altKey: true })
    fireEvent.keyDown(input, { key: 's', ctrlKey: true, shiftKey: true })
    document.removeEventListener('keydown', onDocKeyDown)

    expect(onDocKeyDown).toHaveBeenCalledTimes(2)
    expect(onDocKeyDown).toHaveBeenNthCalledWith(1, expect.objectContaining({ key: 'Enter', altKey: true }))
    expect(onDocKeyDown).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ key: 's', ctrlKey: true, shiftKey: true }),
    )
  }

  it('lets page shortcuts bubble to document from the wide-layout search input', () => {
    renderSecondNodeExtra(800)
    expectShortcutsBubbleToDocument(screen.getByPlaceholderText(searchPlaceholder))
  })

  it('lets page shortcuts bubble to document from the narrow-popover search input', () => {
    renderSecondNodeExtra(400)
    fireEvent.click(screen.getByTestId('search-popover-request-open'))
    expectShortcutsBubbleToDocument(screen.getByPlaceholderText(searchPlaceholder))
  })

  /**
   * 窄布局打开弹窗后拉宽：Popover 卸载但组件还在，open 不得残留 true，
   * 否则缩窄重新挂载时弹窗自动重现。
   */
  it('keeps the popover closed after widening and re-narrowing', () => {
    const { rerender } = renderSecondNodeExtra(400)
    fireEvent.click(screen.getByTestId('search-popover-request-open'))
    expect(screen.queryByTestId('search-popover-panel')).not.toBeNull()

    // 宽布局直出输入框，Popover 分支卸载
    rerender(buildSecondNodeExtra(800))
    expect(screen.getByPlaceholderText(searchPlaceholder)).not.toBeNull()

    // 缩窄后重新挂载，不得沿用残留的 open=true
    rerender(buildSecondNodeExtra(400))
    expect(screen.queryByTestId('search-popover-panel')).toBeNull()
    expect(screen.queryByPlaceholderText(searchPlaceholder)).toBeNull()
  })

  /** 组合中途拉宽时输入框卸载、不会触发 compositionEnd，组合态必须随布局切换重置，否则之后弹窗关不掉 */
  it('clears stale composition state after widening so the popover can close again', () => {
    const { rerender } = renderSecondNodeExtra(400)
    fireEvent.click(screen.getByTestId('search-popover-request-open'))
    fireEvent.compositionStart(screen.getByPlaceholderText(searchPlaceholder))

    rerender(buildSecondNodeExtra(800))
    rerender(buildSecondNodeExtra(400))

    fireEvent.click(screen.getByTestId('search-popover-request-open'))
    expect(screen.queryByTestId('search-popover-panel')).not.toBeNull()

    // 组合态已重置，关闭请求不再被守卫吞掉
    fireEvent.click(screen.getByTestId('search-popover-request-close'))
    expect(screen.queryByTestId('search-popover-panel')).toBeNull()
  })
})
