import React from "react"

// @ts-ignore
const {ipcRenderer} = window.require("electron")

export interface YakQueryHTTPFlowRequest {
    SourceType?: string
    Pagination?: Paging
    SearchURL?: string
    StatusCode?: string
    Methods?: string
    HaveCommonParams?: boolean
    HaveBody?: boolean
    SearchContentType?: string
    ExcludeContentType?: string[]
    Keyword?: string
    OnlyWebsocket?: boolean
    IncludeInUrl?: string[]
    ExcludeInUrl?: string[]
    IncludePath?: string[]
    ExcludePath?: string[]
    IncludeSuffix?: string[]
    ExcludeSuffix?: string[]
    ExcludeId?: number[]
    Tags?: string[]
    HaveParamsTotal?: string
    BeforeUpdatedAt?: number
    AfterUpdatedAt?: number
    AfterBodyLength?: number
    BeforeBodyLength?: number
    Color?: string[]
    IsWebsocket?: string
    FromPlugin?: string
    RuntimeId?: string
}

export interface Paging {
    Page: number
    Limit: number
    Order?: "asc" | "desc" | string
    OrderBy?: "created_at" | "updated_at" | string
}

export const yakQueryHTTPFlow = (
    params: YakQueryHTTPFlowRequest,
    onOk?: (rsp: any) => any,
    onFailed?: (e: any) => any,
    onFinally?: () => any
) => {
    ipcRenderer.invoke("query-http-flows", params).then(onOk).catch(onFailed).finally(onFinally)
}
