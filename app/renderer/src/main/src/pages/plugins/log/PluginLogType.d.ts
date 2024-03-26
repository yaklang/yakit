import {API} from "@/services/swagger/resposeType"
import {ReactNode} from "react"

export interface PluginLogProps {
    uuid: string
    wrapperClassName?: string
    wrapperStyle?: React.CSSProperties
    getContainer?: string
}

export interface PluginLogOptProps extends PluginLogProps {
    info: API.PluginsLogsDetail
    onMerge: (info: API.PluginsLogsDetail) => any
}

export interface PluginLogDiffCodeProps extends PluginLogProps {
    logId: number
    visible: boolean
    setVisible: (visible: boolean) => any
}
