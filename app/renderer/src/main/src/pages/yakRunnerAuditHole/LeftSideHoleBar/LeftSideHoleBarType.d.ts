
export interface LeftSideHoleBarProps {
    isUnShow: boolean
    active: LeftSideType
    setActive: (v: LeftSideType) => void
    yakitTab: YakitTabsProps[]
    setYakitTab: (v: YakitTabsProps[]) => void
    statisticNode: React.ReactNode
    documentCollectDom: React.ReactNode
}

export type LeftSideHoleType = "statistic" | "document-collect"