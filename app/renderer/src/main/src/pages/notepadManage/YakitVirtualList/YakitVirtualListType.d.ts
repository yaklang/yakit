import {ReactNode} from "react"
import {FiltersItemProps, RowSelectionProps} from "../../../components/TableVirtualResize/TableVirtualResizeType"
import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {YakitPopoverProp} from "@/components/yakitUI/YakitPopover/YakitPopover"

export interface YakitVirtualListProps<T> {
    columns: VirtualListColumns[]
    data: T[]
    className?: string
    hasMore?: boolean
    loading?: boolean
    /**刷新列表 */
    refresh?: boolean
    renderKey?: string
    rowSelection?: RowSelectionProps<T>
}

export interface VirtualListColumns {
    title: ReactNode
    dataIndex: string
    width?: number
    render?: (text, record, index) => ReactNode
    filterProps?: VirtualListFilterProps
    /** 表头Columns单个数据样式 */
    columnsClassName?: string
}

interface VirtualListFilterProps {
    filterRender?: () => ReactNode
    filterKey?: string
    /**表头的筛选菜单项 */
    filters?: FiltersItemProps[]
}

export interface ListSelectFilterPopoverProps {
    option: ListSelectOptionProps[]
    children?: ReactNode
    selectKeys: string[]
    onSetValue: (s: string[]) => void
    placement?: YakitPopoverProp["placement"]
    filterOption?: ((inputValue: string, optionItem: ListSelectOptionProps) => boolean) | boolean
}

export interface ListSelectOptionProps {
    value: string
    label: ReactNode
    heardImgSrc?: string
}
