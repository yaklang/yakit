import {ReactNode} from "react"
import {YakRunnerView} from "../YakRunnerType"

interface CursorPosition{
    line: number;              // 当前行号
    character: number;         // 当前字符位置
}

interface Selection {
    start: CursorPosition;     // 选择开始位置
    end: CursorPosition;       // 选择结束位置
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
    syntaxCheck?: any
    /** 终端 */
    terminal?: any
    /** 帮助信息（代码坐标获取时执行） */
    helpInfo?: any
}

export interface RunnerTabsProps {
    layout:number[]
}

export interface RunnerTabBarProps {
    onlyID: string
    tabsList: FileDetailInfo[]
    extra?: ReactNode
}

export interface RunnerTabBarItemProps {
    index: number
    info: FileDetailInfo
    layoutStr: string
}

export interface RunnerTabPaneProps {
    layout: number[]
}

export interface YakRunnerWelcomePageProps {}
