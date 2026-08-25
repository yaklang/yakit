import { convertKeyEventToKeyCombination } from '../../shortcutKeyCore'
import { handleShortcutKey, parseShortcutKeyEvent } from '../../utils'

/** 判断当前输入是否激活页面级或全局快捷键 */
export const isPageOrGlobalShortcut = (ev: KeyboardEvent): string | null => {
  const keys = convertKeyEventToKeyCombination(ev)
  if (!keys) return null
  const eventName = parseShortcutKeyEvent(keys)
  if (!eventName) return null
  handleShortcutKey(ev)
  return eventName
}
