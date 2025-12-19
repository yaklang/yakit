export interface LeftSideBarProps {
    addFileTab: () => void
    isUnShow: boolean
    setIsUnShow: (v: boolean) => void
    active: LeftSideType
    setActive: (v: LeftSideType) => void
}

export type LeftSideType = "file-tree" | "help-doc"
