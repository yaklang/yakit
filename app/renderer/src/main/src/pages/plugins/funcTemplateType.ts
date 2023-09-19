import {ReactNode} from "react"
import {YakitButtonProp} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitMenuProp} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {DropDownProps} from "antd"

export interface TypeSelectOpt {
    /** 唯一标识符 */
    key: string
    /** 类型名称 */
    name: string
    /** 类型icon */
    icon: ReactNode
}
export interface TypeSelectProps {
    /** 已选中的类型数组 */
    active: string[]
    /** 所有类型的列表 */
    list: TypeSelectOpt[]
    /** 设置选中的类型 */
    setActive: (value: string[]) => any
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
    /** 默认值 */
    defaultValue?: string
    /** 搜索回调 */
    onSearch: (type: string, value: string) => any
}

export interface FuncFilterPopverProps {
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
    /** 搜索条件(已选tag) */
    tag: string[]
    /** 删除搜索条件(已选tag) */
    onDelTag: (value?: string) => any
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
}

export interface ListListProps<T> {
    /** 插件展示(列表|网格) */
    isList: boolean
    /** 插件列表数据 */
    data: T[]
    /** 列表布局-item组件 */
    render: (info: {index: number; data: T}) => ReactNode
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
}
export interface ListLayoutOptProps {
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
    /** 插件相关拓展节点 */
    subTitle?: (data: any) => ReactNode
    extraNode?: (data: any) => ReactNode
    /** 点击该展示项的回调 */
    onClick?: (data: any) => any
}

export interface GridListProps<T> {
    /** 插件展示(列表|网格) */
    isList: boolean
    /** 插件列表数据 */
    data: T[]
    /** 网格布局-item组件 */
    render: (info: {index: number; data: T}) => ReactNode
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
}
export interface GridLayoutOptProps {
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
    /** 插件相关拓展节点 */
    subTitle?: (data: any) => ReactNode
    extraFooter?: (data: any) => ReactNode
    /** 点击该展示项的回调 */
    onClick?: (data: any) => any
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
}
