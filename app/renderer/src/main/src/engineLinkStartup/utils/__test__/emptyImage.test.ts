import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  env: 'yakit' as string,
  theme: 'light' as 'light' | 'dark',
}))

vi.mock('@/utils/envfile', () => ({
  fetchEnv: () => state.env,
}))

vi.mock('@/hook/useTheme', () => ({
  useTheme: () => ({ theme: state.theme }),
}))

vi.mock('@/assets/EmptyImage/YakitLightEmpty.png', () => ({ default: 'yakit-light' }))
vi.mock('@/assets/EmptyImage/YakitDarkEmpty.png', () => ({ default: 'yakit-dark' }))
vi.mock('@/assets/EmptyImage/IrifyLightEmpty.png', () => ({ default: 'irify-light' }))
vi.mock('@/assets/EmptyImage/IrifyDarkEmpty.png', () => ({ default: 'irify-dark' }))
vi.mock('@/assets/EmptyImage/MemfitLightEmpty.png', () => ({ default: 'memfit-light' }))
vi.mock('@/assets/EmptyImage/MemfitDarkEmpty.png', () => ({ default: 'memfit-dark' }))

import { useEmptyImage } from '../emptyImage'

const image = (type: 'network' | 'server' | 'power' | 'empty' | 'search' | 'screenRecording' = 'empty') =>
  renderHook(() => useEmptyImage(type)).result.current

describe('Link 通用空状态图', () => {
  beforeEach(() => {
    state.env = 'yakit'
    state.theme = 'light'
  })

  it('按当前产品和主题选择通用空图', () => {
    expect(image()).toBe('yakit-light')

    state.theme = 'dark'
    expect(image()).toBe('yakit-dark')

    state.env = 'irifyEE'
    expect(image()).toBe('irify-dark')

    state.env = 'memfit'
    state.theme = 'light'
    expect(image()).toBe('memfit-light')
  })

  it('未知产品回退到 Yakit 通用空图', () => {
    state.env = 'yakitSE'
    state.theme = 'dark'
    expect(image()).toBe('yakit-dark')
  })

  it('接受主窗的 type 参数但仍返回通用空图', () => {
    expect(image('search')).toBe('yakit-light')
    expect(image('power')).toBe('yakit-light')
  })
})
