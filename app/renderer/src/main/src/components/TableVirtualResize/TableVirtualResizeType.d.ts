import {ReactNode} from "react"
import {SearchProps} from "antd/lib/input"
import {SelectProps} from "antd"

/**
 * @description:表格的props描述， 包裹虚拟表格的父元素需要设置高度
 * @ref: 返回的滚动条所在的div的元素
 * @title: 表格顶部的title,左边，类型：string | ReactNode
 * @extra: 表格顶部的title，右边，类型：ReactNode
 * @renderTitle: 自定义表格顶部的title,类型:ReactNode
 * @titleHeight: 自定义表格顶部的高度,使用renderTitle,需要传入对应的height,否则虚拟列表滚动会不正确，类型:ReactNode
 * @data:数组 ，类型：T[]
 * @renderKey:每行的key值，不可重复 ，类型：string
 * @columns:每列的参数 类型：ColumnsTypeProps[]
 * @rowSelection:多选/单选配置，目前只支持多选 类型：RowSelectionProps<T>
 * @enableDrag:true,表格列之间可以拖动，最后一列除外。columns中也可以单独设置某一列是否可以拖动  类型：boolean
 * @onRowClick:row鼠标左键点击事件，会返回当前选中row的数据  类型：(record: T) => void
 * @onRowContextMenu:row鼠标右键点击事件，会返回当前选中row的数据和e 类型：(record: T, e: React.MouseEvent) => void
 * @pagination:分页配置 类型：PaginationProps
 * @onChange:查询条件变化 类型：(page: number, limit: number, sorter: SortProps, filters: any, extra?: any) => void
 * @loading：是否加载中 类型：boolean
 * @scrollToBottom：距离底部多少px开始加载下一页,默认300 类型：number
 * @isReset：重置表格条件 滚动至0 类型：boolean
 * @isShowTotal：内置的total是否显示；true显示，false不显示 类型：boolean
 * @currentIndex：当前row的index 类型：number
 * @isRefresh：boolean 刷新表格 滚动至0
 * @disableSorting：boolean 禁用排序
 * @query：查询条件
 * @return {*}
 */
export interface TableVirtualResizeProps<T> {
    ref?: any
    getTableRef?: any // 组件自用
    title?: string | ReactNode
    renderTitle?: ReactNode
    titleHeight?: number
    extra?: ReactNode
    data: T[] //可以传cellClassName用来控制单元格样式，不要传height
    renderKey: string
    columns: ColumnsTypeProps[]
    rowSelection?: RowSelectionProps<T>
    enableDrag?: boolean
    onRowClick?: (record: T) => void
    onRowContextMenu?: (record: T, e: React.MouseEvent) => void
    pagination?: PaginationProps
    onChange?: (page: number, limit: number, sorter: SortProps, filters: any, extra?: any) => void // 查询条件变化
    loading?: boolean
    scrollToBottom?: number // 默认300
    isReset?: boolean //重置表格条件 滚动至0
    isShowTotal?: boolean
    currentIndex?: number //当前row的index
    isRefresh?: boolean //刷新表格 滚动至0
    disableSorting?: boolean //禁用排序
    query?: any
}

export interface SortProps {
    order: "none" | "asc" | "desc"
    orderBy: string
}

/**
 * @description: 表格列的props描述
 * @return {*}
 */
export interface ColumnsTypeProps {
    title: string
    dataKey: string
    className?: string
    width?: number
    minWidth?: number
    ellipsis?: boolean
    align?: "left" | "right" | "center" //默认 left
    fixed?: "left" | "right"
    left?: number // 外面不需要传，不接收，紧作为固定列使用
    right?: number // 外面不需要传，不接收，紧作为固定列使用
    render?: (text, record, index) => ReactNode
    // 搜索/筛选
    filterProps?: FilterProps
    sorterProps?: SorterProps
    enableDrag?: boolean
}

interface FilterSearchInputProps extends SearchProps {
    isShowIcon?: boolean
}

interface FilterSearchMultipleProps extends SelectProps {}

export interface SorterProps {
    sorterKey?: string
    sorter?: string | boolean // boolean是否开启排序，string自定义
    order?: string // none 无状态； asc 升序  desc 降序
}
export interface FilterProps {
    filterRender?: () => ReactNode
    filterOptionRender?: (d: any) => ReactNode
    filterKey?: string
    filtersType?: "select" | "input" | "dateTime"
    filtersSelectAll?: FiltersSelectAllProps //是否显示所有
    filters?: FiltersItemProps[] // 	表头的筛选菜单项c
    filterSearch?: boolean // 筛选菜单项是否可搜索
    filterSearchInputProps?: FilterSearchInputProps // input的props属性
    filterMultipleProps?: FilterSearchMultipleProps // input的props属性
    filterMultiple?: boolean // 是否多选 filtersType 为select才有效
    onFilter?: () => void // 本地模式下，确定筛选的运行函数
    filterIcon?: ReactNode // 自定义 filter 图标
    // isFilters?:boolean
}
export interface FiltersSelectAllProps {
    isAll: boolean
    textAll?: string
    valueAll?: strings
}

export interface RowSelectionProps<T> {
    isAll?: boolean
    type?: "checkbox" | "radio" //默认 checkbox
    hideSelectAll?: boolean
    selectedRowKeys?: string[]
    onChangeCheckboxSingle?: (c: boolean, selectedRowsKey: string, selectedRows: T) => void
    onSelectAll?: (selectedRows: string[], selected: T[], checked: boolean) => void
}

export interface PaginationProps {
    page: number
    limit: number
    total: number
    onChange: (page: number, limit: number) => void
}

export interface ShowFixedShadowProps {
    isShowLeftFixedShadow: boolean
    isShowRightFixedShadow: boolean
}

export interface ScrollProps {
    scrollLeft: number
    scrollRight: number
    scrollBottom: number
}

export interface FiltersItemProps {
    value: string
    label: string
    total?: string | number
}

export interface SelectSearchProps {
    loading?: boolean
    originalList: FiltersItemProps[]
    onSelect: (f: string | string[], record?: FiltersItemProps | FiltersItemProps[]) => void
    value: string | string[]
    filterProps?: FilterProps
    onClose: () => void
}

export interface FixedWidthProps {
    leftFixedWidth: number
    rightFixedWidth: number
}
