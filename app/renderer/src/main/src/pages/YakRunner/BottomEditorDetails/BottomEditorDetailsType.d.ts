export interface BottomEditorDetailsProps {
    showItem?: ShowItemType
    setShowItem:(v:ShowItemType)=>void
    onClose:()=>void
}

export type ShowItemType =  "output" | "syntaxCheck" | "terminal" | "helpInfo"