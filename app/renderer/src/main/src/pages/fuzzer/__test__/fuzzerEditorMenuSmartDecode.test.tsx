import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRef, type ReactElement } from 'react'
import type { EditorDetailInfoProps } from '../fuzzerEditorMenuLayout'

const dragHandlers: {
  onStart?: (e: unknown, data: { x: number; y: number }) => void
  onDrag?: (e: unknown, data: { x: number; y: number }) => void
  onStop?: () => void
} = {}

vi.mock('@/utils/monacoSpec/yakEditor', () => ({}))
vi.mock('lottie-web', () => ({ default: { loadAnimation: vi.fn(), destroy: vi.fn() } }))
vi.mock('@xterm/xterm', () => ({ Terminal: vi.fn() }))

vi.hoisted(() => {
  const ipcRenderer = {
    on: () => undefined,
    off: () => undefined,
    once: () => undefined,
    removeListener: () => undefined,
    removeAllListeners: () => undefined,
    send: () => undefined,
    invoke: vi.fn(() => Promise.resolve({ Results: [] })),
  }
  ;(window as unknown as { require: (id: string) => unknown }).require = (id: string) => {
    if (id === 'electron') return { ipcRenderer }
    return {}
  }
})

vi.mock('react-draggable', () => ({
  default: ({
    children,
    onStart,
    onDrag,
    onStop,
  }: {
    children: ReactElement
    onStart?: (e: unknown, data: { x: number; y: number }) => void
    onDrag?: (e: unknown, data: { x: number; y: number }) => void
    onStop?: () => void
  }) => {
    dragHandlers.onStart = onStart
    dragHandlers.onDrag = onDrag
    dragHandlers.onStop = onStop
    return children
  },
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh' },
  }),
}))

vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ onClick, icon }: { onClick?: () => void; icon?: React.ReactNode }) => (
    <button type="button" data-testid="smart-decode-close" onClick={onClick}>
      {icon}
    </button>
  ),
}))

vi.mock('@/utils/notification', () => ({ failed: vi.fn() }))

import * as layout from '../fuzzerEditorMenuLayout'
import { SmartDecodeFloatPanel } from '../fuzzerEditorMenuItems'

const hostBox = {
  hostLeft: 100,
  hostTop: 50,
  hostRight: 900,
  hostBottom: 650,
}

/** scss 在部分 vitest 配置下会被 stub 成 {}，不能依赖 CSS module 类名 */
const findPanel = () => {
  const close = screen.queryByTestId('smart-decode-close')
  if (!close) return null
  // 结构：panel > menu-drag > close-btn
  return close.parentElement?.parentElement ?? null
}

const paintPanelBox = (el: HTMLElement, left: number, top: number, width: number, height: number) => {
  Object.defineProperty(el, 'offsetWidth', { configurable: true, value: width })
  Object.defineProperty(el, 'offsetHeight', { configurable: true, value: height })
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    x: left,
    y: top,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect)
}

