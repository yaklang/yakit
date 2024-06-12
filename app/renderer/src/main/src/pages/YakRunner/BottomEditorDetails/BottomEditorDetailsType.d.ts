import { Selection } from "../RunnerTabs/RunnerTabsType";
export interface BottomEditorDetailsProps {
    showItem?: ShowItemType
    setShowItem:(v:ShowItemType)=>void
    setEditorDetails:(v:boolean)=>void
}

export type ShowItemType =  "output" | "syntaxCheck" | "terminal" | "helpInfo"

export interface JumpToEditorProps {
    selections: Selection
    id: string
}

export interface OutputInfoListProps {
    outputCahceRef:React.MutableRefObject<string>
    xtermRef: React.MutableRefObject<any>
}