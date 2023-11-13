import {QueryYakScriptsResponse} from "@/pages/invoker/schema"
import {LocalPluginAppAction} from "../pluginReducer"
import {API} from "@/services/swagger/resposeType"
import {PluginFilterParams, PluginSearchParams} from "../baseTemplateType"

export interface PluginsLocalProps {}

export interface LocalExtraOperateProps {
    /**是否是自己的插件 */
    isOwn: boolean
    /**删除插件 */
    onRemovePlugin: () => void
    /**导出插件 */
    onExportPlugin: () => void
    /**编辑 */
    onEditPlugin: () => void
    /**上传 */
    onUploadPlugin: () => void
}

export interface PluginsLocalDetailProps {
    info: YakScript
    defaultAllCheck: boolean
    loading: boolean
    // onCheck: (value: boolean) => void
    defaultSelectList: YakScript[]
    // optCheck: (data: YakScript, value: boolean) => void
    response: QueryYakScriptsResponse
    onBack: (q: PluginLocalBackProps) => void
    loadMoreData: () => void
    /** 初始过滤条件 */
    defaultFilter: PluginFilterParams
    /** 初始搜索内容 */
    defaultSearchValue: PluginSearchParams
    dispatch: React.Dispatch<LocalPluginAppAction>
    /**详情的下载 */
    onRemovePluginDetailSingleBefore: (info: YakitPluginOnlineDetail) => void
    /**详情的导出 */
    onDetailExport: (info: YakitPluginOnlineDetail) => void
    /** 搜索功能回调 */
    onDetailSearch: (searchs: PluginSearchParams, filters: PluginFilterParams) => void
    /** 详情的批量删除回调 */
    onDetailsBatchRemove: (q: PluginLocalDetailBackProps) => void
    /** 查询第一页的loading 也可以理解为page为1时需要的loading；也可以用于点击搜索后重新计算虚拟列表时候加载第二页 */
    spinLoading: boolean
    /**详情的批量上传 */
    onDetailsBatchUpload: (s: string[]) => void
}

export interface PluginLocalBackProps {
    /** 搜索内容条件 */
    search: PluginSearchParams
    /** 搜索过滤条件 */
    filter: PluginFilterParams
    /** 选中插件集合 */
    selectList: YakScript[]
    /** 是否全选 */
    allCheck: boolean
}
export interface PluginLocalDetailBackProps {
    /** 搜索内容条件 */
    search: PluginSearchParams
    /** 搜索过滤条件 */
    filter: PluginFilterParams
    /** 选中插件集合 */
    selectList: YakScript[]
    /** 是否全选 */
    allCheck: boolean
    /**勾选数量 */
    selectNum: number
}
export interface RemoveMenuModalContentProps {
    pluginName: string
    onCancel: () => void
}

export interface PluginExecutorProps {
    script: YakScript
}
