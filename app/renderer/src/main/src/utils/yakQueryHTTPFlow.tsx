/*
 * @Author: TangHang123 1425735414@qq.com
 * @Date: 2022-11-04 10:44:32
 * @LastEditors: TangHang123 1425735414@qq.com
 * @LastEditTime: 2022-11-07 10:46:05
 * @FilePath: \yakit\app\renderer\src\main\src\utils\yakQueryHTTPFlow.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
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
    Keyword?: string
    OnlyWebsocket?: boolean
    ExcludeInUrl?: string[]
    ExcludeId?: number[]
    Tags?: string[]
    HaveParamsTotal?: string
    BeforeUpdatedAt?: number
    AfterUpdatedAt?: number
    AfterBodyLength?: number
    BeforeBodyLength?: number
    Color?:string[]
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
