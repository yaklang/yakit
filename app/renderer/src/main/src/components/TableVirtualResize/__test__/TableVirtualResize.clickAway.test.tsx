import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TableVirtualResize } from '../TableVirtualResize'
import styles from '../TableVirtualResize.module.scss'

vi.mock('@/utils/globalShortcutKey/events/useShortcutKeyTrigger', () => ({ default: () => {} }))
vi.mock('@/utils/globalShortcutKey/events/global', () => ({ ShortcutKeyFocusType: { TableVirtual: 'table' } }))
vi.mock('@/utils/globalShortcutKey/shortcutKeyFocusHook/ShortcutKeyFocusHook', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}))
vi.mock('@/utils/kv', () => ({ getRemoteValue: async () => undefined }))
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

const renderTable = () => {
  const renderCell = vi.fn((value: string) => <span>{value}</span>)
  const onRowContextMenu = vi.fn()
  const view = (isRightClickBatchOperate = true) => (
    <DndProvider backend={HTML5Backend}>
      <button>Welcome</button>
      <TableVirtualResize
        renderKey="id"
        isRefresh={false}
        isRightClickBatchOperate={isRightClickBatchOperate}
        disableDeselect
        onRowContextMenu={onRowContextMenu}
        data={[{ id: 'first' }, { id: 'second' }]}
        columns={[{ title: 'ID', dataKey: 'id', render: renderCell }]}
      />
    </DndProvider>
  )
  const result = render(view())
  return {
    ...result,
    renderCell,
    onRowContextMenu,
    setBatchEnabled: (enabled: boolean) => result.rerender(view(enabled)),
  }
}

describe('TableVirtualResize outside clicks', () => {
  it('does not render cells again when there is no batch selection to clear', async () => {
    const { renderCell } = renderTable()
    await screen.findByText('second')
    renderCell.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Welcome' }))
    fireEvent.click(screen.getByRole('button', { name: 'Welcome' }))

    expect(renderCell).not.toHaveBeenCalled()
  })

  it('clears a Shift selection on an outside click and allows selecting again', async () => {
    const { onRowContextMenu } = renderTable()
    const first = await screen.findByText('first')
    const second = screen.getByText('second')
    const selectedRows = () => {
      fireEvent.contextMenu(first)
      return onRowContextMenu.mock.lastCall?.[1]
    }
    const selectRange = () => {
      fireEvent.click(first)
      fireEvent.mouseDown(second, { shiftKey: true, button: 0 })
      fireEvent.click(second, { shiftKey: true })
    }

    selectRange()
    expect(selectedRows()).toEqual([{ id: 'first' }, { id: 'second' }])
    fireEvent.click(screen.getByRole('button', { name: 'Welcome' }))
    expect(selectedRows()).toEqual([])
    selectRange()
    expect(selectedRows()).toEqual([{ id: 'first' }, { id: 'second' }])
  })

  it('only clears selection on outside clicks while batch selection is enabled', async () => {
    const { onRowContextMenu, setBatchEnabled } = renderTable()
    const first = await screen.findByText('first')
    const second = screen.getByText('second')
    fireEvent.click(first)
    fireEvent.mouseDown(second, { shiftKey: true, button: 0 })
    fireEvent.click(second, { shiftKey: true })

    setBatchEnabled(false)
    fireEvent.click(screen.getByRole('button', { name: 'Welcome' }))
    fireEvent.contextMenu(first)
    expect(onRowContextMenu.mock.lastCall?.[1]).toEqual([{ id: 'first' }, { id: 'second' }])

    setBatchEnabled(true)
    fireEvent.click(screen.getByRole('button', { name: 'Welcome' }))
    fireEvent.contextMenu(first)
    expect(onRowContextMenu.mock.lastCall?.[1]).toEqual([])
  })
})

const renderMultiColumnTable = (disableDeselect = true) => {
  const renderCell = vi.fn((value: string) => <span>{value}</span>)
  const onSetCurrentRow = vi.fn()
  const data = [
    { id: 'first', name: 'First row' },
    { id: 'second', name: 'Second row' },
    { id: 'third', name: 'Third row' },
  ]
  const columns = [
    { title: 'ID', dataKey: 'id', render: renderCell },
    { title: 'Name', dataKey: 'name', render: renderCell },
  ]
  const view = (selectedRowKeys?: string[], onRowDoubleClick?: (record?: (typeof data)[number]) => void) => (
    <DndProvider backend={HTML5Backend}>
      <button>Welcome</button>
      <TableVirtualResize
        renderKey="id"
        isRefresh={false}
        isRightClickBatchOperate
        disableDeselect={disableDeselect}
        onSetCurrentRow={onSetCurrentRow}
        onRowDoubleClick={onRowDoubleClick}
        data={data}
        columns={columns}
        rowSelection={selectedRowKeys && { selectedRowKeys }}
      />
    </DndProvider>
  )
  const result = render(view())
  return {
    renderCell,
    onSetCurrentRow,
    renderedValues: () => renderCell.mock.calls.map(([value]) => value).sort(),
    setCheckedRows: (keys: string[]) => result.rerender(view(keys)),
    setDoubleClick: (callback: (record?: (typeof data)[number]) => void) => result.rerender(view(undefined, callback)),
  }
}

