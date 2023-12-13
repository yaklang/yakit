
import { HoldGRPCStreamInfo, StreamResult } from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {ReactNode} from "react"

export interface PluginExecuteResultProps {
    runtimeId: string
    streamInfo: HoldGRPCStreamInfo
    loading:boolean
}

export interface VulnerabilitiesRisksTableProps {}

export interface PluginExecuteLogProps {
    loading:boolean
    messageList:StreamResult.Log[]
}

export interface PluginExecuteResultTabContentProps {
    title?: ReactNode
    extra?: ReactNode
    children?: ReactNode
    className?:string
}

export interface PluginExecuteWebsiteTreeProps{
    runtimeId: string
}
export interface PluginExecutePortTableProps{
    
}