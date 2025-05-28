import {AuditNodeProps, YakURLKVPair} from "../AuditCode/AuditCodeType"
import {CodeRangeProps} from "../RightAuditDetail/RightAuditDetail"

export interface GlobalFilterFunctionProps {
    projectName?: string
}
export interface FilterFunctionProps {
    id: string
    name: string
}

export interface GlobalFilterFunctionChildrenItemProps {
    info: AuditNodeProps
}

export interface GlobalFilterFunctionChildrenProps {
    record: FilterFunctionProps
    projectName?: string
}
