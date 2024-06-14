import {Paging} from "@/utils/yakQueryHTTPFlow"
import {Risk} from "../schema"
import {QueryGeneralResponse} from "@/pages/invoker/schema"

export interface YakitRiskTableProps {}

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
}

export type QueryRisksResponse = QueryGeneralResponse<Risk>

export interface YakitRiskDetailsProps{
    info: Risk
    isShowTime?: boolean
    shrink?: boolean
    quotedRequest?: string
    quotedResponse?: string
    onClose?: () => void
}

export interface YakitRiskSelectTagProps{
    info: Risk
    onClose?: () => void
    onSave:(info: Risk)=>void
}