import {FileNodeProps} from "./FileTree/FileTreeType"

export interface YakRunnerProps {
    initCode?: YakRunnerCodeProps
}

export interface YakRunnerCodeProps {
    /** 源码 */
    content: string
    /** 源码语言 */
    language: string
    /** 绝对路径 */
    paht?: string
    /** 文件名字 */
    name?: string
}

export declare namespace YakRunnerView {
    /** 光标位置 */
    export interface CursorPosition {
        line: number
        column: number
    }
    /** 打开文件信息 */
    export interface OpenFile extends FileNodeProps {
        /** 是否有未保存的更改 */
        isDirty: boolean
        /** 是否为当前活动文件 */
        isActive: boolean
        /** 文件语言 */
        language: string
        /** 当前光标位置 */
        position: CursorPosition
        /** 源码 */
        code: string
    }
}

export interface ViewsInfoProps {
    direction: "vertical" | "horizontal" | ""
    views: ViewFileProps | ViewsInfoProps[] | null
}
