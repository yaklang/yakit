import {ReactNode} from "react"
import {CodeScoreSmokingEvaluateResponseProps} from "@/pages/plugins/funcTemplateType"
import {IMonacoEditorMarker} from "@/utils/editorMarkers"
export interface CursorPosition {
    lineNumber: number // 当前行号
    column: number // 当前字符位置
}

export interface Selection {
    startLineNumber: number // 开始-行号
    startColumn: number // 开始-字符位置
    endLineNumber: number // 结束-行号
    endColumn: number // 结束-字符位置
}

export interface FileDetailInfo {
    /** 文件名 */
    name: string
    /** 父级路径 */
    parent: string | null
    /** 路径 可做唯一标识符 */
    path: string
    /** 图标 */
    icon: string
    /** 代码 */
    code: string
    /** 文件语言 */
    language: string
    /** 打开文件的时间戳（用于打开编辑器列表排序） */
    openTimestamp: number
    /** 文件是否有未保存的更改 */
    isDirty?: boolean
    /** 文件是否是当前活动的文件 */
    isActive?: boolean
    /** 当前光标位置 */
    position?: CursorPosition
    /** 当前选择区域 */
    selections?: Selection
    /** 是否未保存（用于临时文件创建） */
    isUnSave?: boolean
    /** 语法检查（代码打开时执行） */
    syntaxCheck?: IMonacoEditorMarker[]
    /** 帮助信息（代码坐标获取时执行） */
    helpInfo?: any

    // 由于输出和终端直接显示所有的 因此不再绑定在单个文件上
    /** 输出（执行时注入） */
    // output?: any
    /** 终端 */
    // terminal?: any
}

// 将所有属性变为可选
export type OptionalFileDetailInfo = Partial<FileDetailInfo>

export interface RunnerTabsProps {
    tabsId: string
    wrapperClassName?: string
}

export interface RunnerTabBarProps {
    tabsId: string
    tabsList: FileDetailInfo[]
    extra?: ReactNode
    handleContextMenu: (info: FileDetailInfo) => void
    onRemoveCurrent: (info: FileDetailInfo) => void
}

export interface RunnerTabBarItemProps {
    index: number
    info: FileDetailInfo
    tabsId: string
    handleContextMenu: (info: FileDetailInfo) => void
    onRemoveCurrent: (info: FileDetailInfo) => void
}

export interface RunnerTabPaneProps {
    tabsId: string
}

export interface YakRunnerWelcomePageProps {
    addFileTab: () => void
}

export interface YakitRunnerSaveModalProps {
    info: FileDetailInfo
    isShowModal: boolean
    setShowModal: (v: boolean) => void
    onRemoveFun: (info: FileDetailInfo) => void
    waitSaveList: FileDetailInfo[]
    setWaitSaveList: (v: FileDetailInfo[]) => void
    setWaitRemoveOtherItem: (v: FileDetailInfo | undefined) => void
    setWaitRemoveAll: (v: boolean) => void
}

export type SplitDirectionProps = "top" | "bottom" | "left" | "right"
