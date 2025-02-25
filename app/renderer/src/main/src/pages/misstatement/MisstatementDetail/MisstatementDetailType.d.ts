import {API} from "@/services/swagger/resposeType"

export interface MisstatementDetailsProps<T> {
    className?: string
    info: T
    onClickIP?: (info: T) => void
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
