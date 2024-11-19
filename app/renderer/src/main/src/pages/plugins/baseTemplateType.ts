import {RollingLoadListProps} from "@/components/RollingLoadList/RollingLoadList"
import {FilterPanelGroupItem} from "@/components/businessUI/FilterPanel/FilterPanelType"
import {ReactNode} from "react"
import {PluginBaseParamProps, PluginSettingParamProps} from "./pluginsType"
import {API} from "@/services/swagger/resposeType"

export interface PluginsLayoutProps {
    /** 页面id */
    pageWrapId?: string
    /** 页面标题 */
    title?: ReactNode | string
    /** 页面副标题，在标题右边 */
    subTitle?: ReactNode
    /** 头部拓展区域 */
    extraHeader?: ReactNode
    /** 展示/隐藏 */
    hidden?: boolean
    children: ReactNode
}

export interface PluginsContainerProps {
    children: ReactNode
    /** 加载状态 */
    loading?: boolean
    /** 是否可见 */
    visible: boolean
    /** 设置是否可见 */
    setVisible: (show: boolean) => any
    /** 选中数据 */
    selecteds: Record<string, API.PluginsSearchData[]>
    /** 选中数据回调 */
    onSelect: (value: Record<string, API.PluginsSearchData[]>) => any
    /** 数据展示列表 */
    groupList: FilterPanelGroupItem[]
    /** ClassName */
    filterClassName?: string
    loadingTip?: string
}

export interface PluginDetailsProps<T> {
    /** 组件的id */
    pageWrapId?: string
    title: string | ReactNode
    /**搜索内容 */
    search: PluginSearchParams
    /** 设置搜索内容 */
    setSearch: (s: PluginSearchParams) => void
    /** 搜索内容功能回调(自带防抖功能) */
    onSearch: (value: PluginSearchParams) => any
    /** 搜索栏额外操作元素 */
    filterNode?: ReactNode
    /** 搜索条件下边操作元素 */
    filterBodyBottomNode?: ReactNode
    /** 搜索栏额外过滤组件 */
    filterExtra?: ReactNode
    /** 全选框状态 */
    checked: boolean
    /** 设置全选框 */
    onCheck: (value: boolean) => any
    /** 插件总数 */
    total: number
    /** 已勾选插件数量 */
    selected: number
    /** 搜索列表属性 */
    listProps: RollingLoadListProps<T>
    /** 返回事件 */
    onBack: () => any
    children: ReactNode
    /** 查询第一页的loading */
    spinLoading?: boolean
    /**右边头部组件 */
    rightHeardNode?: ReactNode
    /**隐藏右边的部分 */
    hidden?: boolean
    setHidden?: (value: boolean) => void
    /**内容的class */
    bodyClassName?: string
}

export interface PluginDetailHeaderProps {
    /** 插件名称 */
    pluginName: string
    /** 插件help信息 */
    help?: string
    /** title元素额外节点 */
    titleNode?: ReactNode
    /** tag(type+标签内容)最小宽度 */
    tagMinWidth?: number
    /** 插件标签组 */
    tags?: string
    /** 右侧拓展元素 */
    extraNode?: ReactNode
    /** 作者头像 */
    img: string
    /** 作者名称 */
    user: string
    /** 插件ID(线上和本地都用此字段) */
    pluginId: string
    /** 更新时间 */
    updated_at: number
    /**协作者信息 */
    prImgs?: CollaboratorInfoProps[]
    /**插件类型 */
    type: string
    /** 复制源插件 */
    basePluginName?: string
    /** wrapper classname */
    wrapperClassName?: string
    /** 隐藏插件 ID */
    isHiddenUUID?: boolean
    infoExtra?: ReactNode
}
/**协作者信息 */
export interface CollaboratorInfoProps {
    headImg: string
    userName: string
}

// 插件基础信息组件
export interface PluginModifyInfoProps {
    ref?: any
    /** 是否为编辑状态 */
    isEdit?: boolean
    /** 插件基础信息 */
    data?: PluginBaseParamProps
    /** tags改变时的回调事件 */
    tagsCallback?: (v: string[]) => any
}
// 插件基础信息ref可用方法
export interface PluginInfoRefProps {
    onGetValue: () => PluginBaseParamProps
    onSubmit: () => Promise<PluginBaseParamProps | undefined>
}

// 插件配置信息组件
export interface PluginModifySettingProps {
    ref?: any
    /** 不同类型控制不同展示字段(例如: yak类型下有插件联动开关) */
    type: string
    /** DNSLog 和 HTTP数据包变形 的实质是增减tag */
    tags: string[]
    setTags: (arr: string[]) => any
    data?: PluginSettingParamProps
}
// 插件配置信息ref可用方法
export interface PluginSettingRefProps {
    onGetValue: () => PluginSettingParamProps
    onSubmit: () => Promise<PluginSettingParamProps | undefined>
}

export interface PluginEditorDiffProps {
    isDiff: boolean
    newCode: string
    oldCode?: string
    setCode: (value: string) => any
    language: string
    triggerUpdate?: boolean
}

/** ---------- 插件列表相关 start ---------- */
/** 插件通用过滤条件 */
export interface PluginFilterParams {
    /** 插件类型 */
    plugin_type?: API.PluginsSearchData[]
    /** 审核状态 */
    status?: API.PluginsSearchData[]
    /** 标签 */
    tags?: API.PluginsSearchData[]
    /** 插件组 */
    plugin_group?: API.PluginsSearchData[]
    /** 插件状态(公开 0 /私密 1) */
    plugin_private?: API.PluginsSearchData[]
}
/** 插件搜索条件 */
export interface PluginSearchParams {
    /** 全文搜索 */
    keyword: string
    /** 按作者 */
    userName: string
    /** 关键字 */
    fieldKeywords?: string
    /** 搜索类型 */
    type: "keyword" | "userName" | "fieldKeywords"
    /**时间类型搜索 默认 为所有时间, 当天 day, 本周 week, 本月 month, 年 year */
    time_search?: "day" | "week" | "month" | "year"
}
/** 插件列表页码条件 */
export interface PluginListPageMeta {
    page: number
    limit: number
    order?: "asc" | "desc"
    order_by?: string
}
/** ---------- 插件列表相关 end ---------- */

/**插件详情中列表的item */
export interface PluginDetailsListItemProps<T> {
    /** 插件在列表里的索引 */
    order: number
    plugin: T
    selectUUId: string
    check: boolean
    headImg: string
    pluginUUId: string
    pluginName: string
    help?: string
    content: string
    official: boolean
    pluginType: string
    /** @name 是否内置 */
    isCorePlugin: boolean
    optCheck: (data: T, value: boolean) => any
    extra?: (data: T) => ReactNode
    onPluginClick: (plugin: T, index: number) => void
    /**是否可以勾选 */
    enableCheck?: boolean
    /**是否可以点击 */
    enableClick?: boolean
}

export interface PluginContributesListItemProps {
    /**协作者头像 */
    contributesHeadImg: string
    /**协作者名字 */
    contributesName: string
}
