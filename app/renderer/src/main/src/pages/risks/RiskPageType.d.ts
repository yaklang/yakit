export interface RiskPageProp {}
export interface RiskQueryProps {
    /**是否开启高级查询 */
    advancedQuery: boolean
    setAdvancedQuery: (b: boolean) => void
}

export interface IPListProps {}
export interface IPListItemProps {
    item: IPItemProps
    onSelect: (v: IPItemProps) => void
}
export interface IPItemProps {
    value: number
    label: string
}
export interface VulnerabilityLevelProps {}
export interface VulnerabilityTypeProps {}
