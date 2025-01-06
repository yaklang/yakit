import { Selection } from "../RunnerTabs/RunnerTabsType";
export interface BottomEditorDetailsProps {
    showItem?: ShowItemType
    setShowItem:(v:ShowItemType)=>void
    isShowEditorDetails: boolean
    setEditorDetails:(v:boolean)=>void
}

export type ShowItemType =  "output" | "syntaxCheck" | "terminal" | "helpInfo"

export interface JumpToEditorProps {
    isSelect?: boolean
    selections: Selection
    path: string
}

export interface OutputInfoProps {
    outputCahceRef:React.MutableRefObject<string>
    xtermRef: React.MutableRefObject<any>
}