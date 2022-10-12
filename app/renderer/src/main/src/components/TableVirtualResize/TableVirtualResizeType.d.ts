import {ReactNode} from "react"

// 包裹虚拟表格的父元素需要设置高度
export interface TableVirtualResizeProps<T> {
    title?: string | ReactNode
    extra?: ReactNode
    data: T[] //可以传cellClassName用来控制单元格样式，不要传height
    renderKey: string
    renderRow?: (data: T, i: number) => ReactNode
    columns: ColumnsTypeProps[]
    rowSelection?: RowSelectionProps<T>
    colWidth?: number
    enableDrag?: boolean
    onRowClick?: (record: T) => void
    onRowContextMenu?: (record: T, e: React.MouseEvent) => void
    colWidth?: number
    pagination?: PaginationProps
    onChange?: (page?: number, limit?: number, filters?: SortProps, sorter?: any, extra?: any) => void // 查询条件变化
    loading?: boolean
    scrollToBottom?: number // 默认300
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
    sorter?: string | boolean // boolean是否开启排序，string自定义
    order?: string // none 无状态； asc 升序  desc 降序
}

export interface RowSelectionProps<T> {
    isAll?: boolean
    type?: "checkbox" | "radio" //默认 checkbox
    hideSelectAll?: boolean
    selectedRowKeys?: string[]
    onChangeCheckboxSingle?: (c: boolean, selectedRowsKey: string, selectedRows?: T) => void
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

export interface scrollProps{
    scrollLeft:number
    scrollRight:number
    scrollBottom:number
}
