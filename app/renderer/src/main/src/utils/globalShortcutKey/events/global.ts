import {getLocalValue, setLocalValue} from "@/utils/kv"
import {YakitKeyBoard, YakitKeyMod} from "../keyboard"
import {ShortcutKeyEventInfo} from "./pageMaps"
import {PRODUCT_RELEASE_EDITION} from "@/utils/envfile"
import { JSONParseLog } from "@/utils/tool"

/** 控件级焦点(子页面焦点暂不用做标记)  */
export enum ShortcutKeyFocusType {
    TableVirtual = "TableVirtual",
    Monaco = "Monaco",
}

export const addScopeShow = (newEvent, oldEvent) => {
    // 每次获取快捷键需更新其作用域
    Object.keys(newEvent).forEach((key) => {
        if (oldEvent[key]?.scopeShow) {
            newEvent[key] = {...newEvent[key], scopeShow: oldEvent[key].scopeShow}
        }
    })
    // 如果旧事件的key在新事件中没有，则将旧事件中此key添入新事件
    Object.keys(oldEvent).forEach((key) => {
        if (!newEvent[key]) {
            newEvent[key] = oldEvent[key]
        }
    })
    return newEvent
}

/** 全局快捷键 与 公共组件快捷键 合并  */
export enum GlobalShortcutKey {
    /** 截图 */
    Screenshot = "screenshot",
    /** 关闭当前页面 */
    RemovePage = "removePage",
    /** 新增二级页面 */
    AddSubPage = "addSubPage",

    /** --- 公共组件快捷键 --- */
    /** 发送并跳转 */
    CommonSendAndJumpToWebFuzzer = "sendAndJump*common",
    /** 仅发送 */
    CommonSendToWebFuzzer = "send*common",

    /** --- 公共组件快捷键（带焦点） --- */
    TableVirtualUP= "tableVirtualUP*common",
    TableVirtualDown= "tableVirtualDown*common"
}
const {Yakit, EnpriTrace} = PRODUCT_RELEASE_EDITION

type EventsType = Record<`${GlobalShortcutKey}`, ShortcutKeyEventInfo>

const globalShortcutKeyEvents: EventsType = {
    screenshot: {
        name: "截图",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Alt, YakitKeyBoard.KEY_B]
    },
    removePage: {
        name: "关闭当前页面",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_W]
    },
    addSubPage: {
        name: "新增二级页面",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_T]
    },
    // 公共组件快捷键
    "sendAndJump*common": {
        name: "发送并跳转",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_R],
        scopeShow: [Yakit, EnpriTrace]
    },
    "send*common": {
        name: "仅发送",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyBoard.KEY_R],
        scopeShow: [Yakit, EnpriTrace]
    },
    // 公共组件快捷键 + 焦点校验 ShortcutKeyFocusHook?
    "tableVirtualUP*common":{
        name: "Table表格向上选",
        keys: [YakitKeyBoard.UpArrow],
    },
    "tableVirtualDown*common":{
        name: "Table表格向下选",
        keys: [YakitKeyBoard.DownArrow],
    }
}

let currentKeyEvents: EventsType | null = null
const LocalStorageKey = "global-shortcut-key-events"

/** 获取快捷键事件和对应按键-全局 */
export const getStorageGlobalShortcutKeyEvents = () => {
    getLocalValue(LocalStorageKey)
        .then((res) => {
            if (!res) return
            try {
                const data: EventsType = JSONParseLog(res,{page: "global", fun: "getStorageGlobalShortcutKeyEvents"})
                currentKeyEvents = addScopeShow(data,globalShortcutKeyEvents)
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

/** 重置快捷键 */
export const resetGlobalShortcutKeyEvents = () => {
    currentKeyEvents = null
    setLocalValue(LocalStorageKey, JSON.stringify(globalShortcutKeyEvents))
}


