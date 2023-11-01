import {API} from "@/services/swagger/resposeType"
import {MenuProps} from "antd"
import {YakitPluginListOnlineResponse, YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {OnlinePluginAppAction} from "../pluginReducer"
import {PluginFilterParams} from "../baseTemplateType"

export interface PluginUserProps {}

export interface PluginUserListProps {
    ref?: any
    inViewport: boolean
    isLogin: boolean
    /**刷新数据 */
    refresh: boolean
    searchValue: PluginSearchParams
    filters: PluginFilterParams
    response: YakitPluginListOnlineResponse
    defaultAllCheck: boolean
    defaultSelectList: string[]
    dispatch: React.Dispatch<OnlinePluginAppAction>
    setSearchValue: (s: PluginSearchParams) => void
    setFilters: (s: PluginFilterParams) => void
    setIsSelectUserNum: (b: boolean) => void
    plugin?: YakitPluginOnlineDetail
    setPlugin: (p?: YakitPluginOnlineDetail) => void
    onRefreshRecycleList: () => void
    setDownloadLoading: (b: boolean) => void
}

export interface PluginRecycleListProps {
    ref?: any
    /**刷新数据 */
    refresh: boolean
    inViewport: boolean
    isLogin: boolean
    searchValue: PluginSearchParams
    setIsSelectRecycleNum: (b: boolean) => void
    setSearchValue: (s: PluginSearchParams) => void
    onRefreshUserList: () => void
}

export interface OnlineUserExtraOperateProps {
    plugin: YakitPluginOnlineDetail
    onSelect: (m: string, plugin: YakitPluginOnlineDetail) => void
    dispatch: React.Dispatch<OnlinePluginAppAction>
    userInfoRole: string
}
export interface PluginUserListRefProps {
    allCheck: boolean
    selectList: string[]
    loadMoreData: () => void
    onRemovePluginBatchBefore: () => void
    onDownloadBatch: () => void
    onRemovePluginDetailSingleBefore: (info: YakitPluginOnlineDetail) => void
    /** 搜索功能回调 */
    onDetailSearch: (searchs: PluginSearchParams, filters: PluginFilterParams) => void
}
export interface PluginRecycleListRefProps {
    allCheck: boolean
    selectList: string[]
    onRemovePluginBatchBefore: () => void
    onReductionPluginBatchBefore: () => void
}
export interface PluginUserDetailProps {
    info: YakitPluginOnlineDetail
    defaultAllCheck: boolean
    defaultSelectList: string[]
    response: API.YakitPluginListResponse
    onBack: (q: PluginUserDetailBackProps) => void
    loadMoreData: () => void
    /** 初始搜索内容 */
    defaultSearchValue: PluginSearchParams
    /** 初始过滤条件 */
    defaultFilter: PluginFilterParams
    dispatch: React.Dispatch<OnlinePluginAppAction>
    /**详情中单个删除 */
    onRemovePluginDetailSingleBefore: (info: YakitPluginOnlineDetail) => void
    /** 搜索功能回调 */
    onDetailSearch: (searchs: PluginSearchParams, filters: PluginFilterParams) => void
}
export interface PluginUserDetailBackProps {
    search: PluginSearchParams
    filter: PluginFilterParams
    selectList: string[]
    allCheck: boolean
}
