import {AIOutputEvent} from "@/pages/ai-re-act/hooks/grpcApi"
import {ModalInfoProps} from "../ModelInfo"

export interface AIYaklangCodeProps {
    content: string
    nodeLabel: string
    modalInfo: ModalInfoProps
    contentType: AIOutputEvent["ContentType"]
}
