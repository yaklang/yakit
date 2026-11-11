import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useNodeViewContext } from '@prosemirror-adapter/react'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import type * as ResourceReferenceModule from '../AICustomResourceReference'
import styles from '../AICustomResourceReference.module.scss'

vi.mock('@prosemirror-adapter/react', () => ({ useNodeViewContext: vi.fn() }))
vi.mock('../AICustomResourceReference.module.scss', () => ({
  default: {
    'resource-reference-custom': 'resource-reference-custom',
    'resource-reference-custom-readonly': 'resource-reference-custom-readonly',
  },
}))
vi.mock('@yakit-libs/yakit-ui-icons/outline', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  BugOutlined: () => <svg data-testid="risk-icon" />,
  Log2Outlined: () => <svg data-testid="http-icon" />,
}))

const { AICustomResourceReference } = await compileReactModule<typeof ResourceReferenceModule>(
  import.meta.url,
  '../AICustomResourceReference.tsx',
)

const setupNode = (ids: string[], editable = true, type: 'http' | 'risk' = 'http') => {
  const displayText = type === 'risk' ? '#101, #102' : '引用流量'
  const context = {
    node: { attrs: { type, ids, displayText, isSummary: true } },
    selected: false,
    view: { editable },
    contentRef: (element: HTMLElement | null) => {
      if (element) element.textContent = displayText
    },
  }
  vi.mocked(useNodeViewContext).mockReturnValue(context as unknown as ReturnType<typeof useNodeViewContext>)
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AICustomResourceReference 流量 ID 悬停展示', () => {
  it.each(['http', 'risk'] as const)('按 %s 类型显示图标，包括空 ID 列表', (type) => {
    setupNode([], true, type)
    render(<AICustomResourceReference />)
    expect(screen.getByTestId(`${type}-icon`)).toBeInTheDocument()
    expect(screen.queryByTestId(`${type === 'http' ? 'risk' : 'http'}-icon`)).not.toBeInTheDocument()
  })

  it.each([true, false])('编辑状态 %s 下风险复用聚合标签和 ID 悬停列表', async (editable) => {
    setupNode(['101', '102'], editable, 'risk')
    render(<AICustomResourceReference />)
    const label = screen.getByText('#101, #102')
    const tag = label.closest('.ant-tag')!
    expect(label).not.toHaveAttribute('title')
    expect(tag).toHaveClass(styles['resource-reference-custom'])
    if (!editable) expect(tag).toHaveClass(styles['resource-reference-custom-readonly'])
    fireEvent.mouseEnter(tag)
    const list = await screen.findByRole('list')
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['#101', '#102'])
    expect(list.querySelector('.ant-tag-close-icon')).toBeNull()
    fireEvent.mouseLeave(tag)
    await waitFor(() => expect(screen.queryByRole('list')).not.toBeInTheDocument())
  })

  it.each([true, false])('编辑状态 %s 下悬停展示 ids，离开后隐藏', async (editable) => {
    setupNode(['11', '12', '13'], editable)
    render(<AICustomResourceReference />)
    const tag = screen.getByText('引用流量').closest('.ant-tag')!
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    fireEvent.mouseEnter(tag)
    const list = await screen.findByRole('list')
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['#11', '#12', '#13'])
    expect(list.querySelector('.ant-tag-close-icon')).toBeNull()
    expect(tag.querySelector('.ant-tag-close-icon')).toBeNull()
    fireEvent.mouseLeave(tag)
    await waitFor(() => expect(screen.queryByRole('list')).not.toBeInTheDocument())
  })

  it('ids 为空数组时不显示列表，保留原始标题', async () => {
    setupNode([])
    render(<AICustomResourceReference />)
    const label = screen.getByText('引用流量')
    expect(label).toHaveAttribute('title', '引用流量')
    fireEvent.mouseEnter(label.closest('.ant-tag')!)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('节点 ids 更新后同步更新悬停内容', async () => {
    setupNode(['11', '12', '13'])
    const { rerender } = render(<AICustomResourceReference />)
    fireEvent.mouseEnter(screen.getByText('引用流量').closest('.ant-tag')!)
    await screen.findByRole('list')
    setupNode(['21', '22'])
    rerender(<AICustomResourceReference />)
    expect(
      within(screen.getByRole('list'))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['#21', '#22'])
  })
})
