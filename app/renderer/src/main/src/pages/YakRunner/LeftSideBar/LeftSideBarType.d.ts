export interface LeftSideBarProps {
    addFileTab: () => void
    isUnShow: boolean
    setUnShow: (v:boolean) => void
}

export type LeftSideType = "file-tree" | "help-doc" | "audit-code" | undefined
