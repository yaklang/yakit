import React from "react"
import {Paging} from "@/utils/yakQueryHTTPFlow"
export interface useVirtualTableHookParams<T, DataT> {
    // 表格容器ref
    tableBoxRef: React.MutableRefObject<any>
    // 表格ref
    tableRef: React.MutableRefObject<any>
    // 表格容器ref
    boxHeightRef: React.MutableRefObject<any>
    // 请求接口
    grpcFun: (params: ParamsTProps) => Promise<DataResponseProps<DataT>>
    // 默认请求参数
    defaultParams?: T
    // 第一次请求的回调
    onFirst?: () => void
    // 暂无新数据请求停止的回调
    onStop?: () => void
    // 响应数据的预处理方法（用于对响应数据的二次处理）
    initResDataFun?: (arr: DataT[]) => DataT[]
}

export type VirtualPaging = {
    Page: number
    Limit: number
    Order?: "asc" | "desc" | string
    OrderBy?: "created_at" | "updated_at" | string
    AfterId?: number
    BeforeId?: number
}

export interface FilterProps {
    [key: string]: any
}

// 定义一个接口，包含 Pagination 属性
export interface ParamsTProps {
    // 确保 ParamsType 包含 Pagination
    Pagination: VirtualPaging
    Filter: FilterProps
}

export interface DataResponseProps<T> {
    Total: number
    Pagination: VirtualPaging
    Data: T[]
}

export interface DataTProps {
    Id: number
    [key: string]: any
}
