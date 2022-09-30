import {ReactNode} from "react"

export interface TableVirtualResizeProps<T> {
    data: T[]
    renderKey: string
    renderRow?: (data: T, i: number) => ReactNode
    columns: ColumnsTypeProps[]
    rowSelection?: RowSelectionProps<T>
    colWidth?: number
    enableDrag?: boolean
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
}

export interface RowSelectionProps<T> {
    type?: "checkbox" | "radio" //默认 checkbox
    hideSelectAll?: boolean
    selectedRowKeys?: string[]
    onChangeCheckboxSingle?: (c: boolean, selectedRowsKey: string, selectedRows?: T) => void
    onSelectAll?: (selectedRows: string[], selected: T[]) => void
}
