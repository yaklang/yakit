import {AIOutputEvent} from "@/pages/ai-re-act/hooks/grpcApi"
import {ModalInfoProps} from "../ModelInfo"
import {ReactNode} from "react"

export interface AIYaklangCodeProps {
    content: string
    nodeLabel: string
    modalInfo: ModalInfoProps
    contentType: AIOutputEvent["ContentType"]
    referenceNode?: ReactNode
}
