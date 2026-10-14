import { afterEach, describe, expect, it, vi } from 'vitest'
import { YakitRoute } from '@/enums/yakitRoute'
import type { MultipleNodeInfo } from '../MainOperatorContentType'
import type { YakitMenuItemProps } from '@/components/yakitUI/YakitMenu/YakitMenu'
import {
  buildSubTabOverviewMenu,
  countSubTabs,
  isSubTabLeaf,
  isSubTabOverviewRoute,
  scrollSubTabIntoView,
} from '../subTabOverview'

const tab = (id: string, verbose: string, groupId = '0'): MultipleNodeInfo => ({
  id,
  verbose,
  groupId,
  sortFieId: 1,
})

const group = (id: string, verbose: string, children: MultipleNodeInfo[], expand = false): MultipleNodeInfo => ({
  id,
  verbose,
  groupId: '0',
  sortFieId: 1,
  expand,
  groupChildren: children,
})

describe('subTabOverview', () => {
  it('只对白名单路由开启', () => {
    expect(isSubTabOverviewRoute(YakitRoute.HTTPFuzzer)).toBe(true)
    expect(isSubTabOverviewRoute(YakitRoute.Codec)).toBe(false)
  })

  it('统计未分组页和组内页，空组不计数', () => {
    const nodes = [
      tab('a', 'A'),
      group('[g]-1-group', '组1', [tab('b', 'B', '[g]-1-group'), tab('c', 'C', '[g]-1-group')]),
      group('[empty]-2-group', '空组', []),
    ]
    expect(countSubTabs(nodes)).toBe(3)
  })

  it('未分组的页是一级菜单，组名展开为组内页', () => {
    const nodes = [tab('a', '请求1'), group('[g]-1-group', '登录', [tab('b', '登录-1', '[g]-1-group')])]
    const menu = buildSubTabOverviewMenu(nodes) as YakitMenuItemProps[]
    expect(menu.map((item) => item.label)).toEqual(['请求1', '登录'])
    expect(menu[0].children).toBeUndefined()
    expect(menu[1].children?.map((item) => item.label)).toEqual(['登录-1'])
    expect(menu[1].children?.[0].key).toBe('b')
  })

  it('空组不出现在菜单里', () => {
    const menu = buildSubTabOverviewMenu([group('[empty]-2-group', '空组', [])])
    expect(menu).toEqual([])
  })

  it('组 id 不是叶子页', () => {
    const nodes = [group('[g]-1-group', '组1', [tab('b', 'B', '[g]-1-group')]), tab('a', 'A')]
    expect(isSubTabLeaf(nodes, 'b')).toBe(true)
    expect(isSubTabLeaf(nodes, 'a')).toBe(true)
    expect(isSubTabLeaf(nodes, '[g]-1-group')).toBe(false)
  })
})

describe('scrollSubTabIntoView', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })
  const stubRect = (el: HTMLElement, left: number, right: number) => {
    const rect = { left, right, top: 0, bottom: 32, width: right - left, height: 32 } as DOMRect
    el.getBoundingClientRect = () => rect
    el.getClientRects = () => [rect] as unknown as DOMRectList
  }
  const setup = (targetInViewLeft: number, targetInViewRight: number, containerLeft = 0, clientWidth = 500) => {
    const container = document.createElement('div')
    // jsdom 无布局，clientWidth/scrollLeft 用可写自有属性模拟
    Object.defineProperty(container, 'clientWidth', { value: clientWidth })
    Object.defineProperty(container, 'scrollLeft', { value: 0, writable: true, configurable: true })
    stubRect(container, containerLeft, containerLeft + clientWidth)
    const target = document.createElement('div')
    target.setAttribute('data-rfd-draggable-id', 'b')
    stubRect(target, targetInViewLeft, targetInViewRight)
    container.appendChild(target)
    document.body.appendChild(container)
    return { container, target }
  }

  it('容器或目标不存在时不处理', () => {
    expect(() => scrollSubTabIntoView(null, 'b')).not.toThrow()
    const { container } = setup(0, 100)
    expect(() => scrollSubTabIntoView(container, 'not-exist')).not.toThrow()
    expect(container.scrollLeft).toBe(0)
  })

  it('目标在右侧可视区外时滚动到左侧留 60px', () => {
    const { container } = setup(800, 900)
    container.scrollLeft = 100
    scrollSubTabIntoView(container, 'b')
    // 800 - 0 - 60 = 740，叠加原 scrollLeft 100
    expect(container.scrollLeft).toBe(840)
  })

  it('目标完全可见时不滚动', () => {
    const { container } = setup(100, 200)
    container.scrollLeft = 50
    scrollSubTabIntoView(container, 'b')
    expect(container.scrollLeft).toBe(50)
  })

  it('目标在左侧可视区外时向左回滚', () => {
    const { container } = setup(-300, -200)
    container.scrollLeft = 400
    scrollSubTabIntoView(container, 'b')
    // -300 - 0 - 60 = -360，叠加原 scrollLeft 400
    expect(container.scrollLeft).toBe(40)
  })

  it('容器暂不可见（跨页签切换 display:none）时等下一帧再滚动', async () => {
    const { container, target } = setup(800, 900)
    // 模拟点击菜单那一刻：WebFuzzer 页体仍为 display:none，rect 宽度为 0
    let visible = false
    const hiddenRect = { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 } as DOMRect
    container.getBoundingClientRect = () => hiddenRect
    // 下一帧布局恢复：容器 rect 变回可视尺寸
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => {
        visible = true
        stubRect(container, 0, 500)
        cb(0)
      }, 0)
      return 0
    })
    // 目标 rect 同样只在可见后有效
    const originalTargetRects = target.getClientRects
    target.getClientRects = () => (visible ? originalTargetRects() : ([] as unknown as DOMRectList))

    try {
      scrollSubTabIntoView(container, 'b')
      // 帧回调执行前不应滚动
      expect(visible).toBe(false)
      expect(container.scrollLeft).toBe(0)
      await new Promise((resolve) => setTimeout(resolve, 10))
      // 下一帧已滚动到位：800 - 0 - 60 = 740
      expect(container.scrollLeft).toBe(740)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
