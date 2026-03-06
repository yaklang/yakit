import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import type {AIChatQSData, ReActChatRenderItem} from "@/pages/ai-re-act/hooks/aiRender"
import {FC, memo, ReactNode, useRef, useMemo} from "react"

type StaticChatContentProps = ReActChatRenderItem & {
    render?: (contentItem: AIChatQSData) => ReactNode
    session: string
}

const StaticChatContent: FC<StaticChatContentProps> = ({chatType, token, render, session, renderNum}) => {
    const {fetchChatDataStore} = useChatIPCDispatcher().chatIPCEvents

    const chatItem = useMemo(() => {
        const raw = fetchChatDataStore()?.getContentMap({session, chatType, mapKey: token})
        if (!raw) return null
        if (raw.data != null && typeof raw.data === "object") {
            return {...raw, data: Object.assign({}, raw.data)} as AIChatQSData
        }
        return {...raw} as AIChatQSData
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [renderNum, session, chatType, token])

    if (!chatItem) return null
    return <>{render?.(chatItem)}</>
}
export default memo(StaticChatContent)
