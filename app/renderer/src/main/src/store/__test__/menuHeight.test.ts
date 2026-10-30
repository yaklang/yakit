import { beforeEach, describe, expect, it } from 'vitest'
import { useMenuHeight } from '../menuHeight'

describe('菜单布局状态', () => {
  beforeEach(() => {
    useMenuHeight.setState({
      menuBodyHeight: { firstTabMenuBodyHeight: 0 },
      isMenuVisible: true,
    })
  })

  it('切换菜单显隐保留已测量的高度', () => {
    useMenuHeight.getState().updateMenuBodyHeight({ firstTabMenuBodyHeight: 400 })
    useMenuHeight.getState().toggleMenuVisibility()
    expect(useMenuHeight.getState().isMenuVisible).toBe(false)
    expect(useMenuHeight.getState().menuBodyHeight.firstTabMenuBodyHeight).toBe(400)
    useMenuHeight.getState().toggleMenuVisibility()
    expect(useMenuHeight.getState().isMenuVisible).toBe(true)
    expect(useMenuHeight.getState().menuBodyHeight.firstTabMenuBodyHeight).toBe(400)
  })

  it('菜单隐藏时更新高度不会重新显示菜单', () => {
    useMenuHeight.getState().toggleMenuVisibility()
    useMenuHeight.getState().updateMenuBodyHeight({ firstTabMenuBodyHeight: 360 })
    expect(useMenuHeight.getState().isMenuVisible).toBe(false)
    expect(useMenuHeight.getState().menuBodyHeight.firstTabMenuBodyHeight).toBe(360)
  })
})
