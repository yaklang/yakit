import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const colors = vi.hoisted(() => ({
  neutral: '#111111',
  basic: '#222222',
}))

vi.mock('@/utils/yakitColorVars', () => ({
  getAllYakitColorVars: () => ({
    '--Colors-Use-Neutral-Bg': colors.neutral,
    '--Colors-Use-Basic-Background': colors.basic,
  }),
}))

import { getXtermTheme, useXTermOptions } from '../useXTermOptions'

describe('useXTermOptions', () => {
  it('默认使用主窗口终端背景变量', () => {
    expect(getXtermTheme('light').background).toBe(colors.neutral)
  })

  it('支持 Link 连接页指定终端背景变量', () => {
    const { result } = renderHook(() =>
      useXTermOptions({
        getTerminal: () => undefined,
        backgroundColorVar: '--Colors-Use-Basic-Background',
      }),
    )

    expect(result.current.theme.background).toBe(colors.basic)
  })

  it('未知背景变量回退到默认背景', () => {
    const { result } = renderHook(() =>
      useXTermOptions({
        getTerminal: () => undefined,
        backgroundColorVar: '--Unknown-Background',
      }),
    )

    expect(result.current.theme.background).toBe(colors.neutral)
  })
})
