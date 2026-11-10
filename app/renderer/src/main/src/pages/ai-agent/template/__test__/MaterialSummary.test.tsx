import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MaterialSummary from '../aiAddMaterialsPopover/materialSummary/MaterialSummary'
import type { MaterialSummaryRow } from '../aiAddMaterialsPopover/materialSummary/type'

vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ content }: { content: ReactNode }) => <>{content}</>,
}))

afterEach(cleanup)

const renderRow = (actions: Pick<MaterialSummaryRow, 'onOpen' | 'onRemove'>) =>
  render(
    <MaterialSummary
      onOpen={vi.fn()}
      groups={[
        {
          key: 'other',
          label: '其他资料',
          title: '其他已添加资料',
          count: 1,
          rows: [{ key: 'attachments', name: '附件', icon: <svg data-testid="row-icon" />, count: 1, ...actions }],
        },
      ]}
    />,
  )

describe('MaterialSummary 条目打开操作', () => {
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
