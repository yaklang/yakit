import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { setThemeMock } = vi.hoisted(() => ({ setThemeMock: vi.fn() }))

vi.mock('@/services/electronBridge', () => ({
  yakitTheme: {
    setTheme: (...args: unknown[]) => setThemeMock(...args),
  },
}))

type MatchMediaStub = Omit<MediaQueryList, 'matches'> & { matches: boolean; emit: (matches: boolean) => void }

function installMatchMedia(matches: boolean): MatchMediaStub {
  const listeners = new Set<EventListener>()
  const mql = {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_type: string, cb: EventListener) => {
      listeners.add(cb)
    },
    removeEventListener: (_type: string, cb: EventListener) => {
      listeners.delete(cb)
    },
    addListener: (cb: EventListener) => listeners.add(cb),
    removeListener: (cb: EventListener) => listeners.delete(cb),
    dispatchEvent: () => true,
    emit(next: boolean) {
      mql.matches = next
      const ev = { matches: next } as MediaQueryListEvent
      listeners.forEach((cb) => cb(ev))
    },
  } as MatchMediaStub
  window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia
  return mql
}

async function loadThemeModule() {
  return import('../index')
}

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  setThemeMock.mockClear()
  installMatchMedia(false)
})

afterEach(() => {
  localStorage.clear()
})

describe('resolveTheme', () => {
  it('light / dark 原样返回，system 跟随 matchMedia', async () => {
    const { resolveTheme } = await loadThemeModule()
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
    expect(resolveTheme('system')).toBe('light')

    installMatchMedia(true)
    expect(resolveTheme('system')).toBe('dark')
  })
})

describe('themeStore', () => {
  it('非法 localStorage 回退 light，并写入 data-theme', async () => {
    localStorage.setItem('theme', 'rainbow')
    const { useTheme } = await loadThemeModule()
    expect(useTheme.getState().theme).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('setTheme 同步 DOM、localStorage 和 electron', async () => {
    const { useTheme } = await loadThemeModule()
    act(() => {
      useTheme.getState().setTheme('dark')
    })
    expect(useTheme.getState().theme).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(setThemeMock).toHaveBeenCalledWith('dark')
  })

  it('setTheme(system) 时 data-theme 解析成系统色，mode 仍是 system', async () => {
    installMatchMedia(true)
    const { useTheme } = await loadThemeModule()
    act(() => {
      useTheme.getState().setTheme('system')
    })
    expect(useTheme.getState().theme).toBe('system')
    expect(localStorage.getItem('theme')).toBe('system')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(setThemeMock).toHaveBeenCalledWith('system')
  })

  it('syncTheme 忽略非法值，合法值不调 electron', async () => {
    const { useTheme } = await loadThemeModule()
    act(() => {
      useTheme.getState().setTheme('dark')
    })
    setThemeMock.mockClear()
    act(() => {
      useTheme.getState().syncTheme('not-a-theme' as 'light')
    })
    expect(useTheme.getState().theme).toBe('dark')
    expect(setThemeMock).not.toHaveBeenCalled()

    act(() => {
      useTheme.getState().syncTheme('light')
    })
    expect(useTheme.getState().theme).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(setThemeMock).not.toHaveBeenCalled()
  })

  it('仅 system 模式响应系统深色切换', async () => {
    const media = installMatchMedia(false)
    const { useTheme } = await loadThemeModule()
    act(() => {
      useTheme.getState().setTheme('dark')
    })
    setThemeMock.mockClear()
    act(() => {
      media.emit(true)
    })
    expect(useTheme.getState().theme).toBe('dark')
    expect(setThemeMock).not.toHaveBeenCalled()

    act(() => {
      useTheme.getState().setTheme('system')
    })
    setThemeMock.mockClear()
    act(() => {
      media.emit(true)
    })
    expect(useTheme.getState().theme).toBe('system')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(setThemeMock).toHaveBeenCalledWith('system')
  })
})

describe('useTheme hook', () => {
  it('theme 是解析后的亮暗，themeMode 是用户选择', async () => {
    installMatchMedia(true)
    const { useTheme } = await loadThemeModule()
    const { result } = renderHook(() => useTheme())
    act(() => {
      result.current.setTheme('system')
    })
    expect(result.current.themeMode).toBe('system')
    expect(result.current.theme).toBe('dark')
  })
})