describe('TableVirtualResize row click rendering', () => {
  it('uses the latest double-click callback and passes the row from the second column', async () => {
    const { onSetCurrentRow, setDoubleClick } = renderMultiColumnTable()
    const secondName = await screen.findByText('Second row')
    const previousCallback = vi.fn()
    const nextCallback = vi.fn()
    setDoubleClick(previousCallback)
    setDoubleClick(nextCallback)

    fireEvent.click(secondName)
    fireEvent.doubleClick(secondName)

    expect(onSetCurrentRow).toHaveBeenLastCalledWith({ id: 'second', name: 'Second row' })
    expect(previousCallback).not.toHaveBeenCalled()
    expect(nextCallback).toHaveBeenCalledExactlyOnceWith({ id: 'second', name: 'Second row' })
  })

  it('only renders the affected first-column cells when controlled checkboxes change', async () => {
    const { renderCell, renderedValues, setCheckedRows } = renderMultiColumnTable()
    await screen.findByText('Third row')
    setCheckedRows([])
    renderCell.mockClear()

    setCheckedRows(['first'])

    expect(renderedValues()).toEqual(['first'])
    const firstCell = screen.getByText('first').closest('.' + styles['virtual-table-row-cell'])
    expect(firstCell?.querySelector('input[type="checkbox"]')).toBeChecked()

    renderCell.mockClear()
    setCheckedRows(['second'])

    expect(renderedValues()).toEqual(['first', 'second'])
    expect(firstCell?.querySelector('input[type="checkbox"]')).not.toBeChecked()
    const secondCell = screen.getByText('second').closest('.' + styles['virtual-table-row-cell'])
    expect(secondCell?.querySelector('input[type="checkbox"]')).toBeChecked()
  })

  it('renders only the clicked row, then the old and new rows when switching selection', async () => {
    const { renderCell, renderedValues } = renderMultiColumnTable()
    await screen.findByText('Third row')
    renderCell.mockClear()

    fireEvent.click(screen.getByText('first'))
    expect(renderedValues()).toEqual(['First row', 'first'])

    renderCell.mockClear()
    fireEvent.click(screen.getByText('second'))
    expect(renderedValues()).toEqual(['First row', 'Second row', 'first', 'second'])
  })

  it('does not render cells again when clicking the selected row with deselection disabled', async () => {
    const { renderCell } = renderMultiColumnTable()
    const first = await screen.findByText('first')
    fireEvent.click(first)
    renderCell.mockClear()

    fireEvent.click(first)

    expect(renderCell).not.toHaveBeenCalled()
    expect(first.closest('.' + styles['virtual-table-row-cell'])).toHaveClass(styles['virtual-table-active-row'])
  })

  it('deselects the current row and only renders its cells when deselection is enabled', async () => {
    const { renderCell, renderedValues, onSetCurrentRow } = renderMultiColumnTable(false)
    const first = await screen.findByText('first')
    fireEvent.click(first)
    expect(first.closest('.' + styles['virtual-table-row-cell'])).toHaveClass(styles['virtual-table-active-row'])
    renderCell.mockClear()

    fireEvent.click(first)

    expect(renderedValues()).toEqual(['First row', 'first'])
    expect(first.closest('.' + styles['virtual-table-row-cell'])).not.toHaveClass(styles['virtual-table-active-row'])
    expect(onSetCurrentRow).toHaveBeenLastCalledWith(undefined, { id: 'first', name: 'First row' })
  })

  it('only renders the Shift-selected rows when clearing the range with an outside click', async () => {
    const { renderCell, renderedValues } = renderMultiColumnTable()
    const first = await screen.findByText('first')
    const second = screen.getByText('second')
    fireEvent.click(first)
    fireEvent.mouseDown(second, { shiftKey: true, button: 0 })
    fireEvent.click(second, { shiftKey: true })
    expect(first.closest('.' + styles['virtual-table-row-cell'])).toHaveClass(styles['virtual-table-batch-active-row'])
    expect(second.closest('.' + styles['virtual-table-row-cell'])).toHaveClass(styles['virtual-table-batch-active-row'])
    renderCell.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Welcome' }))

    expect(renderedValues()).toEqual(['First row', 'Second row', 'first', 'second'])
    expect(first.closest('.' + styles['virtual-table-row-cell'])).not.toHaveClass(
      styles['virtual-table-batch-active-row'],
    )
    expect(second.closest('.' + styles['virtual-table-row-cell'])).not.toHaveClass(
      styles['virtual-table-batch-active-row'],
    )
  })
})
