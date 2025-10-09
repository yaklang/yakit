import {getLocalValue, setLocalValue} from "@/utils/kv"
import {YakitKeyBoard, YakitKeyMod} from "../../keyboard"
import {ShortcutKeyEventInfo} from "../pageMaps"
import { addScopeShow } from "../global"

export enum YakitMultipleShortcutKey {
    /** 多页面快捷键 */
    SaveNewPlugin = "save*pluginEditor"
}

type EventsType = Record<`${YakitMultipleShortcutKey}`, ShortcutKeyEventInfo>

const YakitMultipleShortcutKeyEvents: EventsType = {
    "save*pluginEditor": {
        name: "插件保存",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_S]
    }
}

let currentKeyEvents: EventsType | null = null
const LocalStorageKey = "yakit-multiple-shortcut-key-events"

/** 获取快捷键事件和对应按键-焦点级 */
export const getStorageYakitMultipleShortcutKeyEvents = () => {
    getLocalValue(LocalStorageKey)
        .then((res) => {
            if (!res) return
            try {
                const data: EventsType = JSON.parse(res)
                currentKeyEvents = addScopeShow(data,YakitMultipleShortcutKeyEvents)
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


