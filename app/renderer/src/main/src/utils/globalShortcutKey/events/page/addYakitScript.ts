import {getLocalValue, setLocalValue} from "@/utils/kv"
import {YakitKeyBoard, YakitKeyMod} from "../../keyboard"
import {ShortcutKeyEventInfo} from "../pageMaps"
import { addScopeShow } from "../global"

export enum AddYakitScriptShortcutKey {
    /** 新建插件 */
    SaveNewPlugin = "save*newPlugin"
}

type EventsType = Record<`${AddYakitScriptShortcutKey}`, ShortcutKeyEventInfo>

const AddYakitScriptShortcutKeyEvents: EventsType = {
    "save*newPlugin": {
        name: "新建插件保存",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_S]
    }
}

let currentKeyEvents: EventsType | null = null
const LocalStorageKey = "add-yakit-script-shortcut-key-events"

/** 获取快捷键事件和对应按键-页面级 */
export const getStorageAddYakitScriptShortcutKeyEvents = () => {
    getLocalValue(LocalStorageKey)
        .then((res) => {
            if (!res) return
            try {
                const data: EventsType = JSON.parse(res)
                currentKeyEvents = addScopeShow(data,AddYakitScriptShortcutKeyEvents)
            } catch (error) {}
        })
        .catch(() => {})
}
/** 设置快捷键事件和对应按键-页面级 */
export const setStorageAddYakitScriptShortcutKeyEvents = (events: Record<string, ShortcutKeyEventInfo>) => {
    if (!events) return
    currentKeyEvents = events as EventsType
    setLocalValue(LocalStorageKey, JSON.stringify(events))
}

/** 获取当前应用的快捷键事件集合 */
export const getAddYakitScriptShortcutKeyEvents = () => {
    if (currentKeyEvents) return currentKeyEvents
    return AddYakitScriptShortcutKeyEvents
}

/** 重置快捷键 */
export const resetAddYakitScriptShortcutKeyEvents = () => {
    currentKeyEvents = null
    setLocalValue(LocalStorageKey, JSON.stringify(AddYakitScriptShortcutKeyEvents))
}


