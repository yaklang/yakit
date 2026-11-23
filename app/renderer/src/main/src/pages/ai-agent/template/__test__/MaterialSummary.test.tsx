import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MaterialSummary from '../aiAddMaterialsPopover/materialSummary/MaterialSummary'
import type { MaterialSummaryRow } from '../aiAddMaterialsPopover/materialSummary/type'
import { groupNarrowMaterials } from '../aiAddMaterialsPopover/groupNarrowMaterials'
import { ChatContentWidthContext } from '../../aiAgentChat/AIAgentChatLayout/ChatContentWidthContext'

vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ content, children }: { content: ReactNode; children: ReactNode }) => (
    <>
      {children}
      {content}
    </>
  ),
}))

afterEach(cleanup)

it.each(['narrow', 'wide'] as const)('%s 布局清除最后一类技能后，流量标签恢复其他资料的文案和配色', (width) => {
  const other = {
    key: 'other',
    label: '其他资料',
    title: '已添加资料',
    count: 1,
    rows: [{ key: 'http', name: '流量', icon: null }],
  }
  const forge = { key: 'forge', label: '技能', title: '技能', count: 1, rows: [] }
  const { container, rerender } = render(
    <MaterialSummary onOpen={vi.fn()} groups={groupNarrowMaterials([forge, other], '其他资料', '已添加资料')} />,
    {
      wrapper: ({ children }) => (
        <ChatContentWidthContext.Provider value={width}>{children}</ChatContentWidthContext.Provider>
      ),
    },
  )
  expect(screen.getByRole('button', { name: 'AIChatTextarea.materials 2' })).toBeInTheDocument()
  expect(container.querySelector('[data-category="other"]')?.hasAttribute('data-merged-categories')).toBe(true)
  rerender(<MaterialSummary onOpen={vi.fn()} groups={groupNarrowMaterials([other], '其他资料', '已添加资料')} />)
  expect(screen.getByRole('button', { name: '其他资料 1' })).toBeInTheDocument()
  expect(container.querySelector('[data-category="other"]')?.hasAttribute('data-merged-categories')).toBe(false)
})

const renderRow = (actions: Pick<MaterialSummaryRow, 'onOpen' | 'onRemove' | 'onClearCategory'>) =>
  render(
    <MaterialSummary
      onOpen={vi.fn()}
      groups={[
        {
          key: 'other',
          label: '其他资料',
          title: '其他已添加资料',
          allowCategoryRemoval: !!actions.onClearCategory,
          count: 1,
          rows: [{ key: 'attachments', name: '附件', icon: <svg data-testid="row-icon" />, count: 1, ...actions }],
        },
      ]}
    />,
  )

describe('MaterialSummary 条目打开操作', () => {
  it('分类清理按钮位于数量左侧，清理后仍可通过箭头导航', () => {
    const onOpen = vi.fn()
    const onClearCategory = vi.fn()
    renderRow({ onOpen, onClearCategory })
    const row = screen.getByRole('listitem')
    const clear = within(row).getByRole('button', { name: 'YakitButton.delete 附件' })
    expect(clear.nextElementSibling).toBe(within(row).getByText('1'))
    fireEvent.click(clear)
    expect(onClearCategory).toHaveBeenCalledOnce()
    expect(onOpen).not.toHaveBeenCalled()
    fireEvent.click(within(row).getByRole('button', { name: '附件' }))
    expect(onOpen).toHaveBeenCalledOnce()
  })

  it.each(['整行', '图标', '文案', '数量', '箭头'] as const)('点击%s仅打开一次', (target) => {
    const onOpen = vi.fn()
    renderRow({ onOpen })
    const row = screen.getByRole('listitem')
    const targets = {
      整行: row,
      图标: within(row).getByTestId('row-icon'),
      文案: within(row).getByText('附件'),
      数量: within(row).getByText('1'),
      箭头: within(row).getByRole('button', { name: '附件' }),
    }
    fireEvent.click(targets[target])
    expect(onOpen).toHaveBeenCalledExactlyOnceWith()
  })

  it('可取消条目仍仅通过取消按钮移除，不触发打开操作', () => {
    const onOpen = vi.fn()
    const onRemove = vi.fn()
    renderRow({ onOpen, onRemove })
    const row = screen.getByRole('listitem')
    fireEvent.click(within(row).getByText('附件'))
    expect(onOpen).not.toHaveBeenCalled()
    expect(onRemove).not.toHaveBeenCalled()
    fireEvent.click(within(row).getByRole('button', { name: 'YakitButton.cancel 附件' }))
    expect(onRemove).toHaveBeenCalledOnce()
    expect(onOpen).not.toHaveBeenCalled()
  })
})

it('分组关闭仅触发组清理，保留完整可访问名称', () => {
  const remove = vi.fn()
  const open = vi.fn()
  render(
    <MaterialSummary
      onOpen={open}
      groups={[{ key: 'other', label: '其他资料', title: '已添加', count: 2, rows: [], onRemove: remove }]}
    />,
  )
  expect(screen.getByRole('button', { name: '其他资料 2' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '其他资料 ×' }))
  expect(remove).toHaveBeenCalledOnce()
  expect(open).not.toHaveBeenCalled()
})
