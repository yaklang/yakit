import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildHTTPFlowTableColumnArr } from '../HTTPFlowTable.columns'
import type { BuildHTTPFlowTableColumnsContext } from '../HTTPFlowTable.columns'

vi.mock('../components', () => ({ RangeInputNumberTableWrapper: () => null, SearchInputTableWrapper: () => null }))
vi.mock('../HTTPFlowTable.utils', () => ({ isHTTPFlowFavorite: () => false, onConvertBodySizeByUnit: vi.fn() }))
vi.mock('@/pages/hTTPHistoryAnalysis/HTTPHistory/HTTPHistoryFilter', () => ({ defalutColumnsOrder: [] }))
vi.mock('@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: ({ menu, children }: any) => (
    <div>
      {children}
      {menu.data.map((item: any) => (
        <button key={item.key} onClick={(domEvent) => menu.onClick({ key: item.key, domEvent })}>
          {item.label}
        </button>
      ))}
    </div>
  ),
}))

afterEach(cleanup)

describe('AI flow row actions', () => {
  it.each([false, true])('toggles selection and preserves dropdown actions, selected=%s', (selected) => {
    const toggle = vi.fn()
    const browser = vi.fn()
    const favorite = vi.fn()
    const expand = vi.fn()
    const rowClick = vi.fn()
    const ctx = {
      t: (key: string) => key,
      suffixList: [],
      comBuiltinTagList: [],
      actionHandlers: {
        onToggleAiFlowSelection: toggle,
        isAiFlowSelected: () => selected,
        onToggleFavorite: favorite,
        onOpenInBrowser: browser,
        onExpand: expand,
      },
    } as unknown as BuildHTTPFlowTableColumnsContext
    const column = buildHTTPFlowTableColumnArr(ctx).find((item) => item.dataKey === 'action')!
    const row = { Id: 7, Hash: 'hash', Tags: '' }
    render(<div onClick={rowClick}>{column.render!(null, row, 0)}</div>)
    const button = screen.getByRole('button', { name: selected ? 'YakitButton.cancel' : 'YakitButton.add' })
    expect(button).toHaveAttribute('aria-pressed', String(selected))
    if (selected) expect(button).toHaveTextContent('YakitButton.added')
    fireEvent.click(button)
    expect(toggle).toHaveBeenCalledWith(7)
    const more = screen.getByRole('button', { name: 'YakitButton.more' })
    const clickMore = vi.spyOn(more, 'click')
    fireEvent.keyDown(more, { key: 'Enter' })
    expect(clickMore).toHaveBeenCalledOnce()
    clickMore.mockRestore()
    fireEvent.click(screen.getByText('HTTPFlowTable.RowContextMenu.favorite'))
    expect(favorite).toHaveBeenCalledWith(expect.anything(), row, true)
    fireEvent.click(screen.getByText('HTTPFlowTable.RowContextMenu.viewInBrowser'))
    expect(browser).toHaveBeenCalledWith(expect.anything(), row)
    fireEvent.click(screen.getByText('YakitButton.expand'))
    expect(expand).toHaveBeenCalledWith(expect.anything(), row)
    expect(rowClick).not.toHaveBeenCalled()
  })
})
