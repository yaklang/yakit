import {ReactNode} from "react"
import {YakRunnerView} from "../YakRunnerType"
import { CodeScoreSmokingEvaluateResponseProps } from "@/pages/plugins/funcTemplateType"
import { IMonacoEditorMarker } from "@/utils/editorMarkers"
export interface CursorPosition{
    lineNumber: number;         // 当前行号
    column: number;             // 当前字符位置
}

export interface Selection {
    startLineNumber: number;     // 开始-行号
    startColumn: number;        // 开始-字符位置
    endLineNumber: number;      // 结束-行号
    endColumn: number;          // 结束-字符位置
}

export interface FileDetailInfo {
    /** 文件名 */
    name: string
    /** 路径 可做唯一标识符 */
    path: string
    /** 图标 */
    icon: string
    /** 代码 */
    code: string
    /** 文件语言 */
    language: string
    /** 文件是否有未保存的更改 */
    isDirty?: boolean
    /** 文件是否是当前活动的文件 */
    isActive?: boolean
    /** 当前光标位置 */
    position?: CursorPosition
    /** 当前选择区域 */
    selections?:Selection
    
    /** 输出（执行时注入） */
    output?: any
    /** 语法检查（代码打开时执行） */
    syntaxCheck?: IMonacoEditorMarker[]
    /** 终端 */
    terminal?: any
    /** 帮助信息（代码坐标获取时执行） */
    helpInfo?: any
}

export interface RunnerTabsProps {
    tabsId: string
}

export interface RunnerTabBarProps {
    tabsId: string
    tabsList: FileDetailInfo[]
    extra?: ReactNode
}

export interface RunnerTabBarItemProps {
    index: number
    info: FileDetailInfo
    tabsId: string
}

export interface RunnerTabPaneProps {
    tabsId: string
}

export interface YakRunnerWelcomePageProps {}
