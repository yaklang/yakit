import {InfoState} from "@/hook/useHoldingIPCRStream"
import { ExecResultLog } from "@/pages/invoker/batch/ExecMessageViewer"
import {ReactNode} from "react"

export interface PluginExecuteResultProps {
    runtimeId: string
    infoState: InfoState
    loading:boolean
}

export interface VulnerabilitiesRisksTableProps {}

export interface PluginExecuteLogProps {
    loading:boolean
    messageList:ExecResultLog[]
}

export interface PluginExecuteResultTabContentProps {
    title?: ReactNode
    extra?: ReactNode
    children?: ReactNode
}
