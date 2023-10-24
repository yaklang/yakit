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
    setPlugin: (p?: YakitPluginOnlineDetail) => void
    onRefreshRecycleList: () => void
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
    onSelect: (m: string) => void
}
export interface PluginUserListRefProps {
    allCheck: boolean
    selectList: string[]
    loadMoreData: () => void
    onRemovePluginBatchBefore: () => void
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
    defaultSearchValue: PluginSearchParams
    dispatch: React.Dispatch<OnlinePluginAppAction>
}
export interface PluginUserDetailBackProps {
    search: PluginSearchParams
    selectList: string[]
    allCheck: boolean
}
