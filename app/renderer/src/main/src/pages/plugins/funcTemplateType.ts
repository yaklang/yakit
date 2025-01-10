import {ReactNode} from "react"
import {YakitButtonProp} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitMenuProp} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {DropDownProps} from "antd"
import {PluginFilterParams, PluginSearchParams} from "./baseTemplateType"
import {YakitPluginOnlineDetail} from "./online/PluginsOnlineType"
import {OnlinePluginAppAction} from "./pluginReducer"
import {API} from "@/services/swagger/resposeType"
import {YakitCombinationSearchProps} from "@/components/YakitCombinationSearch/YakitCombinationSearchType"

export interface TypeSelectOpt {
    /** 唯一标识符 */
    key: string
    /** 类型名称 */
    name: string
    /** 类型icon */
    icon?: ReactNode
}
export interface TypeSelectProps {
    /** 已选中的类型数组 */
    active: TypeSelectOpt[]
    /** 所有类型的列表 */
    list: TypeSelectOpt[]
    /** 设置选中的类型 */
    setActive: (value: TypeSelectOpt[]) => any
}

export interface FuncBtnProps extends YakitButtonProp {
    /** 按钮展示名称 */
    name: string
    /** 切换纯图标按钮的宽度界限 */
    maxWidth?: number
}

export interface FuncSearchProps {
    /** 切换纯图标按钮的宽度界限 */
    maxWidth?: number
    /** 值 */
    value?: PluginSearchParams
    /** */
    onChange: (v: PluginSearchParams) => void
    /** 搜索回调 */
    onSearch: (value: PluginSearchParams) => any

    yakitCombinationSearchProps?: YakitCombinationSearchProps
    /**下拉包含的类型 */
    includeSearchType?: PluginSearchParams['type'][]
}

export interface FuncFilterPopoverProps {
    /** 切换纯图标按钮的宽度界限 */
    maxWidth?: number
    /** 展示icon */
    icon: ReactNode
    /** 展示名称 */
    name?: string
    /** 下拉菜单组件属性 */
    menu: YakitMenuProp
    /** 弹框放置位置 */
    placement?: DropDownProps["placement"]
    /**菜单是否禁用 */
    disabled?: boolean
    /**button属性 */
    button?: YakitButtonProp
}

export interface PluginsListProps {
    /** 全选框状态 */
    checked: boolean
    /** 设置全选框 */
    onCheck: (value: boolean) => any
    /** 插件展示(列表|网格) */
    isList: boolean
    /** 设置插件展示(列表|网格) */
    setIsList: (value: boolean) => any
    /** 插件总数 */
    total: number
    /** 已勾选插件数量 */
    selected: number
    /** 搜索条件(左侧已选item) */
    filters: PluginFilterParams
    /** 删除搜索条件(已选tag) */
    setFilters: (filters: PluginFilterParams) => void

    /** 表头拓展元素 */
    extraHeader?: ReactNode
    children: ReactNode

    /** 是否可见 */
    visible: boolean
    /** 设置是否可见 */
    setVisible: (show: boolean) => any
}

export interface ListShowContainerProps<T> {
    /** 插件展示(列表|网格) */
    isList: boolean
    /** 插件列表数据 */
    data: T[]
    /** 布局-item组件-key的字段名 */
    keyName?: string
    /** 网格布局-item组件 */
    gridNode: (info: {index: number; data: T}) => ReactNode
    /** 网格布局-行高 */
    gridHeight: number
    /** 列表布局-item组件 */
    listNode: (info: {index: number; data: T}) => ReactNode
    /** 列表布局-行高 */
    listHeight: number
    /** 列表是否在加载状态 */
    loading: boolean
    /** 是否还有数据可以加载 */
    hasMore: boolean
    /** 更新列表数据 */
    updateList: (reset?: boolean) => any
    /**列表/宫格id */
    id?: string
    /**列表className */
    listClassName?: string
    /**宫格className */
    gridClassName?: string
    /** 当前展示的插件index */
    showIndex?: number
    /** 修改当前展示的插件index */
    setShowIndex?: (i: number) => any
    /**是否显示搜索结果为空 */
    isShowSearchResultEmpty?: boolean
}

