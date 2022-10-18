import {ReactNode} from "react"
import {SearchProps} from "antd/lib/input"
import {SelectProps} from "antd"

// 包裹虚拟表格的父元素需要设置高度
export interface TableVirtualResizeProps<T> {
    ref?: any
    title?: string | ReactNode
    renderTitle?: ReactNode
    titleHeight?: number
    extra?: ReactNode
    data: T[] //可以传cellClassName用来控制单元格样式，不要传height
    renderKey: string
    renderRow?: (data: T, i: number) => ReactNode
    currentRowData?: T
    columns: ColumnsTypeProps[]
    rowSelection?: RowSelectionProps<T>
    colWidth?: number
    enableDrag?: boolean
    onRowClick?: (record: T) => void
    onRowContextMenu?: (record: T, e: React.MouseEvent) => void
    colWidth?: number
    pagination?: PaginationProps
    onChange?: (page: number, limit: number, sorter: SortProps, filters: any, extra?: any) => void // 查询条件变化
    loading?: boolean
    scrollToBottom?: number // 默认300
    isReset?: boolean
    isShowTotal?: boolean
}

export interface SortProps {
    order: "none" | "asc" | "desc"
    orderBy: string
}

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
    filterRender?: (d: any) => ReactNode
    filterKey?: string
    filtersType?: "select" | "input"
    filtersSelectAll?: FiltersSelectAllProps //是否显示所有
    filters?: FiltersItemProps[] // 	表头的筛选菜单项c
    filterSearch?: boolean // 筛选菜单项是否可搜索
    filterSearchInputProps?: FilterSearchInputProps // input的props属性
    filterMultipleProps?: FilterSearchMultipleProps // input的props属性
    filterMultiple?: boolean // 是否多选 filtersType 为select才有效
    onFilter?: () => void // 本地模式下，确定筛选的运行函数
    filterIcon?: ReactNode // 自定义 filter 图标
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

export interface scrollProps {
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
    onClose:()=>void
}