describe('SmartDecodeFloatPanel three-state layout', () => {
  beforeEach(() => {
    hostBox.hostLeft = 100
    hostBox.hostTop = 50
    hostBox.hostRight = 900
    hostBox.hostBottom = 650
    dragHandlers.onStart = undefined
    dragHandlers.onDrag = undefined
    dragHandlers.onStop = undefined
    vi.spyOn(layout, 'readEditorHostBox').mockImplementation(() => ({ ...hostBox }))
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  const editorInfo = (): EditorDetailInfoProps => ({
    left: hostBox.hostLeft,
    top: hostBox.hostTop,
    right: hostBox.hostRight,
    bottom: hostBox.hostBottom,
    focusX: 240,
    focusY: 210,
    lineHeight: 19,
    scrollTop: 0,
    direction: { x: 'left', y: 'top' },
  })

  const mount = (anchor = { left: 200, top: 200, right: 280, bottom: 220, width: 80, height: 20 }) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const hostRef = createRef<HTMLElement | null>()
    ;(hostRef as { current: HTMLElement | null }).current = host

    const view = render(
      <SmartDecodeFloatPanel
        rangeValue="hello"
        onClose={() => undefined}
        hostRef={hostRef}
        anchorRect={anchor}
        editorInfo={editorInfo()}
      />,
    )
    return { ...view, hostRef, host }
  }

  it('未拖时 fitInHost：contentReady 后设 fixed left/top', async () => {
    const { rerender, hostRef } = mount()
    await waitFor(() => expect(findPanel()).toBeTruthy())
    const panel = findPanel()!
    paintPanelBox(panel, 0, 0, 240, 120)
    rerender(
      <SmartDecodeFloatPanel
        rangeValue="hello"
        onClose={() => undefined}
        hostRef={hostRef}
        anchorRect={{ left: 200, top: 200, right: 280, bottom: 220, width: 80, height: 20 }}
        editorInfo={editorInfo()}
      />,
    )
    await waitFor(() => {
      expect(panel.style.visibility).toBe('visible')
      expect(panel.style.position).toBe('fixed')
      expect(panel.style.left).not.toBe('')
      expect(panel.style.top).not.toBe('')
    })
  })

  it('dragging 中改锚点不重跑 fitInHost（left/top 保持）', async () => {
    const { rerender, hostRef } = mount()
    await waitFor(() => expect(findPanel()).toBeTruthy())
    const panel = findPanel()!
    paintPanelBox(panel, 200, 221, 240, 120)
    rerender(
      <SmartDecodeFloatPanel
        rangeValue="hello"
        onClose={() => undefined}
        hostRef={hostRef}
        anchorRect={{ left: 200, top: 200, right: 280, bottom: 220, width: 80, height: 20 }}
        editorInfo={editorInfo()}
      />,
    )
    await waitFor(() => expect(panel.style.visibility).toBe('visible'))
    const leftBefore = panel.style.left
    const topBefore = panel.style.top

    act(() => {
      dragHandlers.onStart?.(null, { x: 0, y: 0 })
    })
    rerender(
      <SmartDecodeFloatPanel
        rangeValue="hello"
        onClose={() => undefined}
        hostRef={hostRef}
        anchorRect={{ left: 400, top: 400, right: 480, bottom: 420, width: 80, height: 20 }}
        editorInfo={editorInfo()}
      />,
    )
    expect(panel.style.left).toBe(leftBefore)
    expect(panel.style.top).toBe(topBefore)
  })

  it('dragged 后宿主缩小走 clampSticky，left 被夹进宿主', async () => {
    const { rerender, hostRef } = mount()
    await waitFor(() => expect(findPanel()).toBeTruthy())
    const panel = findPanel()!
    paintPanelBox(panel, 200, 221, 240, 120)
    rerender(
      <SmartDecodeFloatPanel
        rangeValue="hello"
        onClose={() => undefined}
        hostRef={hostRef}
        anchorRect={{ left: 200, top: 200, right: 280, bottom: 220, width: 80, height: 20 }}
        editorInfo={editorInfo()}
      />,
    )
    await waitFor(() => expect(panel.style.visibility).toBe('visible'))

    act(() => {
      dragHandlers.onStart?.(null, { x: 0, y: 0 })
      dragHandlers.onDrag?.(null, { x: 20, y: 30 })
      dragHandlers.onStop?.()
    })

    paintPanelBox(panel, 700, 500, 240, 120)
    hostBox.hostRight = 500
    hostBox.hostBottom = 400

    rerender(
      <SmartDecodeFloatPanel
        rangeValue="hello"
        onClose={() => undefined}
        hostRef={hostRef}
        anchorRect={{ left: 200, top: 200, right: 280, bottom: 220, width: 80, height: 20 }}
        editorInfo={{
          ...editorInfo(),
          right: hostBox.hostRight,
          bottom: hostBox.hostBottom,
          direction: { x: 'left', y: 'bottom' },
        }}
      />,
    )

    await waitFor(() => {
      expect(panel.style.visibility).toBe('visible')
      // CSS left = visualLeft - dragX；visualLeft 夹到 hostRight-width=260，dragX=20 → left=240
      expect(panel.style.left).toBe('240px')
    })
  })
})
