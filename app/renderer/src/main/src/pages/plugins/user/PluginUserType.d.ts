import {API} from "@/services/swagger/resposeType"
import {MenuProps} from "antd"
import {YakitPluginListOnlineResponse, YakitPluginOnlineDetail} from "../online/PluginsOnlineType"
import {OnlinePluginAppAction} from "../pluginReducer"
import { PluginFilterParams } from "../baseTemplateType"

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
}

export interface PluginRecycleListProps {
    /**刷新数据 */
    refresh: boolean
    inViewport: boolean
    isLogin: boolean
    searchValue: PluginSearchParams
    setIsSelectRecycleNum: (b: boolean) => void
    setSearchValue: (s: PluginSearchParams) => void
}
/**
 * @property onRemove 删除
 * @property onReduction 还原
 */
export interface OnlineRecycleExtraOperateProps {
    onRemove: () => void
    onReduction: () => void
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
