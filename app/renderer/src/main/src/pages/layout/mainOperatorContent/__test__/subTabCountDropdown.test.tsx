import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { YakitRoute } from '@/enums/yakitRoute'
import emiter from '@/utils/eventBus/eventBus'
import type { MultipleNodeInfo, PageCache } from '../MainOperatorContentType'
import { SubTabCountDropdown } from '../SubTabCountDropdown'
import {
  initSubTabGlobalListeners,
  registerSubTabPageHandlers,
  unregisterSubTabPageHandlers,
} from '../subTabEventRegistry'

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

/** 悬停角标后等待菜单出现（mouseEnterDelay 0.1s 由 waitFor 覆盖） */
const hoverBadge = async () => {
  fireEvent.mouseEnter(screen.getByText('3'))
  await waitFor(() => expect(screen.getByText('登录')).toBeInTheDocument(), { timeout: 2000 })
}

/** 悬停角标后确认菜单不会弹出（留出超过 mouseEnterDelay 的等待窗口） */
const hoverBadgeAndAssertNoMenu = async () => {
  fireEvent.mouseEnter(screen.getByText('3'))
  await new Promise((resolve) => setTimeout(resolve, 400))
  expect(screen.queryByText('请求1')).not.toBeInTheDocument()
  expect(screen.queryByText('登录')).not.toBeInTheDocument()
}

/** 模拟真实结构：角标挂在一级页签内，页签根节点带 onClick 切换 */
const renderInTab = (onTabClick: () => void, onSelect: (item: PageCache, key: string) => void) => {
  render(
    <div onClick={onTabClick}>
      <SubTabCountDropdown item={item} onSelect={onSelect} />
    </div>,
  )
}

/** 初始化全局事件监听（emiter → 注册表），并注册目标一级页的选择/展开处理器，返回真实链路会调用到的 spy */
let disposeGlobalListeners: (() => void) | undefined
const setupRegistryHandlers = () => {
  const handlers = {
    onSelectSubMenuById: vi.fn(),
    onExpandGroupByPageId: vi.fn(),
  }
  if (!disposeGlobalListeners) {
    disposeGlobalListeners = initSubTabGlobalListeners()
  }
  registerSubTabPageHandlers(item.routeKey, handlers)
  return handlers
}

describe('SubTabCountDropdown', () => {
  afterEach(() => {
    cleanup()
    disposeGlobalListeners?.()
    disposeGlobalListeners = undefined
    unregisterSubTabPageHandlers(item.routeKey)
    emiter.all.clear()
  })

  it('处理器未注册（目标一级页未挂载）时悬停角标不弹菜单', async () => {
    renderInTab(vi.fn(), vi.fn())
    await hoverBadgeAndAssertNoMenu()
  })

  it('处理器注销（页面卸载）后再次悬停不再弹菜单', async () => {
    setupRegistryHandlers()
    unregisterSubTabPageHandlers(item.routeKey)

    renderInTab(vi.fn(), vi.fn())
    await hoverBadgeAndAssertNoMenu()
  })

  it('注册后悬停角标展示概览菜单', async () => {
    setupRegistryHandlers()
    render(<SubTabCountDropdown item={item} onSelect={vi.fn()} />)
    await hoverBadge()
    expect(screen.getByText('请求1')).toBeInTheDocument()
    expect(screen.getByText('登录')).toBeInTheDocument()
  })

  it('点击组名不触发切换', async () => {
    const onSelect = vi.fn()
    const onTabClick = vi.fn()
    const handlers = setupRegistryHandlers()
    renderInTab(onTabClick, onSelect)

    await hoverBadge()
    fireEvent.click(screen.getByText('登录'))

    expect(onSelect).not.toHaveBeenCalled()
    expect(handlers.onSelectSubMenuById).not.toHaveBeenCalled()
    expect(handlers.onExpandGroupByPageId).not.toHaveBeenCalled()
    expect(onTabClick).not.toHaveBeenCalled()
  })

  it('点击未分组叶子页：经真实事件链完成选择与展开', async () => {
    const onSelect = vi.fn()
    const onTabClick = vi.fn()
    const handlers = setupRegistryHandlers()
    renderInTab(onTabClick, onSelect)

    await hoverBadge()
    fireEvent.click(screen.getByText('请求1'))

    expect(onSelect).toHaveBeenCalledWith(item, item.routeKey)
    expect(handlers.onSelectSubMenuById).toHaveBeenCalledWith(JSON.stringify({ pageId: 'a' }))
    expect(handlers.onExpandGroupByPageId).toHaveBeenCalledWith('a')
  })
})
