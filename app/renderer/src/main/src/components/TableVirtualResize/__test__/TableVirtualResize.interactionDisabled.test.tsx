import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type * as Ahooks from 'ahooks'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { TableVirtualResize } from '../TableVirtualResize'

const shortcutState = vi.hoisted(() => ({
  callbacks: new Map<string, (focus?: string) => void>(),
}))

vi.mock('ahooks', async (importOriginal) => {
  const actual = await importOriginal<typeof Ahooks>()
  return {
    ...actual,
    useInViewport: () => [true],
    useVirtualList: (data: unknown[]) => [data.map((item, index) => ({ data: item, index })), vi.fn()],
  }
})

vi.mock('react-resize-detector', async () => {
  const React = await import('react')
  return {
    default: function ResizeDetectorMock({ onResize }: { onResize?: (width: number, height: number) => void }) {
      React.useEffect(() => onResize?.(600, 300), [onResize])
      return null
    },
  }
})

vi.mock('@/utils/globalShortcutKey/events/useShortcutKeyTrigger', () => ({
  default: (name: string, callback: (focus?: string) => void) => shortcutState.callbacks.set(name, callback),
}))
vi.mock('@/utils/globalShortcutKey/shortcutKeyFocusHook/ShortcutKeyFocusHook', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@/utils/globalShortcutKey/events/global', () => ({ ShortcutKeyFocusType: { TableVirtual: 'tableVirtual' } }))
vi.mock('uuid', () => ({ v4: () => 'interaction-test' }))
vi.mock('@/utils/kv', () => ({ getRemoteValue: vi.fn().mockResolvedValue('false') }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { on: vi.fn(), off: vi.fn() } }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ i18n: { language: 'zh' }, t: (key: string) => key }),
}))
vi.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, vi.fn()],
  useDrop: () => [{ handlerId: null }, vi.fn()],
}))

interface Row {
  ID: number
  label: string
  invalid?: boolean
}

const rows: Row[] = [
  { ID: 1, label: 'valid' },
  { ID: 2, label: 'invalid', invalid: true },
]

describe('TableVirtualResize disabled row interactions', () => {
  beforeAll(() => {
    class ResizeObserverMock {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  })

  beforeEach(() => shortcutState.callbacks.clear())
  afterEach(cleanup)

  const renderTable = async (data: Row[] = rows) => {
    const setCurrentIndex = vi.fn()
    const onSetCurrentRow = vi.fn()
    render(
      <div style={{ height: 300, width: 600 }}>
        <TableVirtualResize<Row>
          columns={[{ title: 'row', dataKey: 'label' }]}
          data={data}
          isRefresh={false}
          isRightClickBatchOperate
          isShowTitle={false}
          onSetCurrentRow={onSetCurrentRow}
          pagination={{ page: 1, limit: 20, total: data.length, onChange: vi.fn() }}
          renderKey="ID"
          rowInteractionDisabled={(record) => record.invalid === true}
          setCurrentIndex={setCurrentIndex}
          useUpAndDown
        />
      </div>,
    )

    return { onSetCurrentRow, setCurrentIndex }
  }

  it('does not write current state when a disabled row is clicked', async () => {
    const { onSetCurrentRow, setCurrentIndex } = await renderTable()

    fireEvent.click(await screen.findByText('invalid'))

    expect(setCurrentIndex).not.toHaveBeenCalled()
    expect(onSetCurrentRow).not.toHaveBeenCalled()
  })

  it('does not create a Shift range ending on a disabled row', async () => {
    const { onSetCurrentRow, setCurrentIndex } = await renderTable()
    fireEvent.click(await screen.findByText('valid'))
    fireEvent.mouseDown(document, { button: 0, shiftKey: true })

    fireEvent.click(screen.getByText('invalid'))

    expect(setCurrentIndex).toHaveBeenCalledTimes(1)
    expect(setCurrentIndex).toHaveBeenLastCalledWith(0)
    expect(onSetCurrentRow).toHaveBeenCalledTimes(1)
    expect(onSetCurrentRow).toHaveBeenLastCalledWith(rows[0])
    expect(document.querySelector('[class*="virtual-table-batch-active-row"]')).toBeNull()
  })

  it('does not write current state when keyboard navigation targets a disabled row', async () => {
    const { onSetCurrentRow, setCurrentIndex } = await renderTable()
    fireEvent.click(await screen.findByText('valid'))
    const down = shortcutState.callbacks.get('tableVirtualDown*common')

    await act(() => down?.('tableVirtual-interaction-test'))

    expect(setCurrentIndex).toHaveBeenCalledTimes(1)
    expect(setCurrentIndex).toHaveBeenLastCalledWith(0)
    expect(onSetCurrentRow).toHaveBeenCalledTimes(1)
    expect(onSetCurrentRow).toHaveBeenLastCalledWith(rows[0])
  })
})
