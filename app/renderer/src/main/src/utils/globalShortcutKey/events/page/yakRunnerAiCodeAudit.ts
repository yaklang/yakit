import { getLocalValue, setLocalValue } from '@/utils/kv'
import { YakitKeyBoard, YakitKeyMod } from '../../keyboard'
import { ShortcutKeyEventInfo } from '../pageMaps'
import { addScopeShow } from '../global'
import { JSONParseLog } from '@/utils/tool'

/** yakRunner快捷键 */
export enum YakRunnerAiCodeAuditShortcutKey {
  // 新建临时文件
  YakRunnerAiCodeAuditCreate = 'create*yakRunnerAiCodeAudit',
  // 保存文件
  YakRunnerAiCodeAuditSave = 'save*yakRunnerAiCodeAudit',
  // 关闭已打开文件
  YakRunnerAiCodeAuditClose = 'close*yakRunnerAiCodeAudit',
  // 打开终端
  YakRunnerAiCodeAuditOpenTermina = 'openTermina*yakRunnerAiCodeAudit',
  // 文件重命名
  YakRunnerAiCodeAuditRename = 'rename*yakRunnerAiCodeAudit',
  // 文件删除
  YakRunnerAiCodeAuditDelete = 'delete*yakRunnerAiCodeAudit',
  // 文件复制
  YakRunnerAiCodeAuditCopy = 'copy*yakRunnerAiCodeAudit',
  // 文件粘贴
  YakRunnerAiCodeAuditPaste = 'paste*yakRunnerAiCodeAudit',
}

type EventsType = Record<`${YakRunnerAiCodeAuditShortcutKey}`, ShortcutKeyEventInfo>

const YakRunnerAiCodeAuditShortcutKeyEvents: EventsType = {
  'create*yakRunnerAiCodeAudit': {
    name: 'ShortcutKey.newTemporaryFile',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_N],
  },
  'save*yakRunnerAiCodeAudit': {
    name: 'ShortcutKey.saveFile',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_S],
  },
  'close*yakRunnerAiCodeAudit': {
    name: 'ShortcutKey.closeOpenedFile',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_W],
  },
  'openTermina*yakRunnerAiCodeAudit': {
    name: 'ShortcutKey.openTerminal',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.Backquote],
  },
  'rename*yakRunnerAiCodeAudit': {
    name: 'ShortcutKey.renameFile',
    keys: [YakitKeyBoard.F2],
  },
  'delete*yakRunnerAiCodeAudit': {
    name: 'ShortcutKey.deleteFile',
    keys: [YakitKeyBoard.Delete],
  },
  'copy*yakRunnerAiCodeAudit': {
    name: 'ShortcutKey.copyFile',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_C],
  },
  'paste*yakRunnerAiCodeAudit': {
    name: 'ShortcutKey.pasteFile',
    keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_V],
  },
}

let currentKeyEvents: EventsType | null = null
const LocalStorageKey = 'yak-runner-ai-code-audit-shortcut-key-events'

/** 获取快捷键事件和对应按键-页面级 */
export const getStorageYakRunnerAiCodeAuditShortcutKeyEvents = () => {
  getLocalValue(LocalStorageKey)
    .then((res) => {
      if (!res) return
      try {
        const data: EventsType = JSONParseLog(res, {
          page: 'yakRunnerAiCodeAudit',
          fun: 'getStorageYakRunnerAiCodeAuditShortcutKeyEvents',
        })
        currentKeyEvents = addScopeShow(data, YakRunnerAiCodeAuditShortcutKeyEvents)
      } catch (error) {}
    })
    .catch(() => {})
}
/** 设置快捷键事件和对应按键-页面级 */
export const setStorageYakRunnerAiCodeAuditShortcutKeyEvents = (events: Record<string, ShortcutKeyEventInfo>) => {
  if (!events) return
  currentKeyEvents = events as EventsType
  setLocalValue(LocalStorageKey, JSON.stringify(events))
}

/** 获取当前应用的快捷键事件集合 */
export const getYakRunnerAiCodeAuditShortcutKeyEvents = () => {
  if (currentKeyEvents) return currentKeyEvents
  return YakRunnerAiCodeAuditShortcutKeyEvents
}

/** 重置快捷键 */
export const resetYakRunnerAiCodeAuditShortcutKeyEvents = () => {
  currentKeyEvents = null
  setLocalValue(LocalStorageKey, JSON.stringify(YakRunnerAiCodeAuditShortcutKeyEvents))
}
