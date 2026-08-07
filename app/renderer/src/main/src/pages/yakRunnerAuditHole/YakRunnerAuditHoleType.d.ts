import { type SSARisksFilter } from './YakitAuditHoleTable/YakitAuditHoleTableType'
import type { FieldGroup } from '@/pages/risks/YakitRiskTable/utils'
import type { FieldName } from '@/pages/risks/RiskTable'
export interface YakRunnerAuditHoleProps {}

export interface HoleQueryProps {
  inViewport: boolean
  onOperateSide: (b: boolean) => void
  query: SSARisksFilter
  setQuery: (v: SSARisksFilter) => void
}

export interface ProgramListProps {
  list: FieldGroup[]
  selectList: string[]
  onSelect: (v: FieldGroup) => void
  onReset: () => void
}

export interface ProgramListItemProps {
  item: FieldGroup
  isSelect: boolean
  onSelect: (v: FieldGroup) => void
}

export interface VulnerabilityLevelProps {
  selectList: string[]
  data: FieldName[]
  onSelect: (v: string[]) => void
}

export interface VulnerabilityTypeProps {
  selectList: string[]
  data: FieldName[]
  onSelect: (v: string[]) => void
}
