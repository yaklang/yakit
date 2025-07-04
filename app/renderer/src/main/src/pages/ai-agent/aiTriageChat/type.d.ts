import {Dispatch, ForwardedRef} from "react"

export interface AITriageChatRef {
    /** 开始启动 triage 数据流 */
    onStart: (qs: string) => void
    /** 获取本次 triage 数据流的所有对话信息 */
    fetchData: () => any
}

export interface AITriageChatProps {
    ref?: ForwardedRef<AITriageChatRef>
}

export interface AITriageChatData {
    /** 唯一标识 */
    id: string
    /** 对话名称 */
    name: string
    /** 对话问题 */
    question: string
    /** 时间 */
    time: number
    /** 对话 */
    chats: {type: "question" | "answer" | "forges"; content: string}[]
}
