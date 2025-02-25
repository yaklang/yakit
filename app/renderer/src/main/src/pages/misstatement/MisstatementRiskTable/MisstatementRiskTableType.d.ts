import {API} from "@/services/swagger/resposeType"

export interface MisstatementRiskTableProps {
    ref?: React.ForwardedRef<MisstatementRiskTableRefProps>
    query: RiskFeedBackRequest
    setQuery: (v: RiskFeedBackRequest) => void
    pageParams: RiskFeedBackPage
    setPageParams: (v: RiskFeedBackPage) => void
    riskWrapperClassName?: string
    excludeColumnsKey?: string[]
}

export interface MisstatementRiskTableRefProps {
    update: (page: number) => void
    tableResponse: API.RiskUploadResponse
}

export interface RiskFeedBackPage {
    page: number
    limit: number
    order_by: string
    order: string
}
export interface RiskFeedBackRequest extends API.GetRiskWhere {
    riskTypeList?: string[] // 用于前端类型筛选
    severityList?: string[] // 用于前端等级筛选
    tagList?: string[] // 用于前端等级筛选
}

export interface MisstatementRiskDetailsProps {
    className?: string
    info: API.RiskLists
    onClickIP?: (info: API.RiskLists) => void
    border?: boolean
}
