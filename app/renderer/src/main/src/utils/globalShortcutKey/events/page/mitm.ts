import {getLocalValue, setLocalValue} from "@/utils/kv"
import {YakitKeyBoard, YakitKeyMod} from "../../keyboard"
import {ShortcutKeyEventInfo} from "../pageMaps"
import { addScopeShow } from "../global"

export enum MitmShortcutKey {
    /** 劫持响应 */
    HijackResponseMitm = "hijackResponse*mitm",
    /** 丢弃 */
    DropDataMitm = "dropData*mitm",
    /** 放行 */
    SubmitDataMitm = "submitData*mitm"
}

type EventsType = Record<`${MitmShortcutKey}`, ShortcutKeyEventInfo>

const MitmShortcutKeyEvents: EventsType = {
    "hijackResponse*mitm": {
        name: "劫持响应",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.UpArrow]
    },
    "dropData*mitm": {
        name: "丢弃",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.DownArrow]
    },
    "submitData*mitm": {
        name: "放行",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.RightArrow]
    }
}

let currentKeyEvents: EventsType | null = null
const LocalStorageKey = "mitm-shortcut-key-events"

/** 获取快捷键事件和对应按键-页面级 */
export const getStorageMitmShortcutKeyEvents = () => {
    getLocalValue(LocalStorageKey)
        .then((res) => {
            if (!res) return
            try {
                const data: EventsType = JSON.parse(res)
                currentKeyEvents = addScopeShow(data,MitmShortcutKeyEvents)
            } catch (error) {}
        })
        .catch(() => {})
}
/** 设置快捷键事件和对应按键-页面级 */
export const setStorageMitmShortcutKeyEvents = (events: Record<string, ShortcutKeyEventInfo>) => {
    if (!events) return
    currentKeyEvents = events as EventsType
    setLocalValue(LocalStorageKey, JSON.stringify(events))
}

/** 获取当前应用的快捷键事件集合 */
export const getMitmShortcutKeyEvents = () => {
    if (currentKeyEvents) return currentKeyEvents
    return MitmShortcutKeyEvents
}

/** 重置快捷键 */
export const resetMitmShortcutKeyEvents = () => {
    currentKeyEvents = null
    setLocalValue(LocalStorageKey, JSON.stringify(MitmShortcutKeyEvents))
}


