import emiter from '../eventBus/eventBus'
import { pageEventMaps, type ShortcutKeyPageName } from './events/pageMaps'
import { convertKeyEventToKeyCombination, sortKeysCombination } from './shortcutKeyCore'

export { convertKeyEventToKeyCombination, convertKeyboardToUIKey, sortKeysCombination } from './shortcutKeyCore'

// #region 全局快捷键逻辑
/** 当前显示的页面 */
let currentPageHandler: ShortcutKeyPageName | null = null
/** 注册页面快捷键监听事件 */
export const registerShortcutKeyHandle = (page: ShortcutKeyPageName) => {
  currentPageHandler = page
}
/** 注销页面快捷键监听事件(多页面事件由于异步互相影响不参与注销) */
export const unregisterShortcutKeyHandle = (page: ShortcutKeyPageName) => {
  if (currentPageHandler === page) currentPageHandler = null
}
/** 当前聚焦的页面或组件 */
let currentFocus: string[] | null = null
/** 注册聚焦监听事件 */
export const registerShortcutFocusHandle = (page: string[]) => {
  currentFocus = page
}
/** 注销聚焦监听事件 */
export const unregisterShortcutFocusHandle = (page: string) => {
  if (currentFocus && currentFocus.includes(page)) currentFocus = currentFocus.filter((item) => item !== page)
}
export const getCurrentShortcutFocus = () => currentFocus

/** 是否激活了快捷键设置页面 */
let isActiveShortcutKeyPage = false
/** 注册页面快捷键监听事件 */
export const setIsActiveShortcutKeyPage = (flag: boolean) => {
  isActiveShortcutKeyPage = flag
}
export const getIsActiveShortcutKeyPage = () => {
  return isActiveShortcutKeyPage
}

/** 解析快捷键是否有对应的快捷键事件 */
export const parseShortcutKeyEvent = (keys: string[]): string | null => {
  try {
    const triggerKeys = sortKeysCombination(keys).join('')
    const pageKeyInfo = pageEventMaps[currentPageHandler || 'global']

    if (!pageKeyInfo) return null
    const pageEvents = pageKeyInfo.getEvents()
    const pageEventKeys = Object.keys(pageEvents)
    for (const item of pageEventKeys) {
      const pageKeys = sortKeysCombination(pageEvents[item].keys).join('')
      if (pageKeys === triggerKeys) {
        return item
      }
    }

    if (currentPageHandler && currentPageHandler !== 'global') {
      const globalKeyInfo = pageEventMaps.global
      if (!globalKeyInfo) return null
      const globalEvents = globalKeyInfo.getEvents()
      const globalEventKeys = Object.keys(globalEvents)
      for (const item of globalEventKeys) {
        const globalKeys = sortKeysCombination(globalEvents[item].keys).join('')
        if (globalKeys === triggerKeys) {
          return item
        }
      }
    }

    if (currentPageHandler !== 'yakit-multiple') {
      const multipleKeyInfo = pageEventMaps['yakit-multiple']
      if (multipleKeyInfo) {
        const multipleEvents = multipleKeyInfo.getEvents()
        const multipleEventKeys = Object.keys(multipleEvents)
        for (const item of multipleEventKeys) {
          const multipleKeys = sortKeysCombination(multipleEvents[item].keys).join('')
          if (multipleKeys === triggerKeys) {
            return item
          }
        }
      }
    }
  } catch (error) {}

  return null
}

export const handleShortcutKey = (ev: KeyboardEvent) => {
  const keys = convertKeyEventToKeyCombination(ev)
  if (!keys) return
  if (getIsActiveShortcutKeyPage()) {
    emiter.emit('onGlobalShortcutKey', `setShortcutKey(${keys.join('|')})`)
    return
  } else {
    const eventName = parseShortcutKeyEvent(keys)
    if (!eventName) return
    emiter.emit(
      'onGlobalShortcutKey',
      JSON.stringify({
        eventName,
        currentFocus,
      }),
    )
    return
  }
}

/** 启动全局快捷键监听事件 */
export const startShortcutKeyMonitor = () => {
  document.addEventListener('keydown', handleShortcutKey)
}

/** 移除全局快捷键监听事件 */
export const stopShortcutKeyMonitor = () => {
  document.removeEventListener('keydown', handleShortcutKey)
}

// #endregion
