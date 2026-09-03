import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 以 antd Menu 桩捕获 builtinPlacements：注入 rightTop/rightBottom 左偏锚点即为「子菜单向左展开」。
 * jsdom 无真实布局（getBoundingClientRect / clientWidth 恒为 0），布局测量均需打桩。
 */
vi.mock('antd', async (importOriginal) => {
  const actual = await importOriginal<typeof import('antd')>()
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

interface LayoutStub {
  /** 视口宽度 */
  innerWidth: number
  /** 右键弹层根节点的位置与宽度（left/right/width） */
  left: number
  right: number
  width: number
}

const stubLayout = ({ innerWidth, left, right, width }: LayoutStub) => {
  vi.stubGlobal('innerWidth', innerWidth)
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    x: left,
    y: 0,
    top: 0,
    bottom: 0,
    left,
    right,
    width,
    height: 0,
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

  const renderMenu = async (layout: LayoutStub) => {
    stubLayout(layout)
    showByRightContext(menuProps, 300, 300)
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
})
