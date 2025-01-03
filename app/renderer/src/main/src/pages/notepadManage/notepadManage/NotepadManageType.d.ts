import {YakitHintProps} from "@/components/yakitUI/YakitHint/YakitHintType"
import {ReactNode} from "react"

export interface NotepadManageProps {}

export interface DownNotepadModalProps {
    visible: boolean
    setVisible: (b: boolean) => void
    url: string
    path: string
    onCancelDownload: () => void
}