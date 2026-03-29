import {getLocalValue, setLocalValue} from "@/utils/kv"
import {YakitKeyBoard, YakitKeyMod} from "../../keyboard"
import {ShortcutKeyEventInfo} from "../pageMaps"
import {
    convertKeyEventToKeyCombination,
    handleShortcutKey,
    parseShortcutKeyEvent,
    sortKeysCombination
} from "../../utils"
import {System, SystemInfo} from "@/constants/hardware"
import {addScopeShow} from "../global"
import { JSONParseLog } from "@/utils/tool"
import i18n from "@/i18n/i18n"

const t = i18n.getFixedT(null, "utils")

interface MonacoShortcutKeyEventInfo extends ShortcutKeyEventInfo {
    type?: System
}

// monaco编辑器默认内部快捷键 用于全局设置快捷键时提示
export const YakEditorDefaultShortcut: MonacoShortcutKeyEventInfo[] = [
    // 基础编辑
    {
        name: t("basic.ShortcutKey.undo"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_Z]
    },
    {
        name: t("basic.ShortcutKey.redo"),
        keys: [YakitKeyMod.Control, YakitKeyBoard.KEY_Y],
        type: "Windows_NT"
    },
    {
        name: t("basic.ShortcutKey.redo"),
        keys: [YakitKeyMod.Meta, YakitKeyMod.Shift, YakitKeyBoard.KEY_Z],
        type: "Darwin"
    },
    {
        name: t("basic.ShortcutKey.cut"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_X]
    },
    {
        name: t("basic.ShortcutKey.copy"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_C]
    },
    {
        name: t("basic.ShortcutKey.paste"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_V]
    },
    {
        name: t("basic.ShortcutKey.selectAll"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_A]
    },
    // 导航
    {
        name: t("basic.ShortcutKey.openCommandPalette"),
        keys: [YakitKeyBoard.F1],
        type: "Windows_NT"
    },
    {
        name: t("basic.ShortcutKey.openCommandPalette"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyBoard.KEY_P],
        type: "Darwin"
    },
    {
        name: t("basic.ShortcutKey.jumpToLine"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_G]
    },
    {
        name: t("basic.ShortcutKey.quickOpenFile"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_P]
    },
    {
        name: t("basic.ShortcutKey.find"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_F]
    },
    {
        name: t("basic.ShortcutKey.findNext"),
        keys: [YakitKeyBoard.F3],
        type: "Windows_NT"
    },
    {
        name: t("basic.ShortcutKey.findNext"),
        keys: [YakitKeyMod.Meta, YakitKeyBoard.KEY_G],
        type: "Darwin"
    },
    {
        name: t("basic.ShortcutKey.findPrev"),
        keys: [YakitKeyMod.Shift, YakitKeyBoard.F3],
        type: "Windows_NT"
    },
    {
        name: t("basic.ShortcutKey.findPrev"),
        keys: [YakitKeyMod.Meta, YakitKeyMod.Shift, YakitKeyBoard.KEY_G],
        type: "Darwin"
    },
    {
        name: t("basic.ShortcutKey.selectNextMatch"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_D]
    },
    {
        name: t("basic.ShortcutKey.selectAllMatches"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyBoard.KEY_L]
    },
    {
        name: t("basic.ShortcutKey.selectAllWords"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.F2]
    },
    {
        name: t("basic.ShortcutKey.expandSelection"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyMod.Alt, YakitKeyBoard.RightArrow]
    },
    {
        name: t("basic.ShortcutKey.shrinkSelection"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyMod.Alt, YakitKeyBoard.LeftArrow]
    },
    {
        name: t("basic.ShortcutKey.matchBracket"),
        keys: [YakitKeyMod.Control, YakitKeyMod.Shift, YakitKeyBoard.Backslash],
        type: "Windows_NT"
    },
    {
        name: t("basic.ShortcutKey.matchBracket"),
        keys: [YakitKeyMod.Meta, YakitKeyMod.Alt, YakitKeyBoard.Backslash],
        type: "Darwin"
    },
    {
        name: t("basic.ShortcutKey.addCursorUp"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Alt, YakitKeyBoard.UpArrow]
    },
    {
        name: t("basic.ShortcutKey.addCursorDown"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Alt, YakitKeyBoard.DownArrow]
    },
    {
        name: t("basic.ShortcutKey.selectCurrentLine"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_L]
    },
    {
        name: t("basic.ShortcutKey.undoLastCursor"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_U]
    },
    {
        name: t("basic.ShortcutKey.selectUp"),
        keys: [YakitKeyMod.Shift, YakitKeyBoard.UpArrow]
    },
    {
        name: t("basic.ShortcutKey.selectDown"),
        keys: [YakitKeyMod.Shift, YakitKeyBoard.DownArrow]
    },
    // 代码操作
    {
        name: t("basic.ShortcutKey.replace"),
        keys: [YakitKeyMod.Control, YakitKeyBoard.KEY_H],
        type: "Windows_NT"
    },
    {
        name: t("basic.ShortcutKey.replace"),
        keys: [YakitKeyMod.Meta, YakitKeyMod.Alt, YakitKeyBoard.KEY_F],
        type: "Darwin"
    },
    {
        name: t("basic.ShortcutKey.commentToggle"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.Slash]
    },
    {
        name: t("basic.ShortcutKey.indent"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.BracketRight]
    },
    {
        name: t("basic.ShortcutKey.outdent"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.BracketLeft]
    },
    {
        name: t("basic.ShortcutKey.deleteLine"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyBoard.KEY_K]
    },
    {
        name: t("basic.ShortcutKey.moveLineUp"),
        keys: [YakitKeyMod.Alt, YakitKeyBoard.UpArrow]
    },
    {
        name: t("basic.ShortcutKey.moveLineDown"),
        keys: [YakitKeyMod.Alt, YakitKeyBoard.DownArrow]
    },
    {
        name: t("basic.ShortcutKey.copyLineUp"),
        keys: [YakitKeyMod.Shift, YakitKeyMod.Alt, YakitKeyBoard.UpArrow]
    },
    {
        name: t("basic.ShortcutKey.copyLineDown"),
        keys: [YakitKeyMod.Shift, YakitKeyMod.Alt, YakitKeyBoard.DownArrow]
    },
    {
        name: t("basic.ShortcutKey.replaceAll"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Alt, YakitKeyBoard.Enter]
    },
    // 其他
    {
        name: t("basic.ShortcutKey.goToDefinition"),
        keys: [YakitKeyBoard.F12],
        type: "Windows_NT"
    }
]

