import {API} from "@/services/swagger/resposeType"
import {Ref} from "react"
import {PluginSearchParams} from "../baseTemplateType"

export interface PluginsOnlineProps {}

export interface PluginsOnlineListProps {
    /**刷新数据 */
    refresh: boolean
    plugin: YakitPluginOnlineDetail | undefined
    searchValue: PluginSearchParams
    setSearchValue: (s: PluginSearchParams) => void
    setPlugin: (data: YakitPluginOnlineDetail | undefined) => voidc
    /**是否显示滚动条，显示滚动条的时候需要补全搜索框 */
    isShowRoll: boolean
}
export interface PluginsListRefProps {
    response: API.YakitPluginListResponse
    onBack: () => void
    loadMoreData: () => void
}
export interface PluginsOnlineHeardProps {
    value: PluginSearchParams
    onChange: (v: PluginSearchParams) => void
    onSearch: () => void
}
export interface YakitCombinationSearchCircleProps {
    value: PluginSearchParams
    onChange: (v: PluginSearchParams) => void
    onSearch: () => void
}

export interface YakitPluginOnlineDetail extends API.YakitPluginDetail {
    /**1.2k */
    starsCountString?: string
    /**1.2k */
    commentCountString?: string
    /**1.2K */
    downloadedTotalString?: string
}

export interface YakitPluginListOnlineResponse extends Omit<API.YakitPluginListResponse, "data"> {
    data: YakitPluginOnlineDetail[]
}

export interface PluginsOnlineDetailProps {
    info: YakitPluginOnlineDetail
    defaultAllCheck: boolean
    loading: boolean
    defaultSelectList: string[]
    response: YakitPluginListOnlineResponse
    onBack: (q: PluginOnlineDetailBackProps) => void
    loadMoreData: () => void
    defaultSearchValue: PluginSearchParams
    dispatch: React.Dispatch<OnlinePluginAppAction>
}

export interface PluginOnlineDetailBackProps {
    search: PluginSearchParams
    selectList: string[]
    allCheck: boolean
}