
export interface LeftSideHoleBarProps {
    isUnShow: boolean
    setUnShow: (v: boolean) => void
    active: LeftSideType
    setActive: (v: LeftSideType) => void
    statisticNode: React.ReactNode
    documentCollectDom: React.ReactNode
}

export type LeftSideHoleType = "statistic" | "document-collect" | undefined