/** 判断当前设置快捷键是否与编辑器默认内部快捷键冲突 */
export const isConflictToYakEditor = (Shortcut: string[]) => {
    let result: string = ""
    YakEditorDefaultShortcut.filter((item) => !item.type || item.type === SystemInfo.system).forEach((item) => {
        if (
            item.keys.includes(YakitKeyMod.CtrlCmd) &&
            (Shortcut.includes(YakitKeyMod.Control) || Shortcut.includes(YakitKeyMod.Meta))
        ) {
            let newKeys = item.keys.filter((item) => item !== YakitKeyMod.CtrlCmd)
            let newShortcut = Shortcut.filter((item) => item !== YakitKeyMod.Control && item !== YakitKeyMod.Meta)
            if (JSON.stringify(sortKeysCombination(newKeys)) === JSON.stringify(sortKeysCombination(newShortcut))) {
                result = t("basic.ShortcutKey.editorConflict", {name: item.name})
            }
        } else {
            if (JSON.stringify(sortKeysCombination(item.keys)) === JSON.stringify(sortKeysCombination(Shortcut))) {
                result = t("basic.ShortcutKey.editorConflict", {name: item.name})
            }
        }
    })
    return result as string
}

/** 编辑器基础快捷键 */
export enum YakEditorBaseShortcutKey {}
/** 编辑器扩展快捷键 */
export enum YakEditorOptionShortcutKey {
    /** --- 编辑器菜单快捷键 --- */
    /** 发送并跳转 */
    CommonSendAndJumpToWebFuzzer = "sendAndJump*common",
    /** 仅发送 */
    CommonSendToWebFuzzer = "send*common",
    /** 自定义HTTP数据包变形标记 - GET */
    CommonMutateHttpMethodGet = "mutate-http-method-get",
    /** 切换为自动劫持模式 */
    TriggerAutoHijacked = "trigger-auto-hijacked",
    /** 放行该 HTTP Response */
    ForwardResponse = "forward-response",
    /** 劫持响应 */
    HijackResponseMitm = "hijackResponse*common",
    /** 丢弃 */
    DropDataMitm = "dropData*common",
    /** 放行 */
    SubmitDataMitm = "submitData*common"
}

type EventsType = Record<`${YakEditorBaseShortcutKey | YakEditorOptionShortcutKey}`, ShortcutKeyEventInfo>

