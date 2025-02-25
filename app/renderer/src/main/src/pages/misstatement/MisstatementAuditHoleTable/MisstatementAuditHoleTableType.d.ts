import {API} from "@/services/swagger/resposeType"

export interface MisstatementAuditHoleTableProps {
    ref?: React.ForwardedRef<MisstatementAuditHoleTableRefProps>
    query: API.SSARiskWhereRequest
    setQuery: (v: API.SSARiskWhereRequest) => void
    riskWrapperClassName?: string
    excludeColumnsKey?: string[]
}

export interface MisstatementAuditHoleTableRefProps {
    update: (page: number) => void
    tableResponse: API.SSARiskResponse
}

export interface MisstatementAuditRiskDetailsProps {
    className?: string
    info: API.SSARiskResponseData
    onClickIP?: (info: API.SSARiskResponseData) => void
    border?: boolean
}

export interface MisstatementAuditResultCollapseProps {
    data: YakURLDataItemProps[]
    collapseProps?: CollapseProps
}

export interface MisstatementAuditResultDescribeProps {
    info: API.SSARiskResponseData
    columnSize?: number
}
