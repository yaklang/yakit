import {getLocalValue, setLocalValue} from "@/utils/kv"
import {YakitKeyBoard, YakitKeyMod} from "../../keyboard"
import {ShortcutKeyEventInfo} from "../pageMaps"

export enum PluginHubShortcutKey {
    /** 新建插件 */
    NewPlugin = "newPlugin"
}

type EventsType = Record<`${PluginHubShortcutKey}`, ShortcutKeyEventInfo>

const PluginHubShortcutKeyEvents: EventsType = {
    newPlugin: {
        name: "新建插件",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Alt, YakitKeyBoard.KEY_B]
    }
}

let currentKeyEvents: EventsType | null = null
const LocalStorageKey = "plugin-hub-shortcut-key-events"

/** 获取快捷键事件和对应按键-全局 */
export const getStoragePluginHubShortcutKeyEvents = () => {
    getLocalValue(LocalStorageKey)
        .then((res) => {
            if (!res) return
            try {
                const data: EventsType = JSON.parse(res)
                currentKeyEvents = data
            } catch (error) {}
        })
        .catch(() => {})
}
/** 设置快捷键事件和对应按键-全局 */
export const setStoragePluginHubShortcutKeyEvents = (events: Record<string, ShortcutKeyEventInfo>) => {
    if (!events) return
    currentKeyEvents = events as EventsType
    setLocalValue(LocalStorageKey, JSON.stringify(events))
}

/** 获取当前应用的快捷键事件集合 */
export const getPluginHubShortcutKeyEvents = () => {
    if (currentKeyEvents) return currentKeyEvents
    return PluginHubShortcutKeyEvents
}