const YakEditorShortcutKeyEvents: EventsType = {
    "sendAndJump*common": {
        name: t("basic.ShortcutKey.sendAndJump"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_R]
    },
    "send*common": {
        name: t("basic.ShortcutKey.sendOnly"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyBoard.KEY_R]
    },
    "mutate-http-method-get": {
        name: t("basic.Encodec.changeHttpMethodGet"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyBoard.KEY_H]
    },
    "trigger-auto-hijacked": {
        name: t("basic.ShortcutKey.triggerAutoHijacked"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyBoard.KEY_T]
    },
    "forward-response": {
        name: t("basic.ShortcutKey.forwardResponse"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyBoard.KEY_F]
    },
    "hijackResponse*common": {
        name: t("basic.ShortcutKey.hijackResponse"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.UpArrow]
    },
    "dropData*common": {
        name: t("basic.ShortcutKey.dropData"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.DownArrow]
    },
    "submitData*common": {
        name: t("basic.ShortcutKey.submitData"),
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.RightArrow]
    }
}

let currentKeyEvents: EventsType | null = null
const LocalStorageKey = "yakit-editor-shortcut-key-events"

/** 获取快捷键事件和对应按键-组件级 */
export const getStorageYakEditorShortcutKeyEvents = () => {
    getLocalValue(LocalStorageKey)
        .then((res) => {
            if (!res) return
            try {
                const data: EventsType = JSONParseLog(res,{page: "yakEditor", fun: "getStorageYakEditorShortcutKeyEvents"})
                currentKeyEvents = addScopeShow(data, YakEditorShortcutKeyEvents)
            } catch (error) {}
        })
        .catch(() => {})
}
/** 设置快捷键事件和对应按键-组件级 */
export const setStorageYakEditorShortcutKeyEvents = (events: Record<string, ShortcutKeyEventInfo>) => {
    if (!events) return
    currentKeyEvents = events as EventsType
    setLocalValue(LocalStorageKey, JSON.stringify(events))
}

/** 获取当前应用的快捷键事件集合 */
export const getYakEditorShortcutKeyEvents = () => {
    if (currentKeyEvents) return currentKeyEvents
    return YakEditorShortcutKeyEvents
}

/** 重置快捷键 */
export const resetYakEditorShortcutKeyEvents = () => {
    currentKeyEvents = null
    setLocalValue(LocalStorageKey, JSON.stringify(YakEditorShortcutKeyEvents))
}

const isAllowPass = (arr: string[]) => {
    // PS：由于编辑器中存在双击Shift的特殊情况（暂时屏蔽单键Shift情况，等待后期优化）
    if (arr.length <= 1 && !arr.includes("Shift")) return false
    return ["Alt", "Shift", "Control", "Meta"].some((item) => arr.includes(item))
}

/** 判断当前输入是否直接使用编辑器默认内部快捷键 */
export const isYakEditorDefaultShortcut = (ev: KeyboardEvent): boolean => {
    const keys = convertKeyEventToKeyCombination(ev)
    if (!keys) return true
    // 非组合快捷键不拦截monaco正常输入
    if (!isAllowPass(keys)) return true
    let nowKey = sortKeysCombination(keys).join("")
    let has = false
    YakEditorDefaultShortcut.forEach((item) => {
        let itemKey = sortKeysCombination(item.keys).join("")
        if (nowKey === itemKey) {
            has = true
        }
    })
    return has
}

/** 判断当前输入是否激活编辑器自定义内部快捷键 */
export const isYakEditorShortcut = (ev: KeyboardEvent): boolean => {
    const keys = convertKeyEventToKeyCombination(ev)
    if (!keys) return false
    let nowKey = sortKeysCombination(keys).join("")
    let has = false
    Object.keys(getYakEditorShortcutKeyEvents()).forEach((key) => {
        let itemKey = sortKeysCombination(getYakEditorShortcutKeyEvents()[key].keys).join("")
        if (nowKey === itemKey) {
            has = true
        }
    })
    // if (has) {
    //     // 等待接入功能

    // }
    return has
}

/** 判断当前输入是否激活页面级或全局快捷键 */
export const isPageOrGlobalShortcut = (ev: KeyboardEvent): string | null => {
    const keys = convertKeyEventToKeyCombination(ev)
    if (!keys) return null
    const eventName = parseShortcutKeyEvent(keys)
    if (!eventName) return null
    handleShortcutKey(ev)
    return eventName
}
