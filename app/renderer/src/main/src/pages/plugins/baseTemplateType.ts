import {RollingLoadListProps} from "@/components/RollingLoadList/RollingLoadList"
import {FilterPanelGroupItem} from "@/components/businessUI/FilterPanel/FilterPanelType"
import {ReactNode} from "react"
import {PluginBaseParamProps, PluginParamDataProps, PluginSettingParamProps} from "./pluginsType"

export interface PluginsLayoutProps {
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
    selecteds: Record<string, string[]>
    /** 选中数据回调 */
    onSelect: (value: Record<string, string[] | string>) => any
    /** 数据展示列表 */
    groupList: FilterPanelGroupItem[]
    /** ClassName */
    filterClassName?: string
}

export interface PluginDetailsProps<T> {
    title: string | ReactNode
    /** 搜索栏额外操作元素 */
    filterNode?: ReactNode
    /** 搜索栏额外过滤条件 */
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
}

export interface PluginDetailHeaderProps {
    /** 插件名称 */
    pluginName: string
    /** 插件help信息 */
    help?: string
    /** title元素额外节点 */
    titleNode?: ReactNode
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
}

// 插件基础信息组件
export interface PluginModifyInfoProps {
    ref?: any
    /** 是否为编辑状态 */
    isEdit?: boolean
    /** 插件种类(漏洞|其他) */
    kind: string
    /** 插件基础信息 */
    data?: PluginBaseParamProps
    /** tags改变时的回调事件 */
    tagsCallback?: () => any
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

// 新增|编辑插件参数信息组件
export interface PluginAddParamModalProps {
    visible: boolean
    setVisible: (show: boolean) => any
    info?: PluginParamDataProps
    onOK: (data: PluginParamDataProps) => any
}
// 插件参数列表组件
export interface PluginParamListProps {
    list: PluginParamDataProps[]
    setList: (data: PluginParamDataProps[]) => any
    onEdit: (index: number) => any
}

export interface PluginEditorDiffProps {}

/** ---------- 插件列表相关 start ---------- */
/** 插件通用过滤条件 */
export interface PluginFilterParams {
    /** 插件类型 */
    type?: string[]
    /** 审核状态 */
    status?: string[]
    /** 标签 */
    tags?: string[]
    /** 插件组 */
    groups?: string[]
    /** 插件状态(公开/私密) */
    state?: string[]
}
/** 插件搜索条件 */
export interface PluginSearchParams {
    /** 关键词 */
    keyword: string
    /** 用户名 */
    userName: string
}
/** 插件列表页码条件 */
export interface PluginListPageMeta {
    page: number
    limit: number
}
/** ---------- 插件列表相关 end ---------- */

/**插件详情中列表的item */
export interface PluginDetailsListItemProps<T> {
    plugin: T
    selectUUId: string
    check: boolean
    headImg: string
    pluginUUId: string
    pluginName: string
    help?: string
    content: string
    official: boolean
    pluginType:string
    /** @name 是否内置 */
    isCorePlugin:boolean
    optCheck: (data: T, value: boolean) => any
    extra?:ReactNode
}
