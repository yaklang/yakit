import {getLocalValue, setLocalValue} from "@/utils/kv"
import {YakitKeyBoard, YakitKeyMod} from "../../keyboard"
import {ShortcutKeyEventInfo} from "../pageMaps"
import { addScopeShow } from "../global"
import { JSONParseLog } from "@/utils/tool"

export enum HotPatchManagementShortcutKey {
    /** 保存热加载模板 */
    SaveHotPatchTemplate = "saveHotPatch*hotPatchManagement"
}

type EventsType = Record<`${HotPatchManagementShortcutKey}`, ShortcutKeyEventInfo>

const HotPatchManagementShortcutKeyEvents: EventsType = {
    "saveHotPatch*hotPatchManagement": {
        name: "保存热加载模板",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_S]
    }
}

let currentKeyEvents: EventsType | null = null
const LocalStorageKey = "hotPatchManagement-shortcut-key-events"

/** 获取快捷键事件和对应按键-页面级 */
export const getStorageHotPatchManagementShortcutKeyEvents = () => {
    getLocalValue(LocalStorageKey)
        .then((res) => {
            if (!res) return
            try {
                const data: EventsType = JSONParseLog(res,{page: "hotPatchManagement", fun: "getStorageHotPatchManagementShortcutKeyEvents"})
                currentKeyEvents = addScopeShow(data, HotPatchManagementShortcutKeyEvents)
            } catch (error) {}
        })
        .catch(() => {})
}
/** 设置快捷键事件和对应按键-页面级 */
export const setStorageHotPatchManagementShortcutKeyEvents = (events: Record<string, ShortcutKeyEventInfo>) => {
    if (!events) return
    currentKeyEvents = events as EventsType
    setLocalValue(LocalStorageKey, JSON.stringify(events))
}

/** 获取当前应用的快捷键事件集合 */
export const getHotPatchManagementShortcutKeyEvents = () => {
    if (currentKeyEvents) return currentKeyEvents
    return HotPatchManagementShortcutKeyEvents
}

/** 重置快捷键 */
export const resetHotPatchManagementShortcutKeyEvents = () => {
    currentKeyEvents = null
    setLocalValue(LocalStorageKey, JSON.stringify(HotPatchManagementShortcutKeyEvents))
}
