import {YakitSystem} from "@/yakitGVDefine"
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api"
import {EditorMenuItemDividerProps, EditorMenuItemProps, EditorMenuItemType} from "./EditorMenu"
import {YakitIMonacoEditor} from "./YakitEditorType"

/** 除meta、ctrl、alt、shift键外的keycode映射字符 */
export const KeyboardToValue = {
    65: "A",
    66: "B",
    67: "C",
    68: "D",
    69: "E",
    70: "F",
    71: "G",
    72: "H",
    73: "I",
    74: "J",
    75: "K",
    76: "L",
    77: "M",
    78: "N",
    79: "O",
    80: "P",
    81: "Q",
    82: "R",
    83: "S",
    84: "T",
    85: "U",
    86: "V",
    87: "W",
    88: "X",
    89: "Y",
    90: "Z",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12"
}
// mac键盘对应meta、ctrl、alt、shift键符
export const MacKeyborad = {17: "⌃", 93: "⌘", 18: "⌥", 16: "⇧"}
// win键盘对应meta、ctrl、alt、shift键符
export const WinKeyborad = {17: "Ctrl", 93: "Win", 18: "Alt", 16: "Shift"}

/**
 * @name 将快捷键顺序进行整理展示
 * @description 展示顺序 ctrl-shift-alt-meta-字母-f1~12
 */
export const keySortHandle = (keys: number[]) => {
    let sortKeys = keys.sort((a, b) => a - b)

    if (sortKeys.includes(17)) sortKeys = [17].concat(sortKeys.filter((item) => item !== 17))
    if (sortKeys.includes(93)) {
        let index = 0

        sortKeys = sortKeys.filter((item, i) => {
            if (item > 18) index = i
            return item !== 93
        })
        sortKeys.splice(index === 0 ? 0 : index - 1, 0, 93)
    }
    return sortKeys
}
/**
 * @name 将对应键盘枚举数组 转化为 可展示的键盘键符
 * @returns string | null
 */
export const convertKeyboard: (system: YakitSystem, keys: number[]) => string | null = (system, keys) => {
    if (keys.length === 0) return null

    const specialKeys = system === "Darwin" ? MacKeyborad : WinKeyborad
    const joint = system === "Darwin" ? "" : "+"

    let sortKeys = keySortHandle(keys)

    sortKeys = sortKeys.map((item) => (specialKeys[item] ? specialKeys[item] : item))
    sortKeys = sortKeys.map((item) => (KeyboardToValue[item] ? KeyboardToValue[item] : item))

    return (sortKeys as any as string[]).join(joint)
}

/**
 * @name 获取编辑器光标选中坐标范围值
 * @param editor 编辑器对象实例
 * @param isGetRow 未选中内容时是否获取整行内容,有选中内容时该字段无效
 * @returns monaco.Range实例 | null
 */
export const fetchSelectionRange = (editor: YakitIMonacoEditor, isGetRow?: boolean) => {
    const selection = editor?.getSelection()
    if (!selection) return null
    const model = editor?.getModel()
    if (!model) return null

    const startColumn = selection.startColumn
    const startLineNumber = selection.startLineNumber
    const endColumn = selection.endColumn
    const endLineNumber = selection.endLineNumber
    let noSelected: boolean = startColumn === endColumn && startLineNumber === endLineNumber
    noSelected = !!isGetRow && noSelected

    return new monacoEditor.Range(
        startLineNumber,
        noSelected ? 1 : startColumn,
        endLineNumber,
        noSelected ? model.getLineMaxColumn(startLineNumber) : endColumn
    )
}

/**
 * @name 获取编辑器光标选中内容
 * @param editor 编辑器对象实例
 * @param isGetRow 未选中内容时是否获取整行内容,有选中内容时该字段无效
 */
export const fetchCursorContent = (editor: YakitIMonacoEditor, isGetRow?: boolean) => {
    const model = editor?.getModel()
    if (!model) return ""
    const range = fetchSelectionRange(editor, isGetRow)
    if (!range) return ""

    return model.getValueInRange(range)
}

/**
 * @name 获取自定义菜单所有项的key值，并整合成一个一维数组
 * @description 注意！！！ 本方法使用了ES10中数据对象新方法 flat 使用时请确定是否存在该方法
 */
export const flatContextMenu = (menus: EditorMenuItemType[]) => {
    const filterDividerMenus = menus
        .filter((item) => {
            if (typeof (item as any as EditorMenuItemDividerProps)["type"] !== "undefined") {
                return false
            }
            return true
        })
        .map((item) => {
            const info = item as any as EditorMenuItemProps
            return info
        })

    const flatMenus = filterDividerMenus.flat(Infinity).map((item) => item.key)

    return flatMenus
}
