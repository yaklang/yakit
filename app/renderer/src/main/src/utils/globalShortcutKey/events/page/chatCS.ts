import {getLocalValue, setLocalValue} from "@/utils/kv"
import {YakitKeyBoard, YakitKeyMod} from "../../keyboard"
import {ShortcutKeyEventInfo} from "../pageMaps"
import { addScopeShow } from "../global"

export enum ChatCSShortcutKey {
    /** 退出chatCS */
    ExitChatCS = "exit*chatCS",
    /** 换行 */
    NextLineChatCS = "nextLine*chatCS",
    /** 问题提问 */
    SubmitChatCS = "submit*chatCS"
}

type EventsType = Record<`${ChatCSShortcutKey}`, ShortcutKeyEventInfo>

const ChatCSShortcutKeyEvents: EventsType = {
    "exit*chatCS": {
        name: "退出chatCS",
        keys: [YakitKeyBoard.Escape]
    },
    "nextLine*chatCS": {
        name: "提问区域换行",
        keys: [YakitKeyMod.Shift, YakitKeyBoard.Enter]
    },
    "submit*chatCS": {
        name: "问题提问",
        keys: [YakitKeyBoard.Enter]
    }
}

let currentKeyEvents: EventsType | null = null
const LocalStorageKey = "chat-cs-shortcut-key-events"

/** 获取快捷键事件和对应按键-页面级 */
export const getStorageChatCSShortcutKeyEvents = () => {
    getLocalValue(LocalStorageKey)
        .then((res) => {
            if (!res) return
            try {
                const data: EventsType = JSON.parse(res)
                currentKeyEvents = addScopeShow(data,ChatCSShortcutKeyEvents)
            } catch (error) {}
        })
        .catch(() => {})
}
/** 设置快捷键事件和对应按键-页面级 */
export const setStorageChatCSShortcutKeyEvents = (events: Record<string, ShortcutKeyEventInfo>) => {
    if (!events) return
    currentKeyEvents = events as EventsType
    setLocalValue(LocalStorageKey, JSON.stringify(events))
}

/** 获取当前应用的快捷键事件集合 */
export const getChatCSShortcutKeyEvents = () => {
    if (currentKeyEvents) return currentKeyEvents
    return ChatCSShortcutKeyEvents
}

/** 重置快捷键 */
export const resetChatCSShortcutKeyEvents = () => {
    currentKeyEvents = null
    setLocalValue(LocalStorageKey, JSON.stringify(ChatCSShortcutKeyEvents))
}