export interface ListListProps<T> {
    /** 插件展示(列表|网格) */
    isList: boolean
    /** 插件列表数据 */
    data: T[]
    /** 列表布局-item组件 */
    render: (info: {index: number; data: T}) => ReactNode
    /** 列表布局-item组件-key的字段名 */
    keyName: string
    /** 列表布局-行高 */
    optHeight: number
    /** 列表是否在加载状态 */
    loading: boolean
    /** 是否还有数据可以加载 */
    hasMore: boolean
    /** 更新列表数据 */
    updateList: (reset?: boolean) => any
    /**列表id */
    id?: string
    /**列表className */
    listClassName?: string
    /** 当前展示的插件index */
    showIndex?: number
    /** 修改当前展示的插件index */
    setShowIndex?: (i: number) => any
}
export interface ListLayoutOptProps {
    /** 插件在列表中的索引 */
    order: number
    /** 插件详细信息 */
    data: any
    /** 是否选中 */
    checked: boolean
    /** 勾选的回调 */
    onCheck: (data: any, value: boolean) => any
    /** 插件作者头像 */
    img: string
    /** 插件名 */
    title: string
    /** 插件解释信息 */
    help: string
    /** 插件更新时间 */
    time: number
    /** 插件类型 */
    type: string
    /** 是否为内置插件 */
    isCorePlugin: boolean
    /** 是否为官方插件 */
    official: boolean
    /** 插件相关拓展节点 */
    subTitle?: (data: any) => ReactNode
    extraNode?: (data: any) => ReactNode
    /** 点击该展示项的回调 */
    onClick?: (data: any, index: number, value: boolean) => any
}

export interface GridListProps<T> {
    /** 插件展示(列表|网格) */
    isList: boolean
    /** 插件列表数据 */
    data: T[]
    /** 网格布局-item组件 */
    render: (info: {index: number; data: T}) => ReactNode
    /** 网格布局-item组件-key的字段名 */
    keyName: string
    /** 网格布局-行高 */
    optHeight: number
    /** 列表是否在加载状态 */
    loading: boolean
    /** 是否还有数据可以加载 */
    hasMore: boolean
    /** 更新列表数据 */
    updateList: (reset?: boolean) => any
    /**宫格id */
    id?: string
    /**宫格className */
    gridClassName?: string
    /** 当前展示的插件index */
    showIndex?: number
    /** 修改当前展示的插件index */
    setShowIndex?: (i: number) => any
}
export interface GridLayoutOptProps {
    /** 插件在列表中的索引 */
    order: number
    /** 插件详细信息 */
    data: any
    /** 是否选中 */
    checked: boolean
    /** 勾选的回调 */
    onCheck: (data: any, value: boolean) => any
    /** 插件名 */
    title: string
    /** 插件类型 */
    type: string
    /** 插件标签 */
    tags: string
    /** 插件解释信息 */
    help: string
    /** 插件作者头像 */
    img: string
    /** 插件作者 */
    user: string
    /** 贡献者头像 */
    prImgs?: string[]
    /** 插件更新时间 */
    time: number
    /** 是否为内置插件 */
    isCorePlugin: boolean
    /** 是否为官方插件 */
    official: boolean
    /** 插件相关拓展节点 */
    subTitle?: (data: any) => ReactNode
    extraFooter?: (data: any) => ReactNode
    /** 点击该展示项的回调 */
    onClick?: (data: any, index: number, value: boolean) => any
}

export interface TagsListShowProps {
    tags: string[]
}

type AuthorImgType = "official" | "yakit" | "mitm" | "port" | "sparkles" | "documentSearch" | "collection"
export interface AuthorImgProps {
    /** 图片展示直径尺寸 */
    size?: "middle" | "small" | "large"
    /** 图片src */
    src?: string
    /** 右下角icon,传AuthorImgType类型为内置的icon */
    builtInIcon?: AuthorImgType
    /** 右下角icon 自己传组件 */
    icon?: ReactNode
    /** wrapper 样式类 */
    wrapperClassName?: string
    /** 右下角icon ClassName */
    iconClassName?: string
}

export interface TagShowOpt {
    /** 组的标识符 */
    tagType: string
    /** 名称 */
    label: string
    /** 值 */
    value: string
}

