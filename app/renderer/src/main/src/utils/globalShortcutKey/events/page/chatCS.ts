import {getLocalValue, setLocalValue} from "@/utils/kv"
import {YakitKeyBoard, YakitKeyMod} from "../../keyboard"
import {ShortcutKeyEventInfo} from "../pageMaps"
import { addScopeShow } from "../global"
import { JSONParseLog } from "@/utils/tool"
import i18n from "@/i18n/i18n"

const t = i18n.getFixedT(null, "utils")

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
        name: t("ShortcutKey.exitChatCS"),
        keys: [YakitKeyBoard.Escape]
    },
    "nextLine*chatCS": {
        name: t("ShortcutKey.chatCSNewLine"),
        keys: [YakitKeyMod.Shift, YakitKeyBoard.Enter]
    },
    "submit*chatCS": {
        name: t("ShortcutKey.chatCSSubmit"),
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
                const data: EventsType = JSONParseLog(res,{page: "chatCS", fun: "getStorageChatCSShortcutKeyEvents"})
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

