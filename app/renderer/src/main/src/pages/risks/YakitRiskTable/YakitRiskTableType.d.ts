import {Paging} from "@/utils/yakQueryHTTPFlow"
import {Risk} from "../schema"
import {QueryGeneralResponse} from "@/pages/invoker/schema"
import {ReactNode} from "react"
import {TableVirtualResizeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import { CodeRangeProps } from "@/pages/yakRunnerAuditCode/RightAuditDetail/RightAuditDetail";
export interface YakitRiskTableProps {
    setRiskLoading: (b: boolean) => void
    /**是否开启高级查询 */
    advancedQuery?: boolean
    setAdvancedQuery?: (b: boolean) => void
    query: QueryRisksRequest
    setQuery: (v: QueryRisksRequest) => void
    renderTitle?: ReactNode
    riskWrapperClassName?: string
    tableVirtualResizeProps?: TableVirtualResizeProps
    yakitRiskDetailsBorder?: boolean
    excludeColumnsKey?: string[]
    /**该字段会影响初次请求数据，建议外界只使用，不设值 */
    allTotal?: number
    setAllTotal?: (b: number) => void
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
    BeforeCreatedAt?: number
    AfterCreatedAt?: number
    /** 全部'' 已读:'true'，未读：'false' */
    IsRead: string
    Title: string
    Ids: number[]

    /**前端展示使用 列表 */
    RiskTypeList?: string[]
    /**前端展示使用 */
    SeverityList?: string[]
    /**前端展示使用 */
    TagList?: string[]
    /**IP段 */
    IPList?: string[]
    /**前端展示使用 */
    CreatedAt?: number[]

    RuntimeId?: string
}

export type QueryRisksResponse = QueryGeneralResponse<Risk>

export interface YakitRiskDetailsProps {
    className?: string
    info: Risk
    isShowTime?: boolean
    shrink?: ConstrainBoolean
    onClickIP?: (info: Risk) => void
    border?: boolean
    isShowExtra?: boolean
    onRetest?: (info: Risk) => void
}

export interface YakitRiskSelectTagProps {
    info: Risk
    onClose?: () => void
    onSave: (info: Risk) => void
}

export interface YakitCodeScanRiskDetailsProps {
    className?: string
    info: Risk
    onClickIP?: (info: Risk) => void
    border?: boolean
    isShowExtra?: boolean
}

export interface YakURLDataItemProps {
    index:string|number
    code_range:CodeRangeProps
    source: string
    ResourceName:string
}