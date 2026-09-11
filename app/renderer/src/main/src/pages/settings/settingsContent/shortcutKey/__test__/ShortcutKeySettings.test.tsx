import '../../../../ai-re-act/hooks/__test__/setupElectron'
vi.mock('lottie-web', () => ({ default: vi.fn() }))
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ShortcutKeySettings } from '../ShortcutKeySettings'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string) => key,
    i18nRefresh: 0,
  }),
}))

vi.mock('@/utils/envfile', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    GetReleaseEdition: () => 'community',
  }
})

vi.mock('@/utils/globalShortcutKey/events/pageMaps', () => ({
  pageEventMaps: {
    global: {
      scopeShow: undefined,
      getStorage: vi.fn(),
      getEvents: vi.fn(() => ({
        save: { name: 'ShortcutKey.saveFile', keys: ['Control', 'KeyS'] },
        search: { name: 'ShortcutKey.search', keys: ['Control', 'KeyF'] },
      })),
      setStorage: vi.fn(),
      resetEvents: vi.fn(),
    },
  },
}))

vi.mock('@/utils/globalShortcutKey/utils', () => ({
  convertKeyboardToUIKey: (keys: string[]) => keys.join('+'),
  setIsActiveShortcutKeyPage: vi.fn(),
}))

vi.mock('@/utils/globalShortcutKey/events/page/yakEditor', () => ({
  isConflictToYakEditor: () => undefined,
}))

vi.mock('@/pages/manageRightClickPlugins/shortcut', () => ({
  findContextMenuPluginShortcutConflict: () => undefined,
  refreshContextMenuShortcutCache: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/utils/notification', () => ({
  failed: vi.fn(),
}))

describe('ShortcutKeySettings', () => {
  it('加载后展示分组快捷键，搜索只保留命中项', async () => {
    const user = userEvent.setup()
    render(<ShortcutKeySettings />)
    await waitFor(() => {
      expect(screen.getByText('ShortcutKey.saveFile')).toBeInTheDocument()
      expect(screen.getByText('ShortcutKey.search')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('SettingsPage.searchPlaceholder'), 'saveFile')
    expect(screen.getByText('ShortcutKey.saveFile')).toBeInTheDocument()
    expect(screen.queryByText('ShortcutKey.search')).not.toBeInTheDocument()
  })
})
