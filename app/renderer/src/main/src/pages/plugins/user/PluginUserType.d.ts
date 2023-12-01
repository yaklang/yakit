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
    /** 当前展示插件的索引 */
    currentIndex: number
    setCurrentIndex: (index: number) => void
    /**删除loading */
    setRemoveLoading: (b: boolean) => void
    /**刷新详情数据 */
    onRecalculationUserDetail: () => void
    /**设置初始total */
    setInitTotalUser: (index: number) => void
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
    /**设置初始total */
    setInitTotalRecycle: (index: number) => void
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
    /**详情中的删除 */
    // onDetailsBatchRemove: (newParams: UserBackInfoProps) => void
}
export interface PluginRecycleListRefProps {
    allCheck: boolean
    selectList: string[]
    onRemovePluginBatchBefore: () => void
    onReductionPluginBatchBefore: () => void
}
export interface PluginUserDetailProps {
    ref?: any
    info: YakitPluginOnlineDetail
    defaultAllCheck: boolean
    defaultSelectList: string[]
    response: YakitPluginListOnlineResponse
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
    /** 当前展示插件的索引 */
    currentIndex: number
    setCurrentIndex: (index: number) => void
    /**详情的下载 */
    onDetailsBatchDownload: (newParams: UserBackInfoProps) => void
    /** 详情的批量删除 */
    // onDetailsBatchRemove: (newParams: UserBackInfoProps) => void
    /**删除 loading */
    // removeLoading: boolean
    /**下载 loading */
    downloadLoading: boolean
}
export interface PluginUserDetailBackProps {
    search: PluginSearchParams
    filter: PluginFilterParams
    selectList: string[]
    allCheck: boolean
}

export interface UserBackInfoProps {
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

export interface PluginUserDetailRefProps {
    /**详情重新计算data数据 */
    onRecalculation: () => void
}
