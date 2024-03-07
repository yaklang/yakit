import {ReactNode} from "react"
import {PluginDetailsProps, PluginFilterParams, PluginSearchParams} from "../../baseTemplateType"
import {YakScript} from "@/pages/invoker/schema"

export interface PluginLocalListDetailsProps {
    /**刷新插件列表 */
    refreshList?: boolean
    children?: ReactNode
    pluginDetailsProps?: PluginDetailsProps
    hidden: boolean
    selectList?: YakScript[]
    setSelectList?: (s: YakScript[]) => void
    search?: PluginSearchParams
    setSearch?: (s: PluginSearchParams) => void
    filters?: PluginFilterParams
    setFilters?: (s: PluginFilterParams) => void
}
