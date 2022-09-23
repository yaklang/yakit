import {ReactNode} from "react"

export interface TableVirtualResizeProps<T> {
    data: T[]
    renderRow?: (data: T, i: number) => ReactNode
    columns: ColumnsTypeProps[]
    rowSelection?: RowSelectionProps<T>
}

export interface ColumnsTypeProps {
    title: string
    dataKey: string
    className?: string
    width?: number | string
    ellipsis?:boolean
    render?: (text, record, index) => ReactNode
}

export interface RowSelectionProps<T> {
    type?: "checkbox" | "radio"
    hideSelectAll?: boolean
    selectedRowKeys?: number[] | string[]
    onChange?: (selectedRowsKey: number[] | string[], selectedRows: T[]) => void
    onSelect?: (changeRows: T, selectedRowsKey: number | string) => void
    onSelectAll?: (selected: T[], selectedRows: number[] | string[], changeRows: T) => void
}