/**
 * @property {YakitPluginOnlineDetail} data
 * @property {boolean} isLogin
 * @property {boolean} pluginRemoveCheck 插件删除是否提示的记录字段
 * @function onRemoveClick 删除回调
 * @function onReductionClick 删除回调
 * @function onRemoveOrReductionBefore
 */
export interface OnlineRecycleExtraOperateProps {
    isLogin: boolean
    pluginRemoveCheck: boolean
    data: YakitPluginOnlineDetail
    onRemoveClick: (data: YakitPluginOnlineDetail) => void
    onReductionClick: (data: YakitPluginOnlineDetail) => void
    onRemoveOrReductionBefore: (data: YakitPluginOnlineDetail, type: "remove" | "reduction") => void
}

/** 详情页-筛选条件的 */
export interface FilterPopoverBtnProps {
    /** 初始选中的筛选条件 */
    defaultFilter: PluginFilterParams
    /** 搜索回调 */
    onFilter: (value: PluginFilterParams) => any
    /** 触发筛选列表的刷新 */
    refresh?: boolean
    /** 筛选组件的类型-商店|审核|我的 */
    type?: "check" | "online" | "user" | "local"
    /**固定的过滤条件，有的话就不去请求接口获取,传了该参数后type无效 */
    fixFilterList?: API.PluginsSearch[]
}

/** 源码评分基础属性 */
interface CodeScoreBaseProps {
    /** 插件类型 */
    type: string
    /** 插件源码 */
    code: string
    /** 执行完后的成功结果回调延时(默认:1000) */
    successWait?: number
    /** 评分合格的提示语(默认: "（表现良好，开始上传插件中...）") */
    successHint?: string
    /** 评分合格的提示语(默认: "（上传失败，请修复后再上传）") */
    failedHint?: string
    /** 特殊失败情况的提示语(该情况虽然为失败，但是可以通过评测上传，默认： (无法判断，是否需要转人工审核) ) */
    specialHint?: string
    /** 特殊失败情况时显示转人工按钮，按钮文案(默认： <转人工审核>) */
    specialBtnText?: string
    /** 特殊失败情况时，转人工按钮旁的拓展功能按钮区域 在转人工按钮左边*/
    specialExtraBtn?: ReactNode
    /** 隐藏特殊失败情况时的操作元素 */
    hiddenSpecialBtn?: boolean
}

/** 插件源码评分模块 */
export interface CodeScoreModuleProps extends CodeScoreBaseProps {
    /** 是否开始评分 */
    isStart: boolean
    /** 执行完后的回调(合格给ture，不合格给false) */
    callback: (value: boolean) => any
    /** 是否隐藏评分的提示信息 */
    hiddenScoreHint?: boolean
}

/** 插件源码评分弹窗 */
export interface CodeScoreModalProps extends CodeScoreBaseProps {
    visible: boolean
    /** 关闭弹窗(true:合格|false:不合格) */
    onCancel: (value: boolean) => any
}

/** 插件源码评分返回信息 */
export interface CodeScoreSmokingEvaluateResponseProps {
    Score: number
    Results: CodeScoreSmokingEvaluateResultProps[]
}
/** 插件源码评分返回Results详细信息 */
export interface CodeScoreSmokingEvaluateResultProps {
    /**前端循环key使用 */
    IdKey: string
    Item: string
    Suggestion: string
    ExtraInfo: Uint8Array
    Range: GRPCRange
    Severity: string
}
/** 源码位置信息 */
export interface GRPCRange {
    Code: string
    StartLine: number
    StartColumn: number
    EndLine: number
    EndColumn: number
}

/** 类型标签 */
export interface PluginTypeTagProps {
    checked: boolean
    setCheck: () => any
    disabled: boolean
    icon: ReactNode
    name: string
    description: string
}

/** 源码放大版编辑器 */
export interface PluginEditorModalProps {
    /** 源码语言 */
    language?: string
    visible: boolean
    setVisible: (content: string) => any
    code: string
}

/** 对比器放大版编辑器 */
export interface PluginDiffEditorModalProps {
    /** 源码语言 */
    language?: string
    /** 原代码 */
    oldCode: string
    /** 对比代码 */
    newCode: string
    visible: boolean
    setVisible: (content: string) => any
}
