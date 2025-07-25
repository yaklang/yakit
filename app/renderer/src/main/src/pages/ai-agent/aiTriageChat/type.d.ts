import {Dispatch, ForwardedRef} from "react"
import {AIForge, AIStartParams} from "../type/aiChat"

export interface AITriageChatRef {
    /** 开始启动 triage 数据流 */
    onStart: (qs: string) => void
    /** 外接触发使用 forge 模板的功能 */
    onTriggerExecForge: (id: number) => void
}

export interface AITriageChatProps {
    ref?: ForwardedRef<AITriageChatRef>
    onTaskSubmit: (request: AIStartParams) => void
    onClear: () => void
}

interface AITriageChatDataInfo {
    id: string
    type: "question" | "answer" | "forges"
    /** answer 专用, 获取答案时没有内容为true, 显示加载状态 */
    loading?: boolean
    /** forges 列表专用，用于展示本次列表属于<关键词>相关的 forge 模板 */
    forgesKeyword?: string
    content: string | AIForge[]
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
    chats: AITriageChatDataInfo[]
}

export interface AITriageChatContentsProps {
    chats: AITriageChatDataInfo[]
    activeForge?: AIForge
    onSelect?: (info: AIForge) => void
}

export interface AITriageChatContentProps {
    isAnswer?: boolean
    loading?: boolean
    content: string
}

export interface AITriageChatContentForgesProps {
    keyword: string
    forges: AIForge[]
    activeForge?: AIForge
    onSelect?: (info: AIForge) => void
}
