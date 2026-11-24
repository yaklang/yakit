import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as AntdModule from 'antd'

/**
 * 以 antd Menu 桩捕获 builtinPlacements：注入 rightTop/rightBottom 左偏锚点即为「子菜单向左展开」。
 * jsdom 无真实布局（getBoundingClientRect / clientWidth 恒为 0），布局测量均需打桩。
 */
vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof AntdModule>()
  const MenuStub = (props: { builtinPlacements?: Record<string, { points: string[] }> }) => (
    <div
      data-testid="yakit-menu"
      data-builtin-placements={props.builtinPlacements ? JSON.stringify(props.builtinPlacements) : ''}
    />
  )
  return { ...actual, Menu: MenuStub }
})

import { showByRightContext } from '../showByRightContext'
import styles from '../showByRightContext.module.scss'
import type { YakitMenuProp } from '../YakitMenu'

const menuProps: YakitMenuProp = { data: [{ key: 'item', label: '菜单项' }], width: 128 }

const deepMenuProps: YakitMenuProp = {
  data: [
    {
      key: 'lv1',
      label: '一级菜单',
      children: [
        {
          key: 'lv2',
          label: '二级菜单',
          children: [
            { key: 'lv3', label: '三级菜单' },
            { key: 'lv3-2', label: '三级菜单2' },
          ],
        },
      ],
    },
  ],
  width: 128,
}

interface LayoutStub {
  /** 视口宽度 */
  innerWidth: number
  /** 右键弹层根节点的位置与宽度（left/right/width） */
  left: number
  right: number
  width: number
  /** 元素高度；>0 时复用 div 才会走同步定位分支 */
  height?: number
}

const stubLayout = ({ innerWidth, left, right, width, height = 0 }: LayoutStub) => {
  vi.stubGlobal('innerWidth', innerWidth)
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    x: left,
    y: 0,
    top: 0,
    bottom: 0,
    left,
    right,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect)
  // wrapper 无布局时 clientWidth/Height 恒为 0，方向判定会提前返回，须补非零尺寸
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => width })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 100 })
}

