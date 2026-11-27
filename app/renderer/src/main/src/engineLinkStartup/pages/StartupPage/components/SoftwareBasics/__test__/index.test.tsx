import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SoftwareBasics } from '../index'

const mocks = vi.hoisted(() => {
  const languageListeners = new Set<(lng: string) => void>()
  const i18n = {
    on: vi.fn((event: string, listener: (lng: string) => void) => {
      if (event === 'languageChanged') languageListeners.add(listener)
    }),
    off: vi.fn((event: string, listener: (lng: string) => void) => {
      if (event === 'languageChanged') languageListeners.delete(listener)
    }),
    changeLanguage: vi.fn(async (lng: string) => {
      languageListeners.forEach((listener) => listener(lng))
    }),
  }
  const setTheme = vi.fn()
  const useTheme = Object.assign(() => ({ theme: 'light', previewTheme: vi.fn() }), {
    getState: () => ({ theme: 'light', setTheme }),
  })
  return {
    i18n,
    setTheme,
    useTheme,
    getYakitHomeConfig: vi.fn(async () => ({
      currentHome: '/tmp/workspace',
      workspaceHistory: ['/tmp/workspace'],
      softLange: 'zh',
      autoStart: false,
      yakitMode: 'classic',
    })),
    setYakitHomeConfig: vi.fn(async () => ({ success: true })),
    onConfirm: vi.fn(),
    getLastSyncedLanguage: vi.fn((): string | null => null),
  }
})

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: mocks.i18n }),
}))
vi.mock('@/hook/useTheme', () => ({ useTheme: mocks.useTheme }))
vi.mock('@/utils/envfile', () => ({
  isCommunityYakit: () => true,
  isEnpriTrace: () => false,
}))
vi.mock('@/engineLinkStartup/utils/bridgeFacade', () => ({
  yakitApp: {
    getYakitHomeConfig: mocks.getYakitHomeConfig,
    setYakitHomeConfig: mocks.setYakitHomeConfig,
    getDirSize: vi.fn(async () => 0),
    relaunchApp: vi.fn(),
    closeWindow: vi.fn(),
  },
  yakitShell: { openSpecifiedFile: vi.fn() },
}))
vi.mock('@/engineLinkStartup/utils/appSync', () => ({
  getLastSyncedLanguage: mocks.getLastSyncedLanguage,
}))
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', async () => {
  const React = await import('react')
  return {
    YakitSelect: ({ value, options, onChange }: any) =>
      React.createElement(
        'select',
        {
          'data-testid': 'lang-select',
          value,
          onChange: (event: any) => onChange?.(event.target.value),
        },
        options?.map((option: any) =>
          React.createElement('option', { key: option.value, value: option.value }, option.label),
        ),
      ),
  }
})
vi.mock('@/components/yakitUI/YakitForm/YakitForm', async () => {
  const React = await import('react')
  return {
    YakitDragger: ({ value }: any) => React.createElement('div', { 'data-testid': 'dragger' }, value),
  }
})
vi.mock('@/components/yakitUI/YakitButton/YakitButton', async () => {
  const React = await import('react')
  return {
    YakitButton: ({ children, type: _type, ...rest }: any) => React.createElement('button', rest, children),
  }
})
vi.mock('@/components/yakitUI/YakitCheckbox/YakitCheckbox', async () => {
  const React = await import('react')
  return {
    YakitCheckbox: ({ checked, onChange, children }: any) =>
      React.createElement(
        'label',
        null,
        React.createElement('input', { type: 'checkbox', checked, onChange }),
        children,
      ),
  }
})
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({ showYakitModal: vi.fn() }))
vi.mock('antd', () => ({ Tooltip: ({ children }: any) => children }))
vi.mock('ahooks', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return { ...actual, useInViewport: () => [true], useCountDown: () => [0] }
})

describe('SoftwareBasics language sync', () => {
  beforeEach(() => {
    mocks.getLastSyncedLanguage.mockReturnValue(null)
    mocks.getYakitHomeConfig.mockClear()
    mocks.setYakitHomeConfig.mockClear()
    mocks.onConfirm.mockClear()
  })

  it('writes the language received from the main window instead of the stale value', async () => {
    render(<SoftwareBasics softTheme="light" setSoftTheme={vi.fn()} onConfirm={mocks.onConfirm} />)

    await waitFor(() => expect(mocks.getYakitHomeConfig).toHaveBeenCalled())
    await waitFor(() => expect(mocks.i18n.on).toHaveBeenCalledWith('languageChanged', expect.any(Function)))
    expect(screen.getByTestId('lang-select')).toHaveValue('zh')

    await act(async () => {
      await mocks.i18n.changeLanguage('en')
    })

    await waitFor(() => expect(screen.getByTestId('lang-select')).toHaveValue('en'))
    fireEvent.click(screen.getByTestId('startup-confirm'))

    await waitFor(() => expect(mocks.setYakitHomeConfig).toHaveBeenCalledWith('softLange', 'en'))
    expect(mocks.setYakitHomeConfig).not.toHaveBeenCalledWith('softLange', 'zh')
    expect(mocks.onConfirm).toHaveBeenCalled()
  })

  it('主窗广播早于配置返回时，不把语言覆盖回配置旧值', async () => {
    mocks.getLastSyncedLanguage.mockReturnValue('en')
    render(<SoftwareBasics softTheme="light" setSoftTheme={vi.fn()} onConfirm={mocks.onConfirm} />)

    await waitFor(() => expect(screen.getByTestId('lang-select')).toHaveValue('en'))
    fireEvent.click(screen.getByTestId('startup-confirm'))

    await waitFor(() => expect(mocks.setYakitHomeConfig).toHaveBeenCalledWith('softLange', 'en'))
    expect(mocks.setYakitHomeConfig).not.toHaveBeenCalledWith('softLange', 'zh')
  })
})
