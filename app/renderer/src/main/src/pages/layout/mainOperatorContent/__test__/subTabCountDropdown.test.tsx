import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { YakitRoute } from '@/enums/yakitRoute'
import emiter from '@/utils/eventBus/eventBus'
import type { MultipleNodeInfo, PageCache } from '../MainOperatorContentType'
import { SubTabCountDropdown } from '../SubTabCountDropdown'

const tab = (id: string, verbose: string, groupId = '0'): MultipleNodeInfo => ({
  id,
  verbose,
  groupId,
  sortFieId: 1,
})

const group = (id: string, verbose: string, children: MultipleNodeInfo[]): MultipleNodeInfo => ({
  id,
  verbose,
  groupId: '0',
  sortFieId: 1,
  expand: false,
  groupChildren: children,
})

const item: PageCache = {
  routeKey: YakitRoute.HTTPFuzzer,
  route: YakitRoute.HTTPFuzzer,
  verbose: 'Web Fuzzer',
  multipleNode: [
    tab('a', '请求1'),
    group('[g]-1-group', '登录', [tab('b', '登录-1', '[g]-1-group'), tab('c', '登录-2', '[g]-1-group')]),
  ],
} as unknown as PageCache

const hoverBadge = async () => {
  fireEvent.mouseEnter(screen.getByText('3'))
  await waitFor(() => expect(screen.getByText('登录')).toBeInTheDocument(), { timeout: 2000 })
}

/** 模拟真实结构：角标挂在一级页签内，页签根节点带 onClick 切换 */
const renderInTab = (onTabClick: () => void, onSelect: (item: PageCache, key: string) => void) => {
  render(
    <div onClick={onTabClick}>
      <SubTabCountDropdown item={item} onSelect={onSelect} />
    </div>,
  )
}

describe('SubTabCountDropdown', () => {
  afterEach(() => {
    cleanup()
    emiter.all.clear()
  })

  it('悬停角标展示概览菜单', async () => {
    const onSelect = vi.fn()
    render(<SubTabCountDropdown item={item} onSelect={onSelect} />)
    await hoverBadge()
    expect(screen.getByText('请求1')).toBeInTheDocument()
    expect(screen.getByText('登录')).toBeInTheDocument()
  })

  it('点击组名不触发切换', async () => {
    const onSelect = vi.fn()
    const onTabClick = vi.fn()
    const listener = vi.fn()
    emiter.on('switchSubMenuItem', listener)
    renderInTab(onTabClick, onSelect)

    await hoverBadge()
    fireEvent.click(screen.getByText('登录'))

    expect(onSelect).not.toHaveBeenCalled()
    expect(listener).not.toHaveBeenCalled()
    expect(onTabClick).not.toHaveBeenCalled()
  })

  it('点击未分组叶子页触发切换', async () => {
    const onSelect = vi.fn()
    const onTabClick = vi.fn()
    const listener = vi.fn()
    emiter.on('switchSubMenuItem', listener)
    renderInTab(onTabClick, onSelect)

    await hoverBadge()
    fireEvent.click(screen.getByText('请求1'))

    expect(onSelect).toHaveBeenCalledWith(item, item.routeKey)
    expect(listener).toHaveBeenCalledWith(JSON.stringify({ pageId: 'a' }))
  })
})
