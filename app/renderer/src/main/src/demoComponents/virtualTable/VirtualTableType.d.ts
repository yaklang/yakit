import {ReactNode} from "react"

export interface ColumnProps<T> {
    /** 展示字段名 */
    key: string
    /** 表头标题(不填默认展示key值) */
    headerTitle?: ReactNode
    /** 展示内容(不填默认展示数据对应key的value) */
    colRender?: (info: T) => ReactNode
    width?: number
}

export interface VirtualTableProps<T> {
    /** 是否隐藏表格头 */
    isHideHeader?: boolean
    /** 是否触顶时自动加载更多(默认触底自动加载更多) */
    isTopLoadMore?: boolean
    /** 是否停止自动加载 */
    isStop?: boolean
    /** 触发数据清空 */
    triggerClear?: boolean
    /** 自动加载更多延迟(默认1000ms) */
    wait?: number
    /** 每行数据的唯一键 */
    rowKey: string
    loadMore: (fromInfo?: T) => Promise<{data: T[]}>
    columns: ColumnProps<T>[]
}
n
