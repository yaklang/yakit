export interface LeftSideBarProps {
    fileTreeLoad: boolean
    onOpenEditorDetails: (v: ShowItemType) => void

    isUnShow: boolean
    setUnShow: (v: boolean) => void
    active: LeftSideType
    setActive: (v: LeftSideType) => void
}

export type LeftSideType = "audit" | "search" | undefined