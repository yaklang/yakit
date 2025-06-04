import {getLocalValue, setLocalValue} from "@/utils/kv"
import {YakitKeyBoard, YakitKeyMod} from "../../keyboard"
import {ShortcutKeyEventInfo} from "../pageMaps"
import { addScopeShow } from "../global"

export enum YakitScriptFocusShortcutKey {
    /** 新建插件 */
    SaveNewPlugin = "save*pluginEditor"
}

type EventsType = Record<`${YakitScriptFocusShortcutKey}`, ShortcutKeyEventInfo>

const YakitScriptFocusShortcutKeyEvents: EventsType = {
    "save*pluginEditor": {
        name: "编辑插件保存",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_S]
    }
}

let currentKeyEvents: EventsType | null = null
const LocalStorageKey = "yakit-script-focus-shortcut-key-events"

/** 获取快捷键事件和对应按键-焦点级 */
export const getStorageYakitScriptFocusShortcutKeyEvents = () => {
    getLocalValue(LocalStorageKey)
        .then((res) => {
            if (!res) return
            try {
                const data: EventsType = JSON.parse(res)
                currentKeyEvents = addScopeShow(data,YakitScriptFocusShortcutKeyEvents)
            } catch (error) {}
        })
        .catch(() => {})
}
/** 设置快捷键事件和对应按键-焦点级 */
export const setStorageYakitScriptFocusShortcutKeyEvents = (events: Record<string, ShortcutKeyEventInfo>) => {
    if (!events) return
    currentKeyEvents = events as EventsType
    setLocalValue(LocalStorageKey, JSON.stringify(events))
}

/** 获取当前应用的快捷键事件集合 */
export const getYakitScriptFocusShortcutKeyEvents = () => {
    if (currentKeyEvents) return currentKeyEvents
    return YakitScriptFocusShortcutKeyEvents
}

/** 重置快捷键 */
export const resetYakitScriptFocusShortcutKeyEvents = () => {
    currentKeyEvents = null
    setLocalValue(LocalStorageKey, JSON.stringify(YakitScriptFocusShortcutKeyEvents))
}


