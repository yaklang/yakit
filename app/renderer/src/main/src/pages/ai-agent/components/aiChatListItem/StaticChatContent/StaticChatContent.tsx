import type {AIChatQSData, ReActChatRenderItem} from "@/pages/ai-re-act/hooks/aiRender"
import useAIChatUIData from "@/pages/ai-re-act/hooks/useAIChatUIData"
import type {FC, ReactNode} from "react"

type StaticChatContentProps = ReActChatRenderItem & {
    render?: (contentItem: AIChatQSData) => ReactNode
}

const StaticChatContent: FC<StaticChatContentProps> = ({chatType, token, render}) => {
    const {getChatContentMap} = useAIChatUIData()

    const chatItem = getChatContentMap?.(chatType, token)
    if (!chatItem) return null
    return <>{render?.(chatItem)}</>
}
export default StaticChatContent
