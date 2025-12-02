import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {HoldGRPCStreamInfo, HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {ReactNode} from "react"

export interface PluginExecuteResultProps {
    runtimeId: string
    streamInfo: HoldGRPCStreamInfo
    loading: boolean
    defaultActiveKey?: string
    pluginExecuteResultWrapper?: string
    PluginTabsRightNode?: React.ReactNode
}

export interface VulnerabilitiesRisksTableProps {
    runtimeId?: string
    runTimeIDs?: string[]
    allTotal?: number
    setAllTotal?: (n: number) => void
}

export interface AuditHoleTableOnTabProps {
    runtimeId: string
}

export interface PluginExecuteLogProps {
    loading: boolean
    messageList: StreamResult.Log[]
    wrapperClassName?: string
}

export interface PluginExecuteResultTabContentProps {
    title?: ReactNode
    extra?: ReactNode
    children?: ReactNode
    className?: string
}

export interface PluginExecuteWebsiteTreeProps {
    runtimeId: string
    website?: boolean
}
export interface PluginExecutePortTableProps {
    runtimeId: string
}

export interface PluginExecuteCustomTableProps {
    tableInfo: HoldGRPCStreamProps.InfoTable
}

export interface PluginExecuteCodeProps {
    content: string
}

export enum FileActionEnum {
    Read_Action = "READ", // 读取
    Write_Action = "WRITE", // 写入
    Create_Action = "CREATE", // 创建
    Delete_Action = "DELETE", // 删除
    Status_Action = "STATUS", // 查看元信息
    Chmod_Action = "CHMOD", // 修改权限
    Find_Action = "FIND" // 查找
}
export declare namespace PluginExecuteLogFile {
    export type FileActionMessage =
        | ReadFileActionMessage
        | WriteFileActionMessage
        | CreateFileActionMessage
        | DELETEFileActionMessage
        | STATUSFileActionMessage
        | CHMODFileActionMessage
        | FINDFileActionMessage

    export interface FileItem {
        action: FileActionType
        action_message: FileActionMessage

        dir: string
        is_dir: boolean
        path: string
        title: string
    }

    export type FileActionType = `${FileActionEnum}`
    export interface ReadFileActionMessage {
        content: string
        length: number
        message: string
        offset: number
        unit: string
    }
    export interface WriteFileActionMessage {
        content: string
        length: number
        message: string
        mode: string
    }
    export interface CreateFileActionMessage {
        chmodMode: string
        isDir: boolean
        message: string
    }
    export interface DELETEFileActionMessage {
        message: string
        isDir: boolean
    }
    export interface STATUSFileActionMessage {
        message: string
        status: {
            FileAttributes: number
            CreationTime: {
                LowDateTime: number
                HighDateTime: number
            }
            LastAccessTime: {
                LowDateTime: number
                HighDateTime: number
            }
            LastWriteTime: {
                LowDateTime: number
                HighDateTime: number
            }
            FileSizeHigh: number
            FileSizeLow: number
            ReparseTag: number
        }
    }

    export interface CHMODFileActionMessage {
        message: string
        chmodMode: string
    }
    export interface FINDFileActionMessage {
        condition: string
        content: string[]
        message: string
        mode: string
    }
}
