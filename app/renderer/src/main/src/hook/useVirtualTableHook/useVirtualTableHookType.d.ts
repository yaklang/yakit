import React from "react"
import {Paging} from "@/utils/yakQueryHTTPFlow"
import {APIFunc} from "@/apiUtils/type"
export type useVirtualTableHookParams<T, DataT, DataKey> = {
    // 表格容器ref
    tableBoxRef: React.MutableRefObject<any>
    // 表格ref
    tableRef: React.MutableRefObject<any>
    // 表格容器ref
    boxHeightRef: React.MutableRefObject<any>
    // 请求接口
    grpcFun: APIFunc<ParamsTProps, DataResponseProps<DataT, DataKey>>
    // 默认请求参数
    defaultParams?: T
    // 第一次请求的回调
    onFirst?: () => void
    // 暂无新数据请求停止的回调
    onStop?: () => void
    // 响应数据的预处理方法（用于对响应数据的二次处理）
    initResDataFun?: (arr: DataT[]) => DataT[]
    responseKey?: {
        data: string
        id: string
    }
}

export type VirtualPaging = {
    Page: number
    Limit: number
    Order: "asc" | "desc" | string
    OrderBy: "created_at" | "updated_at" | string
    AfterId?: number
    BeforeId?: number
    // 特定需求场景下 加载时Limit固定，不需要根据页面计算
    FixedLimit?: number
}

export interface FilterProps {
    [key: string]: any
}

// 定义一个接口，包含 Pagination 属性
export interface ParamsTProps {
    // 确保 ParamsType 包含 Pagination
    Pagination: VirtualPaging
    Filter: FilterProps
    // 是否在接口请求前控制轮询
    startLoop?: boolean
    // 是否在接口请求结束后控制轮询
    endLoop?: boolean
}

export type DataResponseProps<T, K extends string = "Data"> = {
    [key in K]: T[]
} & {
    Pagination: PaginationSchema
    Total: number
}

export type DataTProps<IDKey extends string = "Id"> = {
    [key in IDKey]?: number
} & {
    [key: string]: any
}
