import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TableVirtualResize } from '../TableVirtualResize'

type ShortcutTrigger = (focus: string[] | null) => void
const shortcutTriggers = vi.hoisted(() => new Map<string, ShortcutTrigger>())

vi.mock('@/utils/globalShortcutKey/events/useShortcutKeyTrigger', () => ({
  default: (name: string, cb: ShortcutTrigger) => {
    shortcutTriggers.set(name, cb)
  },
}))
// 固定 uuid，便于构造 useShortcutKeyTrigger 需要的 focus 值
vi.mock('uuid', () => ({ v4: () => 'fixed-uuid' }))
vi.mock('@/utils/globalShortcutKey/events/global', () => ({
  ShortcutKeyFocusType: { TableVirtual: 'TableVirtual' },
  GlobalShortcutKey: {
    TableVirtualUP: 'tableVirtualUP*common',
    TableVirtualDown: 'tableVirtualDown*common',
  },
}))
vi.mock('@/utils/globalShortcutKey/utils', () => ({
  convertKeyEventToKeyCombination: vi.fn(() => ['down']),
  parseShortcutKeyEvent: vi.fn(() => 'tableVirtualDown*common'),
}))
vi.mock('@/utils/globalShortcutKey/shortcutKeyFocusHook/ShortcutKeyFocusHook', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}))
vi.mock('@/utils/kv', () => ({ getRemoteValue: async () => undefined }))
vi.mock('../TableVirtualResize.module.scss', () => ({
  default: {
    'virtual-table-list-container': 'virtual-table-list-container',
    'virtual-table-list': 'virtual-table-list',
  },
}))
vi.mock('../../yakitUI/YakitInput/YakitInput', () => ({ YakitInput: () => null }))
vi.mock('../../yakitUI/YakitSelect/YakitSelect', () => ({ YakitSelect: () => null }))
vi.mock('../../yakitUI/YakitTag/YakitTag', () => ({ YakitTag: () => null }))
vi.mock('@/components/yakitUI/YakitDatePicker/YakitDatePicker', () => ({
  YakitDatePicker: { RangePicker: () => null },
}))
vi.mock('../../yakitUI/YakitSpin/YakitSpin', () => ({
  YakitSpin: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

const ITEM_HEIGHT = 28

const domRect = (top: number, height: number): DOMRect =>
  ({ top, bottom: top + height, left: 0, right: 600, width: 600, height, x: 0, y: top, toJSON: () => ({}) }) as DOMRect

beforeEach(() => {
  // Give the real virtual-list hook a visible viewport in jsdom.
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.callback(
          [{ target, contentRect: { width: 600, height: 300 } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        )
      }
      unobserve() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  cleanup()
  shortcutTriggers.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const renderTable = (data: { id: string }[]) =>
  render(
    <DndProvider backend={HTML5Backend}>
      <TableVirtualResize
        renderKey="id"
        isRefresh={false}
        data={data}
        columns={[{ title: 'ID', dataKey: 'id' }]}
        useUpAndDown
      />
    </DndProvider>,
  )

/** 触发一次按下方向键（选中下一行），并等内部 50ms 延时结束 */
const pressDown = async () => {
  act(() => {
    shortcutTriggers.get('tableVirtualDown*common')!(['TableVirtual-fixed-uuid'])
  })
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 60))
  })
}

describe('TableVirtualResize 虚拟列表偏移', () => {
  it('滚动后 wrapper 偏移与当前虚拟窗口起点同步', async () => {
    const data = Array.from({ length: 40 }, (_, index) => ({ id: `row-${index}` }))
    const { container } = renderTable(data)
    await screen.findByText('row-0')

    const viewport = container.querySelector<HTMLElement>('.virtual-table-list-container')!
    const wrapper = container.querySelector<HTMLElement>('.virtual-table-list')!
    viewport.scrollTop = 400
    fireEvent.scroll(viewport)

    const firstRow = screen.getAllByText(/^row-\d+$/)[0]
    const start = Number(firstRow.textContent!.replace('row-', ''))
    expect(start).toBeGreaterThan(0)
    expect(wrapper.style.marginTop).toBe(`${start * ITEM_HEIGHT}px`)
    expect(wrapper.style.height).toBe(`${(data.length - start) * ITEM_HEIGHT}px`)
  })
})

describe('TableVirtualResize 选中行滚动', () => {
  it('选中行在可见区下方时滚到可见区底边', async () => {
    const data = Array.from({ length: 20 }, (_, index) => ({ id: `row-${index}` }))
    const { container } = renderTable(data)
    await screen.findByText('row-0')

    const viewport = container.querySelector<HTMLElement>('.virtual-table-list-container')!
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(domRect(100, 300))
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.id === 'row-1') return domRect(400, ITEM_HEIGHT)
      return domRect(0, 0)
    })

    await pressDown() // 选中 row-0
    await pressDown() // 选中 row-1，触发滚动

    // 可见区（表头 28 起）高度 272，行底 272+28 超出 → 滚 28px 让行贴住底边
    expect(viewport.scrollTop).toBe(28)
  })

  it('选中行已可见时不滚动', async () => {
    const data = Array.from({ length: 20 }, (_, index) => ({ id: `row-${index}` }))
    const { container } = renderTable(data)
    await screen.findByText('row-0')

    const viewport = container.querySelector<HTMLElement>('.virtual-table-list-container')!
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(domRect(100, 300))
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.id === 'row-1') return domRect(180, ITEM_HEIGHT)
      return domRect(0, 0)
    })

    await pressDown()
    await pressDown()

    expect(viewport.scrollTop).toBe(0)
  })

  it('选中行在表头上方时滚回表头下沿', async () => {
    const data = Array.from({ length: 20 }, (_, index) => ({ id: `row-${index}` }))
    const { container } = renderTable(data)
    await screen.findByText('row-0')

    const viewport = container.querySelector<HTMLElement>('.virtual-table-list-container')!
    viewport.scrollTop = 200
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(domRect(100, 300))
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      // 行顶落在表头覆盖区域（rowTop = 110 - 100 - 28 = -18）
      if (this.id === 'row-1') return domRect(110, ITEM_HEIGHT)
      return domRect(0, 0)
    })

    await pressDown()
    await pressDown()

    expect(viewport.scrollTop).toBe(182)
  })
})
