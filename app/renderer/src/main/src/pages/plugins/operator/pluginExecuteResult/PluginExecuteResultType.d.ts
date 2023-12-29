import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {HoldGRPCStreamInfo, HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {ReactNode} from "react"

export interface PluginExecuteResultProps {
    runtimeId: string
    streamInfo: HoldGRPCStreamInfo
    loading: boolean
    pluginType: string
}

export interface VulnerabilitiesRisksTableProps {
    riskState: StreamResult.Risk[]
}

export interface PluginExecuteLogProps {
    loading: boolean
    messageList: StreamResult.Log[]
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
export interface PluginExecutePortTableProps {}

export interface PluginExecuteCustomTableProps {
    tableInfo: HoldGRPCStreamProps.InfoTable
}

export interface PluginExecuteCodeProps {
    content: string
    pluginType: string
}
