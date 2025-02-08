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
    runtimeId: string
    allTotal: number
    setAllTotal: (n: number) => void
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
