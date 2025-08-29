import {CSSProperties, Dispatch, ReactNode, SetStateAction} from "react"
import {AIChatInfo, AIChatMessage, AIChatReview, AIChatStreams, AIInputEvent, AIStartParams} from "../ai-agent/type/aiChat"
import {HoldGRPCStreamProps} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"

export interface AIReActProps {}

// #region 页面全局变量
// 全局配置信息
export interface AIReActSetting
    extends Omit<AIStartParams, "CoordinatorId" | "Sequence" | "McpServers" | "UserQuery"> {}

// 触发事件通信
export interface AIReActTriggerEventInfo {
    type: string
    params?: Record<string, any>
}
// #endregion

// #region UI左侧组件定义
export interface AIReActSideListProps {}
// 侧边栏 tab 类型
export type AIReActTab = "history" | "setting"

// 编辑对话名字
export interface EditChatNameModalProps {
    getContainer?: HTMLElement
    info: AIChatInfo
    visible: boolean
    onCallback: (result: boolean, info?: AIChatInfo) => viod
}
export interface AIReActEventInfo{
    type:string
}
// #endregion

// #region UI右侧组件定义
// 对话框左侧侧边栏
export interface AIChatLeftSideProps {
    expand: boolean
    setExpand: Dispatch<SetStateAction<boolean>>
    tasks: AIChatMessage.PlanTask[]
    pressure: AIChatMessage.Pressure[]
    cost: AIChatMessage.AICostMS[]
    card: AIChatMessage.AIInfoCard[]
}

export interface AICardListProps {
    list: AIChatMessage.AIInfoCard[]
}

// 对话框回答
export interface AIReActChatBodyProps extends AIReActChatStreamProps {
    info: AIChatInfo
    consumption: Record<string, AIChatMessage.Consumption>
    coordinatorId?: string
}

export interface AIReActChatStreamProps {
    scrollToTask?: AIChatMessage.PlanTask
    setScrollToTask?: Dispatch<SetStateAction<AIChatMessage.PlanTask | undefined>>
    isStopScroll?: boolean
    setIsStopScroll?: Dispatch<SetStateAction<boolean>>
    tasks: AIChatMessage.PlanTask[]
    activeStream: string[]
    streams: Record<string, AIChatStreams[]>
    defaultExpand?: boolean
}

export interface AIReActChatFooterProps {
    /** 正在执行中 */
    execute: boolean
    /** 是否在 review 步骤中 */
    review: boolean
    /** 是否能显示重新执行按钮 */
    showReExe?: boolean
    onStop: () => void
    positon: boolean
    onPositon: () => void
    onReExe: () => void
    onNewChat: () => void
}


// 对话框日志
export interface AIChatLogsProps {
    logs: AIChatMessage.Log[]
    onClose: () => void
}
// #endregion

//#region AI 展示内容的tab
export interface AITabProps extends HoldGRPCStreamProps.InfoTab {}
//#endregion
