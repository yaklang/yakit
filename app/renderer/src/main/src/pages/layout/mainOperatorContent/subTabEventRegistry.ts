import { WebFuzzerType } from '@/pages/fuzzer/WebFuzzerPage/WebFuzzerPageType'
import { getCurrentPageTabRouteKey } from '@/utils/getMainOperatorPageBodyContainer'
import emiter from '@/utils/eventBus/eventBus'

const { ipcRenderer } = window.require('electron')

export interface SubTabPageEventHandlers {
  onSelectSubMenuById?: (resVal: string) => void
  onAddGroup?: (e: unknown, data: { pageId: string; type: WebFuzzerType }) => void
  onSetType?: (res: string) => void
  onRemoveSecondPageByFocus?: (focus: string) => void
  onCloseCurrentPage?: (id: string) => void
  onUpdateSubMenuNameFormPage?: (val: string) => void
  onUpdateSecondaryTabsNum?: (num: number) => void
  onCloseSubPageByInfo?: (res: string) => void
}

const handlersByRouteKey = new Map<string, SubTabPageEventHandlers>()

export function registerSubTabPageHandlers(pageRouteKey: string, handlers: Partial<SubTabPageEventHandlers>) {
  const existing = handlersByRouteKey.get(pageRouteKey) || {}
  handlersByRouteKey.set(pageRouteKey, { ...existing, ...handlers })
}

export function unregisterSubTabPageHandlers(pageRouteKey: string, keys?: (keyof SubTabPageEventHandlers)[]) {
  if (!keys) {
    handlersByRouteKey.delete(pageRouteKey)
    return
  }
  const existing = handlersByRouteKey.get(pageRouteKey)
  if (!existing) return
  const next = { ...existing }
  keys.forEach((key) => delete next[key])
  if (Object.keys(next).length === 0) {
    handlersByRouteKey.delete(pageRouteKey)
  } else {
    handlersByRouteKey.set(pageRouteKey, next)
  }
}

function dispatchActive<K extends keyof SubTabPageEventHandlers>(
  method: K,
  ...args: Parameters<NonNullable<SubTabPageEventHandlers[K]>>
) {
  const handler = handlersByRouteKey.get(getCurrentPageTabRouteKey())?.[method]
  if (typeof handler === 'function') {
    ;(handler as (...a: unknown[]) => void)(...args)
  }
}

function dispatchAllHandlers<K extends keyof SubTabPageEventHandlers>(
  method: K,
  ...args: Parameters<NonNullable<SubTabPageEventHandlers[K]>>
) {
  handlersByRouteKey.forEach((handlers) => {
    const handler = handlers[method]
    if (typeof handler === 'function') {
      ;(handler as (...a: unknown[]) => void)(...args)
    }
  })
}

/** 在 MainOperatorContent 挂载时注册一次，避免每个 SubTabList/SubTabs 重复绑定全局监听 */
export function initSubTabGlobalListeners() {
  const onSwitchSubMenuItem = (resVal: string) => dispatchAllHandlers('onSelectSubMenuById', resVal)
  const onAddGroup = (e: unknown, data: { pageId: string; type: WebFuzzerType }) =>
    dispatchAllHandlers('onAddGroup', e, data)
  const onSetType = (res: string) => dispatchActive('onSetType', res)
  const onRemoveSecondPageByFocus = (focus: string) => dispatchActive('onRemoveSecondPageByFocus', focus)
  const onCloseCurrentPage = (id: string) => dispatchActive('onCloseCurrentPage', id)
  const onUpdateSubMenuNameFormPage = (val: string) => dispatchActive('onUpdateSubMenuNameFormPage', val)
  const onUpdateSecondaryTabsNum = (num: number) => dispatchActive('onUpdateSecondaryTabsNum', num)
  const onCloseSubPageByInfo = (res: string) => dispatchActive('onCloseSubPageByInfo', res)

  emiter.on('switchSubMenuItem', onSwitchSubMenuItem)
  ipcRenderer.on('fetch-add-group', onAddGroup)
  emiter.on('sendSwitchSequenceToMainOperatorContent', onSetType)
  emiter.on('onRemoveSecondPageByFocus', onRemoveSecondPageByFocus)
  emiter.on('onCloseCurrentPage', onCloseCurrentPage)
  emiter.on('onUpdateSubMenuNameFormPage', onUpdateSubMenuNameFormPage)
  emiter.on('onUpdateSecondaryTabsNum', onUpdateSecondaryTabsNum)
  emiter.on('onCloseSubPageByInfo', onCloseSubPageByInfo)

  return () => {
    emiter.off('switchSubMenuItem', onSwitchSubMenuItem)
    ipcRenderer.removeListener('fetch-add-group', onAddGroup)
    emiter.off('sendSwitchSequenceToMainOperatorContent', onSetType)
    emiter.off('onRemoveSecondPageByFocus', onRemoveSecondPageByFocus)
    emiter.off('onCloseCurrentPage', onCloseCurrentPage)
    emiter.off('onUpdateSubMenuNameFormPage', onUpdateSubMenuNameFormPage)
    emiter.off('onUpdateSecondaryTabsNum', onUpdateSecondaryTabsNum)
    emiter.off('onCloseSubPageByInfo', onCloseSubPageByInfo)
  }
}
