import {getLocalValue, setLocalValue} from "@/utils/kv"
import {YakitKeyBoard, YakitKeyMod} from "../../keyboard"
import {ShortcutKeyEventInfo} from "../pageMaps"
import {addScopeShow} from "../global"

export enum HttpFuzzerShortcutKey {
    /** 发送请求 */
    HttpFuzzerSendRequest = "sendRequest*httpFuzzer"
}

type EventsType = Record<`${HttpFuzzerShortcutKey}`, ShortcutKeyEventInfo>

const HttpFuzzerShortcutKeyEvents: EventsType = {
    "sendRequest*httpFuzzer": {
        name: "发送请求",
        keys: [YakitKeyMod.Alt, YakitKeyBoard.Enter]
    }
}

let currentKeyEvents: EventsType | null = null
const LocalStorageKey = "httpFuzzer-shortcut-key-events"

/** 获取快捷键事件和对应按键-页面级 */
export const getStorageHttpFuzzerShortcutKeyEvents = () => {
    getLocalValue(LocalStorageKey)
        .then((res) => {
            if (!res) return
            try {
                const data: EventsType = JSON.parse(res)
                currentKeyEvents = addScopeShow(data, HttpFuzzerShortcutKeyEvents)
            } catch (error) {}
        })
        .catch(() => {})
}
/** 设置快捷键事件和对应按键-页面级 */
export const setStorageHttpFuzzerShortcutKeyEvents = (events: Record<string, ShortcutKeyEventInfo>) => {
    if (!events) return
    currentKeyEvents = events as EventsType
    setLocalValue(LocalStorageKey, JSON.stringify(events))
}

/** 获取当前应用的快捷键事件集合 */
export const getHttpFuzzerShortcutKeyEvents = () => {
    if (currentKeyEvents) return currentKeyEvents
    return HttpFuzzerShortcutKeyEvents
}

/** 重置快捷键 */
export const resetHttpFuzzerShortcutKeyEvents = () => {
    currentKeyEvents = null
    setLocalValue(LocalStorageKey, JSON.stringify(HttpFuzzerShortcutKeyEvents))
}
