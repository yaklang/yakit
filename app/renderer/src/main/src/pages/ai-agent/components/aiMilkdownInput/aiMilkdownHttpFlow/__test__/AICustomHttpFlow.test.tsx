import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useNodeViewContext } from '@prosemirror-adapter/react'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import type * as HttpFlowModule from '../AICustomHttpFlow'

vi.mock('@prosemirror-adapter/react', () => ({ useNodeViewContext: vi.fn() }))

const { AICustomHttpFlow } = await compileReactModule<typeof HttpFlowModule>(import.meta.url, '../AICustomHttpFlow.tsx')

function setupNode(flowIds: string[], editable = true) {
  const context = {
    node: { attrs: { flowIds, displayText: '引用流量', isSummary: true } },
    selected: false,
    view: { editable },
    contentRef: (element: HTMLElement | null) => {
      if (element) element.textContent = '引用流量'
    },
  }
  vi.mocked(useNodeViewContext).mockReturnValue(context as unknown as ReturnType<typeof useNodeViewContext>)
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AICustomHttpFlow 流量 ID 悬停展示', () => {
  it.each([true, false])('编辑状态 %s 下悬停展示 flowIds，离开后隐藏', async (editable) => {
    setupNode(['11', '12', '13'], editable)
    render(<AICustomHttpFlow />)
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

  it('flowIds 为空数组时不显示列表，保留原始标题', async () => {
    setupNode([])
    render(<AICustomHttpFlow />)
    const label = screen.getByText('引用流量')
    expect(label).toHaveAttribute('title', '引用流量')
    fireEvent.mouseEnter(label.closest('.ant-tag')!)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('节点 flowIds 更新后同步更新悬停内容', async () => {
    setupNode(['11', '12', '13'])
    const { rerender } = render(<AICustomHttpFlow />)
    fireEvent.mouseEnter(screen.getByText('引用流量').closest('.ant-tag')!)
    await screen.findByRole('list')
    setupNode(['21', '22'])
    rerender(<AICustomHttpFlow />)
    expect(
      within(screen.getByRole('list'))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['#21', '#22'])
  })
})
