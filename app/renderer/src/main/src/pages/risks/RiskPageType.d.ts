import {QueryRisksRequest} from "./YakitRiskTable/YakitRiskTableType"
import {FieldGroup} from "./YakitRiskTable/utils"

export interface RiskPageProp {}
export interface RiskQueryProps {
    /**是否开启高级查询 */
    advancedQuery: boolean
    setAdvancedQuery: (b: boolean) => void
    query: QueryRisksRequest
    setQuery: (v: QueryRisksRequest) => void
}

export interface IPListProps {
    list: FieldGroup[]
    selectList: string[]
    onSelect: (v: FieldGroup) => void
    onReset: () => void
}
export interface IPListItemProps {
    item: FieldGroup
    isSelect: boolean
    onSelect: (v: FieldGroup) => void
}
export interface VulnerabilityLevelProps {
    data: FieldGroup[]
    onSelect: (v: string[]) => void
}
export interface VulnerabilityTypeProps {
    data: FieldGroup[]
    onSelect: (v: string[]) => void
}
