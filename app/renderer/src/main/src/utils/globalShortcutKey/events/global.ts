import {getLocalValue, setLocalValue} from "@/utils/kv"
import {YakitKeyBoard, YakitKeyMod} from "../keyboard"
import {ShortcutKeyEventInfo} from "./pageMaps"

/** 全局快捷键 与 公共组件快捷键 合并  */
export enum GlobalShortcutKey {
    /** 截图 */
    Screenshot = "screenshot",
    /** 关闭当前页面及二级页面 */
    RemovePage = "removePage",
    /** 新增二级页面 */
    AddSubPage = "addSubPage",

    /** --- 公共组件快捷键 --- */
    /** 发送并跳转 */
    CommonSendAndJumpToWebFuzzer = "sendAndJump*common",
    /** 仅发送 */
    CommonSendToWebFuzzer = "send*common"
}

type EventsType = Record<GlobalShortcutKey, ShortcutKeyEventInfo>

const globalShortcutKeyEvents: EventsType = {
    screenshot: {
        name: "截图",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Alt, YakitKeyBoard.KEY_B]
    },
    removePage: {
        name: "关闭当前页面及二级页面",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_W]
    },
    addSubPage: {
        name: "新增二级页面",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_T]
    },
    // 公共组件快捷键
    "sendAndJump*common": {
        name: "发送并跳转",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_R]
    },
    "send*common": {
        name: "仅发送",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyBoard.KEY_R]
    },
}

let currentKeyEvents: EventsType | null = null
const LocalStorageKey = "global-shortcut-key-events"

/** 获取快捷键事件和对应按键-全局 */
export const getStorageGlobalShortcutKeyEvents = () => {
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
export const setStorageGlobalShortcutKeyEvents = (events: Record<string, ShortcutKeyEventInfo>) => {
    if (!events) return
    currentKeyEvents = events as EventsType
    setLocalValue(LocalStorageKey, JSON.stringify(events))
}

/** 获取当前应用的快捷键事件集合 */
export const getGlobalShortcutKeyEvents = () => {
    if (currentKeyEvents) return currentKeyEvents
    return globalShortcutKeyEvents
}
