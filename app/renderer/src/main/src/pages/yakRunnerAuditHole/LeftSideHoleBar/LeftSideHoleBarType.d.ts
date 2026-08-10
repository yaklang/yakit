export interface LeftSideHoleBarProps {
  isUnShow: boolean
  setIsUnShow: (v: boolean) => void
  active: LeftSideHoleType
  setActive: (v: LeftSideHoleType) => void
  statisticNode: React.ReactNode
  documentCollectDom: React.ReactNode
}

export type LeftSideHoleType = 'statistic' | 'document-collect'
