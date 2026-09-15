import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { setThemeMock, onUpdatedMock } = vi.hoisted(() => ({
  setThemeMock: vi.fn(),
  onUpdatedMock: vi.fn(() => () => undefined),
}))

vi.mock('@/utils/electronBridge', () => ({
  yakitTheme: {
    setTheme: setThemeMock,
    onUpdated: onUpdatedMock,
  },
}))

function installMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: () => true,
  }) as unknown as typeof window.matchMedia
}

async function loadThemeModule() {
  return import('../useTheme')
}

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  setThemeMock.mockClear()
  onUpdatedMock.mockClear()
  installMatchMedia(true)
})

afterEach(() => {
  localStorage.clear()
})

describe('Link useTheme', () => {
  it('读取 system 时只解析亮暗用于展示，mode 仍是 system', async () => {
    localStorage.setItem('theme', 'system')
    const { useTheme } = await loadThemeModule()
    expect(useTheme.getState().themeMode).toBe('system')
    expect(useTheme.getState().theme).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('确认工作区时持久化原始 ThemeMode，不会把 system 写成 dark', async () => {
    localStorage.setItem('theme', 'system')
    const { useTheme } = await loadThemeModule()
    act(() => {
      useTheme.getState().persistThemeMode()
    })
    expect(localStorage.getItem('theme')).toBe('system')
    expect(setThemeMock).toHaveBeenCalledWith('system')
    expect(useTheme.getState().themeMode).toBe('system')
  })

  it('预览亮暗不会立刻写盘，确认时才保存用户选择', async () => {
    localStorage.setItem('theme', 'system')
    const { useTheme } = await loadThemeModule()
    act(() => {
      useTheme.getState().setTheme('light', false)
    })
    expect(localStorage.getItem('theme')).toBe('system')
    expect(setThemeMock).not.toHaveBeenCalled()
    act(() => {
      useTheme.getState().persistThemeMode()
    })
    expect(localStorage.getItem('theme')).toBe('light')
    expect(setThemeMock).toHaveBeenCalledWith('light')
  })
})
