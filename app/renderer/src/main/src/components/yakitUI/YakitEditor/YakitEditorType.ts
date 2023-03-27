import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api"
import {EditorMenuItemType} from "./EditorMenu"

/** monaco-editor 相关接口 */
export type YakitSelection = monacoEditor.Selection
export type YakitIMonacoEditor = monacoEditor.editor.IStandaloneCodeEditor
export type YakitIMonacoCodeEditor = monacoEditor.editor.ICodeEditor
export type YakitITextModel = monacoEditor.editor.ITextModel

export interface YakitEditorProps {
    // full?: boolean

    /** @name 是否每次更新菜单 */
    forceRenderMenu?:boolean

    /** @name 额外添加封装好的菜单类 */
    menuType?: YakitEditorExtraRightMenuType[]

    /** @name 内容类型是否为字节码 */
    isBytes?: boolean
    /** @name 编辑器内容(string类型) */
    value?: string
    /** @name 编辑器内容(字节码类型) */
    valueBytes?: Uint8Array
    /** @name 修改编辑器内容事件回调 */
    setValue?: (content: string) => any

    /** @name 文件类型 */
    type?: "html" | "http" | "yak" | string
    /** @name 编辑器主题 */
    theme?: string

    /** @name 编辑器加载完成后的回调 */
    editorDidMount?: (editor: YakitIMonacoEditor) => any

    /** @name 右键菜单数组 */
    contextMenu?: OtherMenuListProps
    /** @name 右键菜单点击事件回调 */
    onContextMenu?: (editor: YakitIMonacoEditor, key: string) => any

    /** @name 配置项-是否开启只读模式 */
    readOnly?: boolean
    /** @name 配置项-是否关闭内容过长时的自动换行展示适配 */
    noWordWrap?: boolean
    /** @name 配置项-是否关闭代码mini地图展示 */
    noMiniMap?: boolean
    /** @name 配置项-是否关闭行号展示 */
    noLineNumber?: boolean
    /** @name 配置项-展示行号的位数(默认5位) */
    lineNumbersMinChars?: number
    /** @name 配置项-字体大小(默认为12) */
    fontSize?: number
}

/** @name 额外封装好的菜单组类型 */
export type YakitEditorExtraRightMenuType = "codec" | "http" | "pretty"
/** @name 额外封装菜单组的详情 */
export interface OtherMenuListProps {
    [key: string]: {
        menu: EditorMenuItemType[]
        onRun: (editor: YakitIMonacoEditor, key: string) => any
    }
}

/** @name 编辑器-键盘对应按键枚举(暂时只包含字母和F1-12) */
export enum YakitEditorKeyCode {
    Control = 17,
    Shift = 16,
    Meta = 93,
    Alt = 18,

    KEY_A = 65,
    KEY_B = 66,
    KEY_C = 67,
    KEY_D = 68,
    KEY_E = 69,
    KEY_F = 70,
    KEY_G = 71,
    KEY_H = 72,
    KEY_I = 73,
    KEY_J = 74,
    KEY_K = 75,
    KEY_L = 76,
    KEY_M = 77,
    KEY_N = 78,
    KEY_O = 79,
    KEY_P = 80,
    KEY_Q = 81,
    KEY_R = 82,
    KEY_S = 83,
    KEY_T = 84,
    KEY_U = 85,
    KEY_V = 86,
    KEY_W = 87,
    KEY_X = 88,
    KEY_Y = 89,
    KEY_Z = 90,
    F1 = 112,
    F2 = 113,
    F3 = 114,
    F4 = 115,
    F5 = 116,
    F6 = 117,
    F7 = 118,
    F8 = 119,
    F9 = 120,
    F10 = 121,
    F11 = 122,
    F12 = 123
}
/** 自定义快捷键对应的菜单项key值 */
export interface KeyboardToFuncProps {
    [key: string]: string[]
}
