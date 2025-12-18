
export interface LeftSideHoleBarProps {
    isUnShow: boolean
    setIsUnShow: (v: show) => void
    active: LeftSideType
    setActive: (v: LeftSideType) => void
    statisticNode: React.ReactNode
    documentCollectDom: React.ReactNode
}

export type LeftSideHoleType = "statistic" | "document-collect"