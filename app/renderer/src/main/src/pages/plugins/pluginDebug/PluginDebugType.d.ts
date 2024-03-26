import {YakitDrawerProps} from "@/components/yakitUI/YakitDrawer/YakitDrawerType"
import {YakScript} from "@/pages/invoker/schema"
import {PluginDataProps} from "../pluginsType"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"

export interface PluginDebugProps {
    plugin?: PluginDataProps
    visible?: boolean
    getContainer?: HTMLElement
    onClose?: () => any
    onMerge?: (value: string) => any
}

/** @name 插件参数-额外参数-自定义请求键值对(get|post|header|cookie) */
export type PluginExtraKVParams = keyof HTTPRequestBuilderParams

export interface PluginDebugBodyProps {
    plugin?: PluginDataProps
    newCode: string
    setNewCode: (value: string) => any
}
