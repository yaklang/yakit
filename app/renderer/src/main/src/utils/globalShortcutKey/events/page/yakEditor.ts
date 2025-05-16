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

interface MonacoShortcutKeyEventInfo extends ShortcutKeyEventInfo {
    type?: System
}

// monaco编辑器默认内部快捷键 用于全局设置快捷键时提示
export const YakEditorDefaultShortcut: MonacoShortcutKeyEventInfo[] = [
    // 基础编辑
    {
        name: "撤销",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_Z]
    },
    {
        name: "重做",
        keys: [YakitKeyMod.Control, YakitKeyBoard.KEY_Y],
        type: "Windows_NT"
    },
    {
        name: "重做",
        keys: [YakitKeyMod.Meta, YakitKeyMod.Shift, YakitKeyBoard.KEY_Z],
        type: "Darwin"
    },
    {
        name: "剪切",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_X]
    },
    {
        name: "复制",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_C]
    },
    {
        name: "粘贴",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_V]
    },
    {
        name: "全选",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_A]
    },
    // 导航
    {
        name: "打开命令面板",
        keys: [YakitKeyBoard.F1],
        type: "Windows_NT"
    },
    {
        name: "打开命令面板",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyBoard.KEY_P],
        type: "Darwin"
    },
    {
        name: "跳转到行",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_G]
    },
    {
        name: "快速打开文件",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_P]
    },
    {
        name: "查找",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_F]
    },
    {
        name: "查找下一个",
        keys: [YakitKeyBoard.F3],
        type: "Windows_NT"
    },
    {
        name: "查找下一个",
        keys: [YakitKeyMod.Meta, YakitKeyBoard.KEY_G],
        type: "Darwin"
    },
    {
        name: "查找上一个",
        keys: [YakitKeyMod.Shift, YakitKeyBoard.F3],
        type: "Windows_NT"
    },
    {
        name: "查找上一个",
        keys: [YakitKeyMod.Meta, YakitKeyMod.Shift, YakitKeyBoard.KEY_G],
        type: "Darwin"
    },
    {
        name: "选择下一个匹配项",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_D]
    },
    {
        name: "选择所有匹配项",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyBoard.KEY_L]
    },
    {
        name: "选择所有匹配的单词",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.F2]
    },
    {
        name: "扩展选择",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyMod.Alt, YakitKeyBoard.RightArrow]
    },
    {
        name: "缩小选择",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyMod.Alt, YakitKeyBoard.LeftArrow]
    },
    {
        name: "跳转到匹配的括号",
        keys: [YakitKeyMod.Control, YakitKeyMod.Shift, YakitKeyBoard.Backslash],
        type: "Windows_NT"
    },
    {
        name: "跳转到匹配的括号",
        keys: [YakitKeyMod.Meta, YakitKeyMod.Alt, YakitKeyBoard.Backslash],
        type: "Darwin"
    },
    {
        name: "向上添加光标",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Alt, YakitKeyBoard.UpArrow]
    },
    {
        name: "向下添加光标",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Alt, YakitKeyBoard.DownArrow]
    },
    {
        name: "选择当前行",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_L]
    },
    {
        name: "撤销上一个光标操作",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.KEY_U]
    },
    {
        name: "向上选中",
        keys: [YakitKeyMod.Shift, YakitKeyBoard.UpArrow]
    },
    {
        name: "向下选中",
        keys: [YakitKeyMod.Shift, YakitKeyBoard.DownArrow]
    },
    // 代码操作
    {
        name: "替换",
        keys: [YakitKeyMod.Control, YakitKeyBoard.KEY_H],
        type: "Windows_NT"
    },
    {
        name: "替换",
        keys: [YakitKeyMod.Meta, YakitKeyMod.Alt, YakitKeyBoard.KEY_F],
        type: "Darwin"
    },
    {
        name: "注释/取消注释",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.Slash]
    },
    {
        name: "缩进",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.BracketRight]
    },
    {
        name: "取消缩进",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyBoard.BracketLeft]
    },
    {
        name: "删除行",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Shift, YakitKeyBoard.KEY_K]
    },
    {
        name: "向上移动行",
        keys: [YakitKeyMod.Alt, YakitKeyBoard.UpArrow]
    },
    {
        name: "向下移动行",
        keys: [YakitKeyMod.Alt, YakitKeyBoard.DownArrow]
    },
    {
        name: "向上复制行",
        keys: [YakitKeyMod.Shift, YakitKeyMod.Alt, YakitKeyBoard.UpArrow]
    },
    {
        name: "向下复制行",
        keys: [YakitKeyMod.Shift, YakitKeyMod.Alt, YakitKeyBoard.DownArrow]
    },
    {
        name: "替换所有匹配项",
        keys: [YakitKeyMod.CtrlCmd, YakitKeyMod.Alt, YakitKeyBoard.Enter]
    },
    // 其他
    {
        name: "跳转到定义",
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
                result = `编辑器冲突：${item.name}`
            }
        } else {
            if (JSON.stringify(sortKeysCombination(item.keys)) === JSON.stringify(sortKeysCombination(Shortcut))) {
                console.log("item.keys", item.keys, Shortcut)
                result = `编辑器冲突：${item.name}`
            }
        }
    })
    return result as string
}

/** 编辑器基础快捷键 */
export enum YakEditorBaseShortcutKey {}
/** 编辑器扩展快捷键 */
export enum YakEditorOptionShortcutKey {}

type EventsType = Record<`${YakEditorBaseShortcutKey | YakEditorOptionShortcutKey}`, ShortcutKeyEventInfo>

const YakEditorShortcutKeyEvents: EventsType = {}

let currentKeyEvents: EventsType | null = null
const LocalStorageKey = "yakit-editor-shortcut-key-events"

/** 获取快捷键事件和对应按键-全局 */
export const getStorageYakEditorShortcutKeyEvents = () => {
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

const isAllowPass = (arr: string[]) => {
    if (arr.length <= 1) return false
    return ["Alt", "Shift", "Control", "Meta"].some((item) => arr.includes(item))
}

/** 判断当前输入是否激活编辑器自定义内部快捷键 */
export const isYakEditorShortcut = (ev: KeyboardEvent): boolean => {
    const keys = convertKeyEventToKeyCombination(ev)
    if (!keys) return false
    // 非组合快捷键不拦截monaco正常输入
    if (!isAllowPass(keys)) return false
    let nowKey = sortKeysCombination(keys).join("")
    let has = false
    Object.keys(YakEditorShortcutKeyEvents).forEach((key) => {
        let itemKey = sortKeysCombination(YakEditorShortcutKeyEvents[key].keys).join("")
        if (nowKey === itemKey) {
            has = true
        }
    })
    if (has) {
        // 等待接入功能
    }
    return has
}

/** 判断当前输入是否激活页面级或全局快捷键 */
export const isPageOrGlobalShortcut = (ev: KeyboardEvent): boolean => {
    const keys = convertKeyEventToKeyCombination(ev)
    if (!keys) return false
    // 非组合快捷键不拦截monaco正常输入
    if (!isAllowPass(keys)) return false
    const eventName = parseShortcutKeyEvent(keys)
    if (!eventName) return false
    handleShortcutKey(ev)
    return true
}
