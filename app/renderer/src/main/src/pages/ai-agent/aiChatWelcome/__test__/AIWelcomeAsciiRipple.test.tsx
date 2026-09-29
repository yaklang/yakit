import { forwardRef, useImperativeHandle } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AsciiRippleHandle, AsciiRippleProps } from '@/components/reactBits/AsciiRipple/AsciiRipple'
import { AIWelcomeAsciiRipple } from '../AIWelcomeAsciiRipple'

const mocks = vi.hoisted(() => ({
  theme: 'light' as 'light' | 'dark',
  visibility: 'visible' as 'visible' | 'hidden' | undefined,
  inViewport: true as boolean | undefined,
  calm: vi.fn(),
  renderRipple: vi.fn(),
  viewport: vi.fn(),
  colors: vi.fn(),
}))

vi.mock('@/hook/useTheme', () => ({ useTheme: () => ({ theme: mocks.theme }) }))
vi.mock('ahooks', () => ({
  useDocumentVisibility: () => mocks.visibility,
  useInViewport: (target: unknown) => {
    mocks.viewport(target)
    return [mocks.inViewport]
  },
}))
vi.mock('@/utils/yakitColorVars', () => ({ getAllYakitColorVars: mocks.colors }))
vi.mock('@/components/reactBits/AsciiRipple/AsciiRipple', () => ({
  default: forwardRef<AsciiRippleHandle, AsciiRippleProps>(function Ripple(props, ref) {
    useImperativeHandle(ref, () => ({ calm: mocks.calm, drop: vi.fn() }), [])
    mocks.renderRipple(props)
    return <div data-testid="ripple" />
  }),
}))

const latestProps = () => mocks.renderRipple.mock.lastCall![0] as AsciiRippleProps

beforeEach(() => {
  vi.clearAllMocks()
  mocks.theme = 'light'
  mocks.visibility = 'visible'
  mocks.inViewport = true
  mocks.colors.mockImplementation((theme: string) => ({
    '--yakit-colors-Neutral-20': `${theme}-neutral-20`,
    '--yakit-colors-Neutral-30': `${theme}-neutral-30`,
    '--yakit-colors-Neutral-40': `${theme}-neutral-40`,
    '--yakit-colors-Main-40': `${theme}-main-40`,
  }))
})

afterEach(cleanup)

describe('AIWelcomeAsciiRipple', () => {
  it('将观察目标和交互目标传递为同一容器，并隐藏装饰层的无障碍内容', () => {
    const targetRef = { current: document.createElement('div') }
    const { container } = render(<AIWelcomeAsciiRipple targetRef={targetRef} />)
    expect(mocks.viewport).toHaveBeenCalledWith(targetRef)
    expect(latestProps().interactionTargetRef).toBe(targetRef)
    expect(latestProps().interactive).toBe(true)
    expect(mocks.calm).not.toHaveBeenCalled()
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('初始可见性未知时允许交互，不清空波纹', () => {
    mocks.visibility = undefined
    mocks.inViewport = undefined
    render(<AIWelcomeAsciiRipple targetRef={{ current: null }} />)
    expect(latestProps().interactive).toBe(true)
    expect(mocks.calm).not.toHaveBeenCalled()
  })

  it.each(['hidden', 'outside'] as const)('%s 时停止交互并清空波纹，恢复可见后重新交互', (reason) => {
    const target = document.createElement('div')
    const { rerender } = render(<AIWelcomeAsciiRipple targetRef={{ current: target }} />)
    if (reason === 'hidden') mocks.visibility = 'hidden'
    else mocks.inViewport = false
    rerender(<AIWelcomeAsciiRipple targetRef={{ current: target }} />)
    expect(latestProps().interactive).toBe(false)
    expect(mocks.calm).toHaveBeenCalledOnce()

    // 仍不可见的重渲染不重复清空。
    rerender(<AIWelcomeAsciiRipple targetRef={{ current: target }} />)
    expect(mocks.calm).toHaveBeenCalledOnce()

    mocks.visibility = 'visible'
    mocks.inViewport = true
    rerender(<AIWelcomeAsciiRipple targetRef={{ current: target }} />)
    expect(latestProps().interactive).toBe(true)
    expect(mocks.calm).toHaveBeenCalledOnce()
  })

  it('页面恢复可见但容器仍在视口外时保持禁用', () => {
    mocks.visibility = 'hidden'
    mocks.inViewport = false
    const { rerender } = render(<AIWelcomeAsciiRipple targetRef={{ current: null }} />)
    expect(latestProps().interactive).toBe(false)
    expect(mocks.calm).toHaveBeenCalledOnce()
    mocks.visibility = 'visible'
    rerender(<AIWelcomeAsciiRipple targetRef={{ current: null }} />)
    expect(latestProps().interactive).toBe(false)
    expect(mocks.calm).toHaveBeenCalledOnce()
  })

  it('主题切换后传递对应文字、波峰、波谷颜色和透明度', () => {
    const { rerender } = render(<AIWelcomeAsciiRipple targetRef={{ current: null }} />)
    expect(mocks.colors).toHaveBeenLastCalledWith('light')
    expect(latestProps()).toMatchObject({
      textColor: 'light-neutral-30',
      troughColor: 'light-main-40',
      rippleColor: 'light-neutral-40',
      textOpacity: 0.2,
    })
    mocks.theme = 'dark'
    rerender(<AIWelcomeAsciiRipple targetRef={{ current: null }} />)
    expect(mocks.colors).toHaveBeenLastCalledWith('dark')
    expect(latestProps()).toMatchObject({
      textColor: 'dark-neutral-20',
      troughColor: 'dark-main-40',
      rippleColor: 'dark-neutral-40',
      textOpacity: 0.15,
    })
    expect(mocks.calm).not.toHaveBeenCalled()
  })
})
