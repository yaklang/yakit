import type {AIChatQSData, ReActChatElement} from "@/pages/ai-re-act/hooks/aiRender"
import useAIChatUIData from "@/pages/ai-re-act/hooks/useAIChatUIData"
import type {FC, ReactNode} from "react"

interface StaticChatContentProps extends ReActChatElement {
    children?: (contentItem: AIChatQSData) => ReactNode
}

const StaticChatContent: FC<StaticChatContentProps> = ({chatType, token, children}) => {
    const {getChatContentMap} = useAIChatUIData()

    const chatItem = getChatContentMap?.(chatType, token)
    if (!chatItem) return null
    return <>{children?.(chatItem)}</>
}
export default StaticChatContent