describe('showByRightContext 三级子菜单展开方向', () => {
  let originalClientWidth: PropertyDescriptor | undefined
  let originalClientHeight: PropertyDescriptor | undefined
  /** 必须经 destroy 句柄清理模块级 rightContextRoot：直接 el.remove() 会留 Root 指向游离 div，污染下个用例 */
  const handles: { destroy: () => void }[] = []

  beforeEach(() => {
    originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
    originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight')
  })

  afterEach(() => {
    handles.splice(0).forEach((h) => h.destroy())
    if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth)
    if (originalClientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  const renderMenu = async (layout: LayoutStub, props: YakitMenuProp = menuProps) => {
    stubLayout(layout)
    handles.push(showByRightContext(props, 300, 300))
    // showByRightContext 内部经 setTimeout 渲染，等一拍让 useLayoutEffect 完成测量与方向判定
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  /** 注入的子菜单 placements；向右展开的锚点是 tl/tr */
  const submenuPlacements = (): Record<string, { points: string[]; overflow?: { adjustY?: boolean } }> | null => {
    const raw = document.querySelector('[data-testid="yakit-menu"]')?.getAttribute('data-builtin-placements') || ''
    return raw ? JSON.parse(raw) : null
  }

  it('右侧空间充足时保持向右展开，且不会被顶到窗口顶部', async () => {
    await renderMenu({ innerWidth: 1920, left: 100, right: 300, width: 200 })
    const placements = submenuPlacements()
    expect(placements?.rightTop?.points).toEqual(['tl', 'tr'])
    expect(placements?.rightTop?.overflow?.adjustY).toBe(false)
  })

  it('右侧不足且左侧充足时子菜单优先向左展开', async () => {
    await renderMenu({ innerWidth: 1000, left: 800, right: 1000, width: 200 })
    const placements = submenuPlacements()
    expect(placements?.rightTop?.points).toEqual(['tr', 'tl'])
    expect(placements?.rightBottom?.points).toEqual(['br', 'bl'])
  })

  it('两侧都不足时选剩余空间更大的一侧：左侧大则向左', async () => {
    await renderMenu({ innerWidth: 500, left: 300, right: 500, width: 400 })
    expect(submenuPlacements()?.rightTop?.points).toEqual(['tr', 'tl'])
  })

  it('两侧都不足时选剩余空间更大的一侧：右侧大则保持向右', async () => {
    await renderMenu({ innerWidth: 500, left: 10, right: 410, width: 400 })
    expect(submenuPlacements()?.rightTop?.points).toEqual(['tl', 'tr'])
  })

  it('三级菜单：右侧足够放下整条链时保持向右', async () => {
    // 右侧剩 1620，一、二、三级都能向右展开
    await renderMenu({ innerWidth: 1920, left: 100, right: 300, width: 200 }, deepMenuProps)
    expect(submenuPlacements()?.rightTop?.points).toEqual(['tl', 'tr'])
  })

  it('连续右键复用已有菜单时按新位置重新判定展开方向', async () => {
    // 第一次：右侧空间充足，保持向右
    await renderMenu({ innerWidth: 1920, left: 100, right: 300, width: 200 })
    expect(submenuPlacements()?.rightTop?.points).toEqual(['tl', 'tr'])

    // 第二次：复用同一 div（带非零高度才会走同步定位分支），换到右侧不足、左侧充足的布局，应重新判定为向左
    stubLayout({ innerWidth: 1000, left: 800, right: 1000, width: 200, height: 100 })
    handles.push(showByRightContext(menuProps, 300, 300))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const placements = submenuPlacements()
    expect(placements?.rightTop?.points).toEqual(['tr', 'tl'])
    expect(placements?.rightBottom?.points).toEqual(['br', 'bl'])

    // 定位修正不随重渲染重跑：div 保持同步定位结果（genX: 200+300>200 → 300-200-6=94），
    // 若重跑会基于已修正坐标二次计算得 -112px，菜单表现为抖动偏移
    const contextRoot = document.getElementById('yakit-right-context')
    expect(contextRoot?.style.left).toBe('94px')
    expect(contextRoot?.style.top).toBe('194px')
  })
})

describe('showByRightContext 二级菜单高度', () => {
  const handles: { destroy: () => void }[] = []

  const visibleRect = (top: number) => ({ top, width: 200, height: 400 }) as DOMRect
  /** display: none 时 jsdom 的 rect 全为 0 */
  const hiddenRect = { top: 0, width: 0, height: 0 } as DOMRect

  const mountMenu = (top: number) => {
    const popup = document.createElement('div')
    popup.className = styles['show-by-right-context-submenu']
    const menu = document.createElement('ul')
    menu.className = 'ant-menu'
    popup.appendChild(menu)
    vi.spyOn(menu, 'getBoundingClientRect').mockReturnValue(visibleRect(top))
    document.body.appendChild(popup)
    return { menu, popup }
  }

  const flushFit = async () => {
    // 跨两帧：observer 回调里再排的 rAF 也要执行完
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))
    })
  }

  beforeEach(async () => {
    vi.stubGlobal('innerHeight', 800)
    handles.push(showByRightContext(menuProps, 10, 20))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  })

  afterEach(() => {
    handles.splice(0).forEach((handle) => handle.destroy())
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('按当前项到窗口底部的剩余高度滚动，窗口变化后重算', async () => {
    const { menu } = mountMenu(200)
    await flushFit()
    expect(menu.style.maxHeight).toBe('592px')
    expect(menu.style.overflowY).toBe('auto')

    vi.stubGlobal('innerHeight', 500)
    await act(async () => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(menu.style.maxHeight).toBe('292px')
  })

  it('剩余高度不足 120 时使用 120 下限', async () => {
    const { menu } = mountMenu(760)
    await flushFit()
    expect(menu.style.maxHeight).toBe('120px')
    expect(menu.style.overflowY).toBe('auto')
  })

  it('子菜单收起后不写入视口高度，重新展开按新位置重算', async () => {
    const { menu, popup } = mountMenu(200)
    await flushFit()
    expect(menu.style.maxHeight).toBe('592px')

    // 收起：rc-menu 的 removeOnLeave 为 false，弹层留在 DOM 里只切换 ant-menu-hidden，此时 rect 全为 0
    vi.mocked(menu.getBoundingClientRect).mockReturnValue(hiddenRect)
    popup.classList.add('ant-menu-hidden')
    await flushFit()
    expect(menu.style.maxHeight).toBe('592px')

    // 重新展开：位置变化后按新 top 重算，不沿用收起时的值
    vi.mocked(menu.getBoundingClientRect).mockReturnValue(visibleRect(400))
    popup.classList.remove('ant-menu-hidden')
    await flushFit()
    expect(menu.style.maxHeight).toBe('392px')
  })
})
