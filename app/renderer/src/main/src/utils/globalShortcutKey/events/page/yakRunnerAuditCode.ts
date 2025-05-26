import {getLocalValue, setLocalValue} from "@/utils/kv"
import {YakitKeyBoard, YakitKeyMod} from "../../keyboard"
import {ShortcutKeyEventInfo} from "../pageMaps"

/** 代码审计快捷键 */
export enum AuditCodeShortcutKey {
    // 呼出搜索
    AuditSearch = "search*aduit",
    // 搜索栏切换
    SearchTab = "searchTab*aduit",
    // 搜索列表上下切换
    SearchArrowUp = "searchArrowUp*aduit",
    SearchArrowDown = "searchArrowDown*aduit",
    // 关闭搜索
    SearchEscape = "searchEscape*aduit",
    // 搜索跳转
    SearchEnter = "searchEnter*aduit",
    // 开始审计
    AuditSubmit = "submit*aduit"
}

type EventsType = Record<`${AuditCodeShortcutKey}`, ShortcutKeyEventInfo>

const AuditCodeShortcutKeyEvents: EventsType = {
    "search*aduit": {
        name: "呼出搜索",
        keys: [YakitKeyMod.Shift]
    },
    "searchTab*aduit": {
        name: "搜索栏切换",
        keys: [YakitKeyBoard.Tab]
    },
    "searchArrowUp*aduit": {
        name: "搜索列表上切换",
        keys: [YakitKeyBoard.UpArrow]
    },
    "searchArrowDown*aduit": {
        name: "搜索列表下切换",
        keys: [YakitKeyBoard.DownArrow]
    },
    "searchEscape*aduit": {
        name: "关闭搜索",
        keys: [YakitKeyBoard.Escape]
    },
    "searchEnter*aduit": {
        name: "搜索跳转",
        keys: [YakitKeyBoard.Enter]
    },
    "submit*aduit": {
        name: "开始审计",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.Enter]
    }
}

let currentKeyEvents: EventsType | null = null
const LocalStorageKey = "audit-code-shortcut-key-events"

/** 获取快捷键事件和对应按键-页面级 */
export const getStorageAuditCodeShortcutKeyEvents = () => {
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
/** 设置快捷键事件和对应按键-页面级 */
export const setStorageAuditCodeShortcutKeyEvents = (events: Record<string, ShortcutKeyEventInfo>) => {
    if (!events) return
    currentKeyEvents = events as EventsType
    setLocalValue(LocalStorageKey, JSON.stringify(events))
}

/** 获取当前应用的快捷键事件集合 */
export const getAuditCodeShortcutKeyEvents = () => {
    if (currentKeyEvents) return currentKeyEvents
    return AuditCodeShortcutKeyEvents
}
