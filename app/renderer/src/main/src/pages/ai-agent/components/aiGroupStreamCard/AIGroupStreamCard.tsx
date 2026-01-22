import {ReActChatElement} from "@/pages/ai-re-act/hooks/aiRender"
import {type FC} from "react"
import {useStreamingChatContent} from "../aiChatListItem/StreamingChatContent/hooks/useStreamingChatContent"
import styles from "./AIGroupStreamCard.module.scss"
import {useMemoizedFn} from "ahooks"

const AIStreamNode: FC<{
    chatType: ReActChatElement["chatType"]
    token: string
}> = ({chatType, token}) => {
    const renderData = useStreamingChatContent({chatType, token})
    if (!renderData) return null
    return <div>456</div>
}

const AIGroupStreamCard: FC<{
    elements: ReActChatElement[]
}> = ({elements}) => {
    console.log("elements:", elements)
    // 获取最后一条
    const lastElement = elements[elements.length - 1]
    const renderData = useStreamingChatContent({chatType: lastElement.chatType, token: lastElement.token})
    if (!renderData) return null
    return (
        <div className={styles.container}>
            <div className={styles.title}>{renderData.data.content}</div>
            <div className={styles.content}>
                {elements.map((el, idx) => (
                    <AIStreamNode key={idx} chatType={el.chatType} token={el.token} />
                ))}
            </div>
        </div>
    )
}
export default AIGroupStreamCard
