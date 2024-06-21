import {QueryYakScriptRequest, QueryYakScriptsResponse, YakScript} from "@/pages/invoker/schema"
import {LocalPluginAppAction} from "../pluginReducer"
import {API} from "@/services/swagger/resposeType"
import {PluginFilterParams, PluginSearchParams} from "../baseTemplateType"
import {ReactNode} from "react"

export interface PluginsLocalProps {}

export interface LocalExtraOperateProps {
    data: YakScript
    /**是否是自己的插件 */
    isOwn: boolean
    /**删除插件 */
    onRemovePlugin: () => void
    /**导出插件 */
    onExportPlugin: () => void
    /**上传 */
    onUploadPlugin: () => void
}

export interface PluginsLocalDetailProps {
    pageWrapId?: string
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
    onDetailExport: (info: YakitPluginOnlineDetail, callback?: () => void) => void
    /** 搜索功能回调 */
    onDetailSearch: (searchs: PluginSearchParams, filters: PluginFilterParams) => void
    /** 详情的批量删除回调 */
    // onDetailsBatchRemove: (q: PluginLocalDetailBackProps) => void
    /** 查询第一页的loading 也可以理解为page为1时需要的loading；也可以用于点击搜索后重新计算虚拟列表时候加载第二页 */
    spinLoading: boolean
    /**详情的批量上传 */
    onDetailsBatchUpload: (s: string[]) => void
    /**详情的单个上传 */
    onDetailsBatchSingle: (y: YakScript) => void
    /** 当前展示插件的索引 */
    currentIndex: number
    setCurrentIndex: (index: number) => void
    /**删除的loading */
    removeLoading: boolean
    /**传线上的UUID,传入本地详情进行使用 */
    onJumpToLocalPluginDetailByUUID: (uuid) => void
    /**上传的loading */
    uploadLoading: boolean
    /**私有域地址 */
    privateDomain: string
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

export interface LocalPluginExecuteProps {
    plugin: YakScript
    headExtraNode: ReactNode
    /**插件UI联动相关参数*/
    linkPluginConfig?: HybridScanPluginConfig
    /** 隐藏插件 ID */
    isHiddenUUID?: boolean
    infoExtra?: ReactNode
    /** 隐藏更新按钮 */
    hiddenUpdateBtn?: boolean
}

export interface ExportYakScriptStreamRequest {
    OutputFilename: string
    Password: string
    Filter: QueryYakScriptRequest
}

export interface ExportYakScriptLocalResponse {
    OutputDir: string
    Progress: number
    Message: string
    MessageType: string
}

export interface PluginDetailsTabProps {
    /** 详情页最外层元素的id */
    pageWrapId?: string
    /**显示执行模块 */
    executorShow: boolean
    /**插件数据 */
    plugin: YakScript
    headExtraNode: ReactNode
    wrapperClassName?: string
    /**插件UI联动相关参数*/
    linkPluginConfig?: HybridScanPluginConfig

    /** 是否隐藏日志和问题 */
    hiddenLogIssue?: boolean
}
export interface PluginGroupList extends API.PluginsSearch {
    groupExtraOptBtn?: React.ReactElement
}
