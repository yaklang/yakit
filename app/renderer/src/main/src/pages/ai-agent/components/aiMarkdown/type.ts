import {AIStreamOutput} from "@/pages/ai-re-act/hooks/aiRender"
import {ModalInfoProps} from "../ModelInfo"

export interface AIMarkdownProps {
    content: string
    nodeLabel: string
    className?: string
    modalInfo: ModalInfoProps
}
