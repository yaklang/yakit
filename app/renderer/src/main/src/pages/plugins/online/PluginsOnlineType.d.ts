import {API} from "@/services/swagger/resposeType"
import {Ref} from "react"

export interface PluginsOnlineProps {}

export interface PluginsOnlineListProps {
    plugin: API.YakitPluginDetail | undefined
    setPlugin: (data: API.YakitPluginDetail | undefined) => void
    /**是否显示滚动条，显示滚动条的时候需要补全搜索框 */
    isShowRoll: boolean
}
export interface PluginsListRefProps {
    response: API.YakitPluginListResponse
    onBack: () => void
    loadMoreData: () => void
}
export interface PluginsOnlineHeardProps {}
export interface YakitCombinationSearchCircleProps {}