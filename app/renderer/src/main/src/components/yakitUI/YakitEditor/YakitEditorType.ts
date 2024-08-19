import { ReactElement } from "react"
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api"
import { EditorMenuItemType } from "./EditorMenu"
import { EditorDetailInfoProps } from "@/pages/fuzzer/HTTPFuzzerEditorMenu"
import { HighLightText } from "@/components/HTTPFlowDetail"
import { Selection } from "@/pages/YakRunner/RunnerTabs/RunnerTabsType";

/** monaco-editor 相关接口 */
export type YakitSelection = monacoEditor.Selection
export type YakitIMonacoEditor = monacoEditor.editor.IStandaloneCodeEditor
export type YakitIMonacoCodeEditor = monacoEditor.editor.ICodeEditor
export type YakitITextModel = monacoEditor.editor.ITextModel
export type YakitIModelDecoration = monacoEditor.editor.IModelDecoration

/** @name 自带的菜单组可选项 */
export type YakitEditorExtraRightMenuType = "code" | "decode" | "http" | "customcontextmenu" | "aiplugin"

export interface YakitEditorProps {
    /** @name 是否每次更新菜单 */
    forceRenderMenu?: boolean

    /** @name 自带的菜单组可选项(多选) */
    menuType?: YakitEditorExtraRightMenuType[]

    /** @name 编辑器内容(string类型) */
    value?: string
    /** @name 修改编辑器内容事件回调 */
    setValue?: (content: string) => any

    /** @name 文件类型 */
    type?: "html" | "http" | "yak" | string
    /** @name 编辑器主题 */
    theme?: string

    /** @name 编辑器加载完成后的回调 */
    editorDidMount?: (editor: YakitIMonacoEditor,monaco: any) => any

    /** @name 自定义额外的右键菜单组 */
    contextMenu?: OtherMenuListProps
    /** @name 右键菜单点击事件回调 */
    onContextMenu?: (editor: YakitIMonacoEditor, key: string) => any

    /** @name 配置项-是否禁用 */
    disabled?: boolean
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

    /** @name 是否展示换行字符(只有在[type="http"]下有效,同时可在右键菜单中关闭显示功能) */
    showLineBreaks?: boolean

    /** @name 配置项-操作记录(拥有此项可记录字体大小及换行符) */
    editorOperationRecord?: string

    /** 配置项-编辑器自带(点击/选中)菜单(菜单默显示插入标签/编解码) */
    /** @name 配置项-是否显示编辑器自带(点击/选中)菜单(默认不显示) */
    isShowSelectRangeMenu?: boolean
    /** @name 配置项-菜单超出n行消失(默认3行) */
    overLine?: number
    /** @name 配置项-点击弹窗显示内容(默认为插入标签) */
    selectNode?: (close: () => void, editorInfo?: EditorDetailInfoProps) => ReactElement
    /** @name 配置项-选中弹窗显示内容(默认为编/解码-编辑器可读情况下为解码) */
    rangeNode?: (close: () => void, editorInfo?: EditorDetailInfoProps) => ReactElement

    /** @name 配置项-(存在此项则将字体/换行交由emiter更新) */
    editorId?: string

    highLightText?: HighLightText[] | Selection[]
    highLightClass?: string
}

/**
 * @name 自定义菜单组
 * @description 注意！！！key值一定和一级菜单的key值一致
 */
export interface OtherMenuListProps {
    [key: string]: {
        menu: EditorMenuItemType[]
        // data可传额外的任何参数 目前仅用作自定义右键执行-检测是否为ai插件
        onRun: (editor: YakitIMonacoEditor, key: string, pageId?: string, data?: any) => any
        /** Order菜单权重排序 0为第一个 1为第二个... 负数统一放最后 */
        order?: number
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

/** 操作记录存储 */
export interface OperationRecord {
    [key: string]: number | boolean
}

export interface OperationRecordRes {
    fontSize?: number
    showBreak?: boolean
}