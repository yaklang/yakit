import { type ShortcutKeyPageName } from '@/utils/globalShortcutKey/events/pageMaps'

export type ShortcutSettingPageName = ShortcutKeyPageName

export interface ShortcutKeyProps {
  page: ShortcutKeyPageName
}

export interface ShortcutKeyListProps {
  defaultPage?: ShortcutSettingPageName
}
