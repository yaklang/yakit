import { getLocalValue, setLocalValue } from '@/utils/kv'
import { YakitKeyBoard, YakitKeyMod } from '../../keyboard'
import { ShortcutKeyEventInfo } from '../pageMaps'
import { addScopeShow } from '../global'
import { JSONParseLog } from '@/utils/tool'

export enum YakitMultipleShortcutKey {
  /** 多页面快捷键 */
  SaveNewPlugin = 'save*pluginEditor',
  /** 复制URL（带参数） */
  TableCopyUrlWithQuery = 'copyUrlWithQuery*httpFlowTable',
  /** 复制URL（不带参数） */
  TableCopyUrlWithoutQuery = 'copyUrlWithoutQuery*httpFlowTable',
  /** 浏览器中打开URL */
  TableOpenUrlInBrowser = 'openUrlInBrowser*httpFlowTable',
  /** 浏览器中查看响应 */
  TableViewResponseInBrowser = 'viewResponseInBrowser*httpFlowTable',
  /** 屏蔽该记录 */
  TableBlockRecord = 'blockRecord*httpFlowTable',
  /** 屏蔽URL */
  TableBlockURL = 'blockUrl*httpFlowTable',
  /** 屏蔽域名 */
  TableBlockDomain = 'blockDomain*httpFlowTable',
  /** 删除记录 */
  TableDeleteRecord = 'deleteRecord*httpFlowTable',
  /** 删除URL */
  TableDeleteURL = 'deleteUrl*httpFlowTable',
  /** 删除域名 */
  TableDeleteDomain = 'deleteDomain*httpFlowTable',
  /** 复制基础CSRF PoC */
  TableCopyAsCsrfPocBasic = 'csrfpoc*httpFlowTable',
  /** 复制自动提交CSRF PoC */
  TableCopyAsCsrfPocAutoSubmit = 'auto-submit-csrf-poc*httpFlowTable',
}

type EventsType = Record<`${YakitMultipleShortcutKey}`, ShortcutKeyEventInfo>

const YakitMultipleShortcutKeyEvents: EventsType = {
  'save*pluginEditor': {
    name: 'ShortcutKey.savePlugin',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_S],
  },
  'copyUrlWithQuery*httpFlowTable': {
    name: 'YakitEditor.HTTPPacketYakitEditor.copyUrlWithQuery',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_B],
  },
  'copyUrlWithoutQuery*httpFlowTable': {
    name: 'YakitEditor.HTTPPacketYakitEditor.copyUrlWithoutQuery',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyBoard.KEY_B],
  },
  'openUrlInBrowser*httpFlowTable': {
    name: 'YakitEditor.HTTPPacketYakitEditor.openUrlInBrowser',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_O],
  },
  'viewResponseInBrowser*httpFlowTable': {
    name: 'HTTPFlowTable.RowContextMenu.viewResponseInBrowser',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyBoard.KEY_O],
  },
  'blockRecord*httpFlowTable': {
    name: 'HTTPFlowTable.RowContextMenu.blockRecord',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_D],
  },
  'blockUrl*httpFlowTable': {
    name: 'HTTPFlowTable.RowContextMenu.blockURL',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_L],
  },
  'blockDomain*httpFlowTable': {
    name: 'HTTPFlowTable.RowContextMenu.blockDomain',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_H],
  },
  'deleteRecord*httpFlowTable': {
    name: 'HTTPFlowTable.RowContextMenu.deleteRecord',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_P],
  },
  'deleteUrl*httpFlowTable': {
    name: 'HTTPFlowTable.RowContextMenu.deleteURL',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_Q],
  },
  'deleteDomain*httpFlowTable': {
    name: 'HTTPFlowTable.RowContextMenu.deleteDomain',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_M],
  },
  'csrfpoc*httpFlowTable': {
    name: 'YakitEditor.HTTPPacketYakitEditor.copyAsCsrfPocBasic',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_N],
  },
  'auto-submit-csrf-poc*httpFlowTable': {
    name: 'YakitEditor.HTTPPacketYakitEditor.copyAsCsrfPocAutoSubmit',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyBoard.KEY_N],
  },
}

let currentKeyEvents: EventsType | null = null
const LocalStorageKey = 'yakit-multiple-shortcut-key-events'

/** 获取快捷键事件和对应按键-焦点级 */
export const getStorageYakitMultipleShortcutKeyEvents = () => {
  getLocalValue(LocalStorageKey)
    .then((res) => {
      if (!res) return
      try {
        const data: EventsType = JSONParseLog(res, {
          page: 'yakitMultiple',
          fun: 'getStorageYakitMultipleShortcutKeyEvents',
        })
        currentKeyEvents = addScopeShow(data, YakitMultipleShortcutKeyEvents)
      } catch (error) {}
    })
    .catch(() => {})
}
/** 设置快捷键事件和对应按键-焦点级 */
export const setStorageYakitMultipleShortcutKeyEvents = (events: Record<string, ShortcutKeyEventInfo>) => {
  if (!events) return
  currentKeyEvents = events as EventsType
  setLocalValue(LocalStorageKey, JSON.stringify(events))
}

/** 获取当前应用的快捷键事件集合 */
export const getYakitMultipleShortcutKeyEvents = () => {
  if (currentKeyEvents) return currentKeyEvents
  return YakitMultipleShortcutKeyEvents
}

/** 重置快捷键 */
export const resetYakitMultipleShortcutKeyEvents = () => {
  currentKeyEvents = null
  setLocalValue(LocalStorageKey, JSON.stringify(YakitMultipleShortcutKeyEvents))
}
