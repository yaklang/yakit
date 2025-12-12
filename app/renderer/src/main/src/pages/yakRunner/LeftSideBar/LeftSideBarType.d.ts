export interface LeftSideBarProps {
    addFileTab: () => void
    isUnShow: boolean
    active: LeftSideType
    setActive: (v: LeftSideType) => void
    yakitTab: YakitTabsProps[]
    setYakitTab: (v: YakitTabsProps[]) => void
}

export type LeftSideType = "file-tree" | "help-doc"
