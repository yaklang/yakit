import {ModalInfoProps} from "../ModelInfo"
import {ReactNode} from "react"

export interface AIMarkdownProps {
    content: string
    nodeLabel: string
    className?: string
    modalInfo: ModalInfoProps
    referenceNode: ReactNode
}
