import {FileDetailInfo, Selection} from "./RunnerTabs/RunnerTabsType"
export interface TabFileProps {
    // 窗口唯一标识符
    id: string
    // 窗口中打开的文件列表
    files: FileDetailInfo[]
}

// 编辑器分块信息
export interface AreaInfoProps {
    elements: TabFileProps[]
}

// 打开文件信息
export interface OpenFileByPathProps {
    params: {
        path: string
        name: string
        parent?: string | null
        highLightRange?: Selection
        data?: YakURLResource
    }
    // 是否记录历史
    isHistory?: boolean
}

export interface YakJavaDecompilerHistoryProps {
    // 是否为文件
    isFile: boolean
    // 展示名称
    name: string
    // 路径
    path: string
}