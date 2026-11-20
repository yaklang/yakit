import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TableVirtualResize } from '../TableVirtualResize'
import { parseShortcutKeyEvent } from '@/utils/globalShortcutKey/utils'

vi.mock('@/utils/globalShortcutKey/events/useShortcutKeyTrigger', () => ({ default: () => {} }))
vi.mock('@/utils/globalShortcutKey/events/global', () => ({
  ShortcutKeyFocusType: { TableVirtual: 'table' },
  GlobalShortcutKey: {
    TableVirtualUP: 'tableVirtualUP*common',
    TableVirtualDown: 'tableVirtualDown*common',
  },
}))
// 默认按内置绑定解析；改绑场景由用例通过 mockReturnValueOnce 覆盖
vi.mock('@/utils/globalShortcutKey/utils', () => ({
  convertKeyEventToKeyCombination: vi.fn((e: KeyboardEvent) => [e.key === 'ArrowUp' ? 'up' : 'down']),
  parseShortcutKeyEvent: vi.fn((keys: string[]) =>
    keys[0] === 'up' ? 'tableVirtualUP*common' : 'tableVirtualDown*common',
  ),
}))
vi.mock('@/utils/globalShortcutKey/shortcutKeyFocusHook/ShortcutKeyFocusHook', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}))
vi.mock('@/utils/kv', () => ({ getRemoteValue: async () => undefined }))
// CI 的根配置将样式模块替换为空对象；为容器选择器提供稳定映射。
vi.mock('../TableVirtualResize.module.scss', () => ({
  default: {
    'virtual-table-list-container': 'virtual-table-list-container',
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
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const renderTable = (useUpAndDown: boolean) => {
  const view = (flag: boolean) => (
    <DndProvider backend={HTML5Backend}>
      <TableVirtualResize
        renderKey="id"
        isRefresh={false}
        data={[{ id: 'first' }, { id: 'second' }]}
        columns={[
          { title: 'ID', dataKey: 'id' },
          { title: '操作', dataKey: 'op', render: () => <input aria-label="op-input" /> },
        ]}
        useUpAndDown={flag}
      />
    </DndProvider>
  )
  return render(view(useUpAndDown))
}

describe('TableVirtualResize 方向键滚动', () => {
  it('表格内按方向键时阻止浏览器默认滚动', async () => {
    const { container } = renderTable(true)
    await screen.findByText('second')

    const viewport = container.querySelector('.virtual-table-list-container')!
    // fireEvent 返回 false 表示 defaultPrevented 已生效
    expect(fireEvent.keyDown(viewport, { key: 'ArrowDown' })).toBe(false)
    expect(fireEvent.keyDown(viewport, { key: 'ArrowUp' })).toBe(false)
  })

  it('输入框内的方向键不受影响', async () => {
    const { container } = renderTable(true)
    await screen.findByText('second')

    const input = container.querySelector('input[aria-label="op-input"]')!
    expect(fireEvent.keyDown(input, { key: 'ArrowDown' })).toBe(true)
  })

  it('未开启上下键选中时不拦截方向键', async () => {
    const { container } = renderTable(false)
    await screen.findByText('second')

    const viewport = container.querySelector('.virtual-table-list-container')!
    expect(fireEvent.keyDown(viewport, { key: 'ArrowDown' })).toBe(true)
  })

  it('快捷键改绑后不再拦截方向键', async () => {
    const { container } = renderTable(true)
    await screen.findByText('second')

    // 模拟设置页把表格上下键改绑到其他按键：方向键不再命中表格事件
    vi.mocked(parseShortcutKeyEvent).mockReturnValueOnce(null)
    const viewport = container.querySelector('.virtual-table-list-container')!
    expect(fireEvent.keyDown(viewport, { key: 'ArrowDown' })).toBe(true)
  })
})
