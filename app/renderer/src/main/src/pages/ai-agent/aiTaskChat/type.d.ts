import {ForwardedRef} from "react"
import {AIChatInfo, AIStartParams} from "../type/aiChat"

export interface AITaskChatRef {
    /** 开始启动 triage 数据流 */
    onStart: (req: AIStartParams) => void
    /** 设置展示的 task 对话数据 */
    onShowTask: (data: AIChatInfo) => void
}

export interface AITaskChatProps {
    ref?: ForwardedRef<AITaskChatRef>
    onBack: () => void
}
