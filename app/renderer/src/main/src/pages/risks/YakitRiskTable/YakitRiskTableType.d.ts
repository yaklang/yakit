import {Paging} from "@/utils/yakQueryHTTPFlow"
import {Risk} from "../schema"
import {QueryGeneralResponse} from "@/pages/invoker/schema"

export interface YakitRiskTableProps {
    setExportHtmlLoading: (b: boolean) => void
    /**是否开启高级查询 */
    advancedQuery: boolean
    setAdvancedQuery: (b: boolean) => void
    query: QueryRisksRequest
    setQuery: (v: QueryRisksRequest) => void
}

export interface QueryRisksRequest {
    Pagination: Paging
    Search: string
    Network: string
    Ports: string
    RiskType: string
    Token: string
    WaitingVerified: boolean
    Severity: string
    FromId: number
    UntilId: number
    Tags: string
    /** 全部'' 已读:'true'，未读：'false' */
    IsRead: string
    Title: string

    /**前端展示使用 列表 */
    RiskTypeList?: string[]
    /**前端展示使用 */
    SeverityList?: string[]
    /**前端展示使用 */
    TagList?: string[]
    /**IP段 */
    IPList?: string[]
}

export type QueryRisksResponse = QueryGeneralResponse<Risk>

export interface YakitRiskDetailsProps {
    info: Risk
    isShowTime?: boolean
    shrink?: boolean
    quotedRequest?: string
    quotedResponse?: string
    onClose?: () => void
}

export interface YakitRiskSelectTagProps {
    info: Risk
    onClose?: () => void
    onSave: (info: Risk) => void
}
