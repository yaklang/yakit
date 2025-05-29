import {ReactNode} from "react"
import {AuditNodeProps, AuditTreeNodeProps, AuditTreeProps, YakURLKVPair} from "../AuditCode/AuditCodeType"
import {CodeRangeProps} from "../RightAuditDetail/RightAuditDetail"

export interface GlobalFilterFunctionProps {
    projectName?: string
}

export interface GlobalFilterFunctionTreeProps {
    data: AuditNodeProps[]
    /**选中事件 */
    onSelect: (node: AuditNodeProps) => void
    /**加载二级数据 */
    onLoadData: (node: AuditNodeProps) => Promise<any>
    /**二级数据加载更多 */
    loadTreeMore: (info: AuditNodeProps) => void
}
export interface GlobalFilterFunctionTreeNodeProps extends AuditTreeNodeProps {}
