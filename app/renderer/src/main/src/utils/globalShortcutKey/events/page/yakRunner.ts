import {getLocalValue, setLocalValue} from "@/utils/kv"
import {YakitKeyBoard, YakitKeyMod} from "../../keyboard"
import {ShortcutKeyEventInfo} from "../pageMaps"
import { addScopeShow } from "../global"
import { JSONParseLog } from "@/utils/tool"
import i18n from "@/i18n/i18n"

const t = i18n.getFixedT(null, "utils")

/** yakRunner快捷键 */
export enum YakRunnerShortcutKey {
    // 新建临时文件
    YakRunnerCreate = "create*yakRunner",
    // 保存文件
    YakRunnerSave = "save*yakRunner",
    // 关闭已打开文件
    YakRunnerClose = "close*yakRunner",
    // 打开终端
    YakRunnerOpenTermina = "openTermina*yakRunner",
    // 文件重命名
    YakRunnerRename = "rename*yakRunner",
    // 文件删除
    YakRunnerDelete = "delete*yakRunner",
    // 文件复制
    YakRunnerCopy = "copy*yakRunner",
    // 文件粘贴
    YakRunnerPaste = "paste*yakRunner",
}

type EventsType = Record<`${YakRunnerShortcutKey}`, ShortcutKeyEventInfo>

const YakRunnerShortcutKeyEvents: EventsType = {
    "create*yakRunner": {
        name: t("ShortcutKey.newTemporaryFile"),
        keys: [YakitKeyMod.CtrlCmd,YakitKeyBoard.KEY_N]
    },
    "save*yakRunner": {
        name: t("ShortcutKey.saveFile"),
        keys: [YakitKeyMod.CtrlCmd,YakitKeyBoard.KEY_S]
    },
    "close*yakRunner": {
        name: t("ShortcutKey.closeOpenedFile"),
        keys: [YakitKeyMod.CtrlCmd,YakitKeyBoard.KEY_W]
    },
    "openTermina*yakRunner": {
        name: t("ShortcutKey.openTerminal"),
        keys: [YakitKeyMod.CtrlCmd,YakitKeyBoard.Backquote]
    },
    "rename*yakRunner": {
        name: t("ShortcutKey.renameFile"),
        keys: [YakitKeyBoard.F2]
    },
    "delete*yakRunner": {
        name: t("ShortcutKey.deleteFile"),
        keys: [YakitKeyBoard.Delete]
    },
    "copy*yakRunner": {
        name: t("ShortcutKey.copyFile"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_C]
    },
    "paste*yakRunner": {
        name: t("ShortcutKey.pasteFile"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_V]
    },
}

let currentKeyEvents: EventsType | null = null
const LocalStorageKey = "yak-runner-shortcut-key-events"

/** 获取快捷键事件和对应按键-页面级 */
export const getStorageYakRunnerShortcutKeyEvents = () => {
    getLocalValue(LocalStorageKey)
        .then((res) => {
            if (!res) return
            try {
                const data: EventsType = JSONParseLog(res,{page: "yakRunner", fun: "getStorageYakRunnerShortcutKeyEvents"})
                currentKeyEvents = addScopeShow(data,YakRunnerShortcutKeyEvents)
            } catch (error) {}
        })
        .catch(() => {})
}
/** 设置快捷键事件和对应按键-页面级 */
export const setStorageYakRunnerShortcutKeyEvents = (events: Record<string, ShortcutKeyEventInfo>) => {
    if (!events) return
    currentKeyEvents = events as EventsType
    setLocalValue(LocalStorageKey, JSON.stringify(events))
}

/** 获取当前应用的快捷键事件集合 */
export const getYakRunnerShortcutKeyEvents = () => {
    if (currentKeyEvents) return currentKeyEvents
    return YakRunnerShortcutKeyEvents
}

/** 重置快捷键 */
export const resetYakRunnerShortcutKeyEvents = () => {
    currentKeyEvents = null
    setLocalValue(LocalStorageKey, JSON.stringify(YakRunnerShortcutKeyEvents))
}

