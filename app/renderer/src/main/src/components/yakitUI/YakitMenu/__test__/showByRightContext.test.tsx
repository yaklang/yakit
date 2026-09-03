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

  beforeEach(() => {
    originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')
    originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight')
  })

  afterEach(() => {
    const contextRoot = document.getElementById('yakit-right-context')
    if (contextRoot) act(() => contextRoot.remove())
    if (originalClientWidth) Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth)
    if (originalClientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  const renderMenu = async (layout: LayoutStub, props: YakitMenuProp = menuProps) => {
    stubLayout(layout)
    showByRightContext(props, 300, 300)
    // showByRightContext 内部经 setTimeout 渲染，等一拍让 useLayoutEffect 完成测量与方向判定
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  /** 注入的子菜单 placements；null 表示未注入（保持向右展开） */
  const submenuPlacements = (): Record<string, { points: string[] }> | null => {
    const raw = document.querySelector('[data-testid="yakit-menu"]')?.getAttribute('data-builtin-placements') || ''
    return raw ? JSON.parse(raw) : null
  }

  it('右侧空间充足时保持向右展开', async () => {
    await renderMenu({ innerWidth: 1920, left: 100, right: 300, width: 200 })
    expect(submenuPlacements()).toBeNull()
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
    expect(submenuPlacements()).toBeNull()
  })

  it('三级菜单：右侧足够放下整条链时保持向右', async () => {
    // 右侧剩 1620，一、二、三级都能向右展开
    await renderMenu({ innerWidth: 1920, left: 100, right: 300, width: 200 }, deepMenuProps)
    expect(submenuPlacements()).toBeNull()
  })

  it('连续右键复用已有菜单时按新位置重新判定展开方向', async () => {
    // 第一次：右侧空间充足，保持向右
    await renderMenu({ innerWidth: 1920, left: 100, right: 300, width: 200 })
    expect(submenuPlacements()).toBeNull()

    // 第二次：复用同一 div（带非零高度才会走同步定位分支），换到右侧不足、左侧充足的布局，应重新判定为向左
    stubLayout({ innerWidth: 1000, left: 800, right: 1000, width: 200, height: 100 })
    showByRightContext(menuProps, 300, 300)
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
