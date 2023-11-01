import {API} from "@/services/swagger/resposeType"
import {Ref} from "react"
import {PluginFilterParams, PluginSearchParams} from "../baseTemplateType"
import {YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"

export interface PluginsOnlineProps {}

export interface PluginsOnlineListProps {
    /**刷新数据 */
    refresh: boolean
    inViewport: boolean
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

export interface YakitPluginOnlineDetail extends API.PluginsDetail {
    /**1.2k */
    starsCountString?: string
    /**1.2k */
    commentCountString?: string
    /**1.2K */
    downloadedTotalString?: string
}

export interface YakitPluginListOnlineResponse extends Omit<API.PluginsListResponse, "data"> {
    data: YakitPluginOnlineDetail[]
}

export interface PluginsOnlineDetailProps {
    info: YakitPluginOnlineDetail
    defaultAllCheck: boolean
    loading: boolean
    /** 初始选中插件集合 */
    defaultSelectList: string[]
    response: YakitPluginListOnlineResponse
    onBack: (q: PluginOnlineDetailBackProps) => void
    loadMoreData: () => void
    /** 初始搜索内容 */
    defaultSearchValue: PluginSearchParams
    /** 初始过滤条件 */
    defaultFilter: PluginFilterParams
    dispatch: React.Dispatch<OnlinePluginAppAction>
    /**详情的下载 */
    onBatchDownload: (newParams: OnlineBackInfoProps) => void
    /**下载loading */
    downloadLoading: boolean
    /** 搜索功能回调 */
    onDetailSearch: (searchs: PluginSearchParams, filters: PluginFilterParams) => void
    /** 查询第一页的loading */
    spinLoading: boolean
}

export interface OnlineBackInfoProps {
    /** 是否全选 */
    allCheck: boolean
    /** 选中插件集合 */
    selectList: string[]
    /** 搜索内容条件 */
    search: PluginSearchParams
    /** 搜索过滤条件 */
    filter: PluginFilterParams
    /**勾选数量 */
    selectNum: number
}
export interface PluginOnlineDetailBackProps {
    search: PluginSearchParams
    filter: PluginFilterParams
    selectList: string[]
    allCheck: boolean
}

export interface NavigationBars {}

export interface OtherSearchProps {
    timeType: YakitMenuItemProps
    heatType: YakitMenuItemProps
}

export interface DownloadArgumentProps {
    /** 是否全选 */
    allCheckArgument: boolean
    /** 选中插件集合 */
    selectListArgument: string[]
    /** 搜索内容条件 */
    searchArgument: PluginSearchParams
    /** 搜索过滤条件 */
    filtersArgument: PluginFilterParams
    /**选中的个数 */
    selectNumArgument: number
}
