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
    render?: (text, record, index) => ReactNode
}

export interface RowSelectionProps<T> {
    type?: "checkbox" | "radio" //默认 checkbox
    hideSelectAll?: boolean
    selectedRowKeys?: string[]
    onChange?: (c: boolean, selectedRowsKey: string, selectedRows?: T) => void
    onSelect?: (changeRows: T, selectedRowsKey: string) => void
    onSelectAll?: (selectedRows: string[], selected: T[]) => void
}
